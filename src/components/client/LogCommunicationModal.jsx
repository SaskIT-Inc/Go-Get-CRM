import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const COMMUNICATION_TYPES = ['Call', 'Email', 'Meeting', 'Note'];

const DEFAULT_FORM = () => ({
  communication_type: 'Note',
  subject: '',
  notes: '',
  communication_date: new Date().toISOString().split('T')[0],
});

export default function LogCommunicationModal({ open, onClose, clientId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM());

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const logMutation = useMutation({
    mutationFn: (data) => api.entities.Communication.create({ ...data, client_id: clientId }),
    onSuccess: () => {
      // Unscoped key so this invalidates both the client-card's
      // ['communications', clientId] query and the standalone Communication
      // History page's unscoped ['communications'] query (TanStack matches
      // by prefix, so a shorter key here reaches every longer variant).
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Communication logged');
      setForm(DEFAULT_FORM());
      onClose();
    },
    onError: (error) => toast.error('Failed to log communication: ' + error.message),
  });

  const handleSave = () => {
    if (!form.communication_date) {
      toast.error('Please select a date');
      return;
    }
    logMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.communication_type} onValueChange={set('communication_type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.communication_date}
                onChange={(e) => set('communication_date')(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input
              value={form.subject}
              onChange={(e) => set('subject')(e.target.value)}
              placeholder="e.g. Kickoff call, Follow-up email..."
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="What was discussed..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={logMutation.isPending} className="gap-2">
            {logMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Log Communication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
