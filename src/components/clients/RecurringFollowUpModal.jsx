import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const INTERVAL_OPTIONS = [
  { value: '3', label: 'Every 3 days' },
  { value: '7', label: 'Every 7 days' },
  { value: '14', label: 'Every 14 days' },
  { value: '30', label: 'Every 30 days' },
];

const EMPTY_FORM = { subject: '', body: '', interval_days: '7', max_sends: '' };

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function textToHtmlParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function stoppedReasonLabel(reason) {
  if (reason === 'client_replied') return 'Stopped — client replied';
  if (reason === 'max_sends_reached') return 'Stopped — reached send limit';
  return 'Stopped';
}

export default function RecurringFollowUpModal({ open, onClose, client, sequence }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const isActive = sequence?.status === 'active';

  const startMutation = useMutation({
    mutationFn: async (data) => {
      await api.integrations.Core.SendEmail({
        to: client.primary_email,
        subject: data.subject,
        body: textToHtmlParagraphs(data.body),
        html: true,
      });
      const today = new Date().toISOString().slice(0, 10);
      const intervalDays = Number(data.interval_days) || 7;
      const nextSendDate = new Date(Date.now() + intervalDays * 86400000).toISOString().slice(0, 10);
      return api.entities.RecurringEmailSequence.create({
        client_id: client.id,
        subject: data.subject,
        body: data.body,
        interval_days: intervalDays,
        max_sends: data.max_sends === '' ? null : Number(data.max_sends),
        send_count: 1,
        last_sent_date: today,
        next_send_date: nextSendDate,
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringEmailSequences'] });
      toast.success('Recurring follow-up started — first email sent');
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: (error) => toast.error('Failed to start recurring follow-up: ' + error.message),
  });

  const stopMutation = useMutation({
    mutationFn: (stoppedReason) => api.entities.RecurringEmailSequence.update(sequence.id, {
      status: 'stopped',
      stopped_reason: stoppedReason,
    }),
    onSuccess: (_, stoppedReason) => {
      queryClient.invalidateQueries({ queryKey: ['recurringEmailSequences'] });
      toast.success(stoppedReason === 'client_replied' ? 'Marked as replied — sequence stopped' : 'Sequence cancelled');
      onClose();
    },
    onError: (error) => toast.error('Failed to stop sequence: ' + error.message),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Recurring Follow-up — {client?.legal_name}
          </DialogTitle>
        </DialogHeader>

        {isActive ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <p className="font-semibold text-navy">{sequence.subject}</p>
              <p className="text-muted-foreground">Every {sequence.interval_days} day{Number(sequence.interval_days) === 1 ? '' : 's'}</p>
              <p className="text-muted-foreground">Next send: {sequence.next_send_date}</p>
              <p className="text-muted-foreground">Sent {sequence.send_count || 0} time{Number(sequence.send_count) === 1 ? '' : 's'} so far</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => stopMutation.mutate('manual')} disabled={stopMutation.isPending}>
                Cancel Sequence
              </Button>
              <Button onClick={() => stopMutation.mutate('client_replied')} disabled={stopMutation.isPending}>
                {stopMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Replied — Stop'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {sequence?.status === 'stopped' && (
              <p className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
                {stoppedReasonLabel(sequence.stopped_reason)} — starting a new one below will begin a fresh sequence.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="rfu_subject">Subject</Label>
              <Input
                id="rfu_subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Just checking in"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfu_body">Message</Label>
              <Textarea
                id="rfu_body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={5}
                placeholder="Hi, following up on..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send Interval</Label>
                <Select value={form.interval_days} onValueChange={(value) => setForm({ ...form, interval_days: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfu_max_sends">Stop After (sends, optional)</Label>
                <Input
                  id="rfu_max_sends"
                  type="number"
                  min="1"
                  value={form.max_sends}
                  onChange={(e) => setForm({ ...form, max_sends: e.target.value })}
                  placeholder="No limit"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => startMutation.mutate(form)}
                disabled={!form.subject.trim() || !form.body.trim() || startMutation.isPending}
              >
                {startMutation.isPending ? 'Sending…' : 'Start Recurring Follow-up'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
