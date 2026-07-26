import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight, Phone, Mail, Calendar, StickyNote,
  CheckCircle2, Plus, Upload, Zap, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ACTIVITY_META = {
  stage_change:    { icon: ArrowRight,    color: 'bg-blue-100 text-blue-700',   label: 'Stage Change' },
  call:            { icon: Phone,         color: 'bg-green-100 text-green-700', label: 'Call' },
  email:           { icon: Mail,          color: 'bg-purple-100 text-purple-700', label: 'Email' },
  meeting:         { icon: Calendar,      color: 'bg-orange-100 text-orange-700', label: 'Meeting' },
  note:            { icon: StickyNote,    color: 'bg-yellow-100 text-yellow-700', label: 'Note' },
  task_completed:  { icon: CheckCircle2,  color: 'bg-emerald-100 text-emerald-700', label: 'Task Completed' },
  csv_import:      { icon: Upload,        color: 'bg-slate-100 text-slate-600', label: 'CSV Import' },
  lead_created:    { icon: Zap,           color: 'bg-indigo-100 text-indigo-700', label: 'Lead Created' },
};

export default function LeadActivityFeed({ leadId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newActivity, setNewActivity] = useState({ activity_type: 'call', details: '' });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => api.entities.Activity.filter({ lead_id: leadId }, '-activity_date'),
    enabled: !!leadId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', leadId]);
      setShowForm(false);
      setNewActivity({ activity_type: 'call', details: '' });
      toast.success('Activity logged');
    }
  });

  const handleLog = () => {
    if (!newActivity.details.trim()) return;
    createMutation.mutate({
      lead_id: leadId,
      activity_type: newActivity.activity_type,
      title: `${ACTIVITY_META[newActivity.activity_type]?.label || newActivity.activity_type} logged`,
      details: newActivity.details,
      performed_by: user?.email || '',
      activity_date: new Date().toISOString()
    });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading activities...</div>;

  return (
    <div className="space-y-4">
      {/* Log new activity */}
      {!showForm ? (
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Log Activity
        </Button>
      ) : (
        <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
          <div className="flex gap-3">
            <Select value={newActivity.activity_type} onValueChange={(v) => setNewActivity({ ...newActivity, activity_type: v })}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="call" className="text-slate-900">📞 Call</SelectItem>
                <SelectItem value="email" className="text-slate-900">✉️ Email</SelectItem>
                <SelectItem value="meeting" className="text-slate-900">📅 Meeting</SelectItem>
                <SelectItem value="note" className="text-slate-900">📝 Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add details about this touchpoint..."
            value={newActivity.details}
            onChange={(e) => setNewActivity({ ...newActivity, details: e.target.value })}
            rows={3}
            className="bg-white"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={createMutation.isPending || !newActivity.details.trim()} onClick={handleLog}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Feed */}
      {activities.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No activities yet. Stage changes and tasks will appear here automatically.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {activities.map((activity) => {
              const meta = ACTIVITY_META[activity.activity_type] || ACTIVITY_META.note;
              const Icon = meta.icon;
              const date = activity.activity_date ? new Date(activity.activity_date) : new Date(activity.created_date);
              return (
                <div key={activity.id} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white border rounded-xl p-3 shadow-sm min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-800">{activity.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(date, { addSuffix: true })}
                      </span>
                    </div>
                    {activity.from_stage && activity.to_stage && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded">{activity.from_stage}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{activity.to_stage}</span>
                      </div>
                    )}
                    {activity.details && (
                      <p className="text-sm text-slate-600 mt-1">{activity.details}</p>
                    )}
                    {activity.performed_by && (
                      <p className="text-xs text-muted-foreground mt-1.5">by {activity.performed_by}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}