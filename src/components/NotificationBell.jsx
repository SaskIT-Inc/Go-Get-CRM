import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useCurrentUser, can } from '@/lib/permissions';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  Target,
  Building2,
  CalendarClock,
  DollarSign,
  FileText,
  MessageSquare,
  Clock,
  X,
  Repeat,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Every real Notification.type gets an icon + color so the feed reads like a
// glance-able activity log rather than a wall of identical bullets — mirrors
// how tasks/leads/clients/etc. are already color-coded elsewhere in the app.
const TYPE_STYLES = {
  task_assigned: { Icon: ClipboardList, bg: 'bg-green-100', color: 'text-green-600' },
  task_created: { Icon: ClipboardList, bg: 'bg-green-100', color: 'text-green-600' },
  task_completed: { Icon: Check, bg: 'bg-green-100', color: 'text-green-600' },
  lead_created: { Icon: Target, bg: 'bg-purple-100', color: 'text-purple-600' },
  client_onboarded: { Icon: Building2, bg: 'bg-blue-100', color: 'text-blue-600' },
  appointment_booked: { Icon: CalendarClock, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  invoice_auto_generated: { Icon: DollarSign, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  document_activity: { Icon: FileText, bg: 'bg-amber-100', color: 'text-amber-600' },
  client_message: { Icon: MessageSquare, bg: 'bg-pink-100', color: 'text-pink-600' },
  recurring_email_sent: { Icon: Repeat, bg: 'bg-teal-100', color: 'text-teal-600' },
};
const DEFAULT_TYPE_STYLE = { Icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };
const REMINDER_STYLE = { Icon: Bell, bg: 'bg-blue-100', color: 'text-blue-600' };

const TERMINAL_LEAD_STAGES = ['Closed Leads', 'Lost Leads', 'False Leads'];

const TABS = [
  { key: 'all', label: 'View All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reminders', label: 'Reminders' },
];

// "sarah.miller@saskits.ca" -> "Sarah Miller" — a display-name fallback with
// zero extra requests (fetching the full Users list here would 403 for any
// non-admin role, since this component mounts for every logged-in user).
function actorDisplayName(email) {
  if (!email) return 'Someone';
  const local = email.split('@')[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function formatRelativeShort(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function formatDueLabel(dateStr) {
  const due = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((due - startOfToday) / 86400000);
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays}d`;
}

// Every stored Notification.body is server-written as "{actor_email} <rest
// of sentence>" (see backend/app/notify.py) — split that off so the actor
// can render bold, like a real activity feed, instead of one flat sentence.
function splitActorFromBody(body, actorEmail) {
  if (actorEmail && body?.startsWith(actorEmail)) {
    return { actorLabel: actorDisplayName(actorEmail), rest: body.slice(actorEmail.length) };
  }
  return { actorLabel: null, rest: body || '' };
}

// Reminders are computed live from Task/Lead data, not stored rows, so they
// have no server-side is_read state to flip. "Dismissed" is tracked locally
// per user instead, keyed by id + due-date — if the same task/lead becomes
// overdue again on a DIFFERENT date later, that's a fresh key and it
// resurfaces rather than staying hidden forever.
function dismissedStorageKey(email) {
  return `notif_dismissed_reminders_${email || 'anon'}`;
}

function loadDismissedReminders(email) {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(email));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const { data: user } = useCurrentUser();
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState(() => new Set());

  useEffect(() => {
    if (user?.email) setDismissedReminderKeys(loadDismissedReminders(user.email));
  }, [user?.email]);

  const persistDismissed = (nextSet) => {
    setDismissedReminderKeys(nextSet);
    if (user?.email) {
      try {
        localStorage.setItem(dismissedStorageKey(user.email), JSON.stringify([...nextSet]));
      } catch {
        // best-effort only — a full/blocked localStorage just means dismissals don't persist across reloads
      }
    }
  };

  const dismissReminder = (key) => {
    persistDismissed(new Set([...dismissedReminderKeys, key]));
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.entities.Notification.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const canSeeTaskReminders = can(user, 'tasks');
  const canSeeLeadReminders = can(user, 'leads');

  const { data: myTasks = [] } = useQuery({
    queryKey: ['notificationTasks', user?.email],
    queryFn: () => api.entities.Task.filter({ assigned_to: user.email }),
    enabled: !!user?.email && canSeeTaskReminders,
    refetchInterval: 60000,
  });

  const { data: myLeads = [] } = useQuery({
    queryKey: ['notificationLeads', user?.email],
    queryFn: () => api.entities.Lead.filter({ assigned_to: user.email }),
    enabled: !!user?.email && canSeeLeadReminders,
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old) =>
        (old || []).map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
      toast.error('Failed to mark as read: ' + error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old) => (old || []).map((n) => ({ ...n, is_read: true })));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
      toast.error('Failed to mark all as read: ' + error.message);
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Live, computed "due now" items — not stored Notification rows, so they
  // have no is_read state and simply disappear once the task is completed or
  // the lead's follow-up date moves (no cron/scheduler needed).
  const reminders = useMemo(() => {
    const taskReminders = myTasks
      .filter((t) => t.due_date && t.status !== 'Completed' && new Date(t.due_date) <= new Date())
      .map((t) => ({
        id: `task-reminder-${t.id}`,
        dismissKey: `task-reminder-${t.id}:${t.due_date}`,
        kind: 'reminder',
        ...REMINDER_STYLE,
        actorLabel: null,
        rest: `Task due — "${t.title}"`,
        timeLabel: formatDueLabel(t.due_date),
        linkUrl: '/Tasks',
        sortKey: t.due_date,
      }));
    const leadReminders = myLeads
      .filter(
        (l) =>
          l.next_follow_up &&
          !TERMINAL_LEAD_STAGES.includes(l.stage) &&
          new Date(l.next_follow_up) <= new Date()
      )
      .map((l) => ({
        id: `lead-reminder-${l.id}`,
        dismissKey: `lead-reminder-${l.id}:${l.next_follow_up}`,
        kind: 'reminder',
        ...REMINDER_STYLE,
        actorLabel: null,
        rest: `Follow up with "${l.contact_name}"${l.company_name ? ` (${l.company_name})` : ''}`,
        timeLabel: formatDueLabel(l.next_follow_up),
        linkUrl: '/LeadPipeline',
        sortKey: l.next_follow_up,
      }));
    return [...taskReminders, ...leadReminders].sort((a, b) => new Date(a.sortKey) - new Date(b.sortKey));
  }, [myTasks, myLeads]);

  const visibleReminders = useMemo(
    () => reminders.filter((r) => !dismissedReminderKeys.has(r.dismissKey)),
    [reminders, dismissedReminderKeys]
  );

  const notificationItems = useMemo(
    () =>
      notifications.map((n) => {
        const style = TYPE_STYLES[n.type] || DEFAULT_TYPE_STYLE;
        const { actorLabel, rest } = splitActorFromBody(n.body, n.actor_email);
        return {
          id: n.id,
          kind: 'notification',
          type: n.type,
          Icon: style.Icon,
          bg: style.bg,
          color: style.color,
          actorLabel,
          rest,
          isRead: n.is_read,
          timeLabel: formatRelativeShort(n.created_date),
          linkUrl: n.link_url,
          sortKey: n.created_date,
        };
      }),
    [notifications]
  );

  const unreadNotifCount = notificationItems.filter((n) => !n.isRead).length;
  const badgeCount = unreadNotifCount + visibleReminders.length;
  const hasAnyUnread = unreadNotifCount > 0 || visibleReminders.length > 0;

  const taskNotifItems = notificationItems.filter((n) => n.type?.startsWith('task'));

  const listForTab = (() => {
    if (activeTab === 'tasks') return { unread: taskNotifItems.filter((n) => !n.isRead), read: taskNotifItems.filter((n) => n.isRead) };
    if (activeTab === 'reminders') return { unread: visibleReminders, read: [] };
    return { unread: [...visibleReminders, ...notificationItems.filter((n) => !n.isRead)], read: notificationItems.filter((n) => n.isRead) };
  })();

  const handleMarkAllRead = () => {
    if (unreadNotifCount > 0) markAllReadMutation.mutate();
    if (visibleReminders.length > 0) {
      persistDismissed(new Set([...dismissedReminderKeys, ...visibleReminders.map((r) => r.dismissKey)]));
    }
  };

  const handleSelect = (item) => {
    if (item.kind === 'notification' && !item.isRead) markReadMutation.mutate(item.id);
    if (item.linkUrl) navigate(item.linkUrl);
  };

  const Row = ({ item }) => (
    <div
      role="button"
      onClick={() => handleSelect(item)}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors',
        item.kind === 'notification' && !item.isRead && 'bg-blue-50/60'
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', item.bg)}>
        <item.Icon className={cn('w-4 h-4', item.color)} />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm text-slate-700 leading-snug">
          {item.actorLabel && <span className="font-bold text-navy">{item.actorLabel}</span>}
          {item.rest}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {item.timeLabel}
        </div>
      </div>
      {item.kind === 'notification' && !item.isRead && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            markReadMutation.mutate(item.id);
          }}
          title="Mark as read"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-semibold pl-2 pr-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-lg whitespace-nowrap"
        >
          <Check className="w-3 h-3" /> Mark as Read
        </button>
      )}
      {item.kind === 'notification' && item.isRead && (
        <div className="absolute right-3 top-3 text-slate-300">
          <Check className="w-3.5 h-3.5" />
        </div>
      )}
      {item.kind === 'reminder' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissReminder(item.dismissKey);
          }}
          title="Dismiss"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-semibold pl-2 pr-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-lg whitespace-nowrap"
        >
          <X className="w-3 h-3" /> Dismiss
        </button>
      )}
    </div>
  );

  const emptyLabel =
    activeTab === 'tasks'
      ? 'No task activity yet'
      : activeTab === 'reminders'
      ? "You're all caught up — no reminders due"
      : 'No notifications yet';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all text-white"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[92vw] max-h-[32rem] overflow-hidden p-0 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Your Notifications</span>
            {badgeCount > 0 && (
              <span className="bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {badgeCount} New
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!hasAnyUnread || markAllReadMutation.isPending}
            title={hasAnyUnread ? 'Mark all as read' : 'No unread notifications'}
            className={cn(
              'text-xs font-semibold flex items-center gap-1 transition-colors',
              !hasAnyUnread || markAllReadMutation.isPending
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-400 hover:text-primary'
            )}
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
          </button>
        </div>

        <div className="flex px-2 pt-1.5 gap-1 border-b border-slate-100 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {listForTab.unread.length === 0 && listForTab.read.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">{emptyLabel}</p>
          ) : (
            <>
              {listForTab.unread.map((item) => (
                <Row key={item.id} item={item} />
              ))}
              {listForTab.read.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Previous Notifications
                    </span>
                  </div>
                  {listForTab.read.map((item) => (
                    <Row key={item.id} item={item} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
