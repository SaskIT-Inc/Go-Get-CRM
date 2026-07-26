import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

export default function StageUpdateModal({ pipeline, currentStage, stages, onClose }) {
  const queryClient = useQueryClient();
  const currentIndex = stages.findIndex(s => s.name === currentStage);
  const nextStages = stages.slice(currentIndex + 1).map(s => s.name);
  
  const [selectedStage, setSelectedStage] = useState(nextStages[0] || '');
  const [notes, setNotes] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const historyEntry = {
        stage: selectedStage,
        entered_date: new Date().toISOString(),
        notes: notes || undefined,
      };

      const update = {
        current_stage: selectedStage,
        stage_history: [...(pipeline.stage_history || []), historyEntry],
      };
      if (selectedStage === 'Final Filing Confirmation' && confirmationNumber) {
        update.cra_confirmation_number = confirmationNumber;
      }

      const updated = await api.entities.FilingPipeline.update(pipeline.id, update);

      // Best-effort — a notification hiccup must never block the stage save itself.
      try {
        if (pipeline.client_id) {
          const client = await api.entities.Client.get(pipeline.client_id);
          if (client?.primary_email) {
            await api.integrations.Core.SendEmail({
              to: client.primary_email,
              subject: `Update on your ${pipeline.filing_type || 'filing'}`,
              body: `Hi ${client.primary_contact_name || client.legal_name || ''},\n\nYour ${pipeline.filing_type || 'filing'} has moved to the "${selectedStage}" stage.${notes ? `\n\nNotes: ${notes}` : ''}\n\nWe'll keep you posted as it progresses.`,
            });
          }
        }
      } catch {
        // Swallowed intentionally — see comment above.
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['filingPipelines']);
      queryClient.invalidateQueries(['serviceFilings']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Filing Stage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Stage:</p>
            <p className="font-semibold text-navy">{currentStage}</p>
          </div>

          <div>
            <Label>Move to Stage</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select next stage" />
              </SelectTrigger>
              <SelectContent>
                {nextStages.map(stage => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStage === 'Final Filing Confirmation' && (
            <div>
              <Label>CRA Confirmation Number</Label>
              <Input
                placeholder="Enter CRA confirmation number"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this stage transition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> The client will automatically receive an email notification about this stage update.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={!selectedStage || updateMutation.isPending} 
              className="flex-1 gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {updateMutation.isPending ? 'Updating...' : 'Update Stage'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}