import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.entities.Notification.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSelect = (notification) => {
    if (!notification.is_read) markReadMutation.mutate(notification.id);
    if (notification.link_url) navigate(notification.link_url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all text-white"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleSelect(n)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer',
                !n.is_read && 'bg-blue-50'
              )}
            >
              <p className={cn('text-sm', !n.is_read ? 'font-semibold text-navy' : 'text-slate-600')}>
                {n.title}
              </p>
              <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
