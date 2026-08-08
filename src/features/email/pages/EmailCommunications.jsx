import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Archive, Loader2, Eye, Copy, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

const emailTemplates = {
  client: [
    {
      id: 'deadline-reminder',
      name: 'Deadline Reminder',
      subject: 'Important: [Service] Deadline Approaching - Action Required',
      body: `Dear [Client Name],

This is a friendly reminder that your [service type] deadline is approaching soon.

**Deadline Details:**
- Service: [Service Type]
- Due Date: [Date]
- Days Remaining: [Days]

**What We Need From You:**
- [Required Item 1]
- [Required Item 2]
- [Required Item 3]

Please submit the required documents at your earliest convenience to ensure timely processing.

If you have any questions or need assistance, please don't hesitate to reach out.

Best regards,
[Your Name]
GoGet CRM`
    },
    {
      id: 'document-request',
      name: 'Document Request',
      subject: 'Required Documents for [Service] - Please Submit by [Date]',
      body: `Dear [Client Name],

To proceed with [specific service], we need the following documents from you:

**Required Documents:**
1. [Document Type 1]
2. [Document Type 2]
3. [Document Type 3]

**Submission Instructions:**
- Upload here: [Link]
- Or email to: [Email]
- Deadline: [Date]

Thank you for your prompt attention.

Best regards,
[Your Name]
GoGet CRM`
    },
    {
      id: 'invoice',
      name: 'Invoice Notification',
      subject: 'Invoice #[Number] - Service Complete',
      body: `Dear [Client Name],

We have completed your services and prepared your invoice.

**Invoice Details:**
- Number: [Invoice Number]
- Date: [Date]
- Amount Due: $[Amount]
- Due Date: [Due Date]

You can pay via bank transfer, credit card, or e-transfer.

Best regards,
[Your Name]
GoGet CRM`
    },
    {
      id: 'service-complete',
      name: 'Service Completion',
      subject: 'Service Complete: [Service Name]',
      body: `Dear [Client Name],

Great news! We have successfully completed [service name].

**Completion Details:**
- Service: [Service]
- Date: [Date]
- Deliverables: [What was delivered]

If you have any questions, I'm here to help.

Best regards,
[Your Name]
GoGet CRM`
    }
  ]
};

export default function EmailCommunications() {
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadTemplate = (template) => {
    const content = `Subject: ${template.subject}\n\n${template.body}`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${template.id}-template.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Template downloaded');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Email Communications
          </h1>
          <p className="text-muted-foreground mt-2">
            Review AI-generated drafts and access professional templates
          </p>
        </div>
        <Link to="/EmailTemplates">
          <Button variant="outline" size="sm">View All Templates</Button>
        </Link>
      </div>

      <Tabs defaultValue="drafts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drafts" className="gap-2">
            <Eye className="w-4 h-4" />
            Pending Drafts ({drafts.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Email Templates ({emailTemplates.client.length})
          </TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          {drafts.length === 0 ? (
            <Card className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No draft emails pending review</p>
              <p className="text-sm text-muted-foreground mt-2">
                AI-generated deadline reminders will appear here
              </p>
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
                          {draft.due_date && (
                            <Badge className="bg-amber-100 text-amber-800">
                              Due: {new Date(draft.due_date).toLocaleDateString()}
                            </Badge>
                          )}
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
                          Review & Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {emailTemplates.client.map(template => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsTemplateOpen(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.subject}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Draft Dialog */}
      {selectedDraft && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review & Send Email</DialogTitle>
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

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedTemplate.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Subject: {selectedTemplate.subject}</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-lg whitespace-pre-wrap font-mono text-sm leading-relaxed border">
                {selectedTemplate.body}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => copyToClipboard(selectedTemplate.body)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Content
                </Button>
                <Button
                  onClick={() => downloadTemplate(selectedTemplate)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">💡 Usage Tips:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Replace all [bracketed] placeholders with specific information</li>
                  <li>Personalize the tone to match your style</li>
                  <li>Copy template and paste into your email client or CRM</li>
                  <li>Always proofread before sending</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}