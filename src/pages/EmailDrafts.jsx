import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Archive, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailDrafts() {
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['emailDrafts'],
    queryFn: () => api.entities.EmailDraft.filter({ status: 'draft' })
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const sendDraftMutation = useMutation({
    mutationFn: async (draftId) => {
      await api.entities.EmailDraft.update(draftId, {
        status: 'sent',
        sent_date: new Date().toISOString(),
        sent_by: user?.email,
        notes
      });
      
      // Send email via integration
      await api.integrations.Core.SendEmail({
        to: selectedDraft.client_email,
        subject: selectedDraft.subject_line,
        body: selectedDraft.email_body,
        from_name: 'GoGet CRM'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailDrafts'] });
      toast.success('Email sent to client');
      setIsViewOpen(false);
      setSelectedDraft(null);
      setNotes('');
    },
    onError: () => {
      toast.error('Failed to send email');
    }
  });

  const archiveDraftMutation = useMutation({
    mutationFn: (draftId) => api.entities.EmailDraft.update(draftId, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailDrafts'] });
      toast.success('Draft archived');
    }
  });

  const handleViewDraft = (draft) => {
    setSelectedDraft(draft);
    setNotes(draft.notes || '');
    setIsViewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-8 h-8" />
          Email Drafts
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and send AI-generated deadline reminder emails to clients
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card className="text-center py-12">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No draft emails pending review</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Card key={draft.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{draft.client_name}</h3>
                      <Badge variant="outline">{draft.client_email}</Badge>
                      <Badge className="bg-amber-100 text-amber-800">
                        Due: {new Date(draft.due_date).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Subject:</strong> {draft.subject_line}
                    </p>
                    <p className="text-sm line-clamp-3 bg-slate-50 p-3 rounded">
                      {draft.email_body}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDraft(draft)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {selectedDraft && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Email Draft</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">To:</p>
                <p className="font-medium">{selectedDraft.client_name} ({selectedDraft.client_email})</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Subject:</p>
                <p className="font-medium">{selectedDraft.subject_line}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Message:</p>
                <Card className="p-4 bg-slate-50">
                  <p className="whitespace-pre-wrap text-sm">{selectedDraft.email_body}</p>
                </Card>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Your Notes (optional):
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or edits before sending..."
                  className="h-24"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    archiveDraftMutation.mutate(selectedDraft.id);
                    setIsViewOpen(false);
                  }}
                  disabled={archiveDraftMutation.isPending}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
                <Button
                  onClick={() => sendDraftMutation.mutate(selectedDraft.id)}
                  disabled={sendDraftMutation.isPending}
                  className="gap-2"
                >
                  {sendDraftMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Client
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}