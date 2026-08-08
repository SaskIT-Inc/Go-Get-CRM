import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Send, 
  Paperclip, 
  Sparkles, 
  FileText, 
  Inbox, 
  Edit3, 
  Trash2,
  Copy,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import MultiEmailInput from '@/features/email/components/MultiEmailInput';

// Email templates for quick insertion
const emailTemplates = [
  {
    id: 'deadline_reminder',
    category: 'Client Communication',
    name: 'Deadline Reminder',
    subject: 'Important: Upcoming Tax Filing Deadline',
    body: `Dear [Client Name],

This is a friendly reminder that your tax filing deadline is approaching on [Due Date].

To ensure timely filing, we need the following:
• [Document 1]
• [Document 2]
• [Document 3]

Please submit these documents at your earliest convenience.

Best regards,
[Your Name]`
  },
  {
    id: 'document_request',
    category: 'Client Communication',
    name: 'Document Request',
    subject: 'Required Documents for Your Tax Filing',
    body: `Hello [Client Name],

To proceed with your [Service Name], we require the following documents:

[List of Documents]

You can upload these securely through our client portal or reply to this email with attachments.

Thank you for your cooperation.

Regards,
[Your Name]`
  },
  {
    id: 'invoice_notice',
    category: 'Billing',
    name: 'Invoice Notice',
    subject: 'Invoice #[Invoice Number] - Payment Due',
    body: `Dear [Client Name],

Your invoice for [Service Name] is now available.

Invoice Number: [Invoice Number]
Amount Due: $[Amount]
Due Date: [Due Date]

Please process payment at your earliest convenience.

Best regards,
[Your Name]`
  },
  {
    id: 'filing_complete',
    category: 'Client Communication',
    name: 'Filing Complete Notification',
    subject: 'Your Tax Filing is Complete',
    body: `Hello [Client Name],

Great news! We have successfully completed your [Service Name].

Summary:
• Filing Date: [Date]
• Status: Completed
• Next Steps: [Instructions]

Thank you for choosing our services.

Best regards,
[Your Name]`
  }
];

export default function Email() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('compose');
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Email compose state
  const [emailForm, setEmailForm] = useState({
    to: [],
    cc: [],
    subject: '',
    body: '',
    attachments: []
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['emailDrafts'],
    queryFn: () => api.entities.EmailDraft.list()
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const result = await api.integrations.Core.UploadFile({ file });
      return result;
    }
  });

  // Send email mutation (using Core.SendEmail integration)
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData) => {
      await api.integrations.Core.SendEmail({
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        body: emailData.body,
        attachments: emailData.attachments,
        from_name: user?.full_name || 'GoGet CRM'
      });
    },
    onSuccess: () => {
      toast.success('Email sent successfully!');
      setEmailForm({ to: [], cc: [], subject: '', body: '', attachments: [] });
    },
    onError: (error) => {
      toast.error('Failed to send email: ' + error.message);
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData) => {
      const primaryTo = draftData.to?.[0] || '';
      const client = clients.find(c => c.primary_email === primaryTo);
      return await api.entities.EmailDraft.create({
        task_id: 'manual',
        client_id: client?.id || '',
        client_name: client?.legal_name || primaryTo || 'Unknown',
        client_email: primaryTo,
        subject_line: draftData.subject,
        email_body: draftData.body,
        status: 'draft',
        notes: 'Saved from email composer'
      });
    },
    onSuccess: () => {
      toast.success('Draft saved successfully!');
      queryClient.invalidateQueries(['emailDrafts']);
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      try {
        const result = await uploadFileMutation.mutateAsync(file);
        setEmailForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, {
            name: file.name,
            url: result.file_url,
            size: file.size
          }]
        }));
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeAttachment = (index) => {
    setEmailForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const insertTemplate = (template) => {
    setEmailForm(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body
    }));
    setShowTemplates(false);
    toast.success('Template inserted');
  };

  const handleSend = () => {
    if (emailForm.to.length === 0 || !emailForm.subject || !emailForm.body) {
      toast.error('Please fill in recipient, subject, and message');
      return;
    }

    sendEmailMutation.mutate(emailForm);
  };

  const handleSaveDraft = () => {
    if (emailForm.to.length === 0 || !emailForm.subject) {
      toast.error('Please provide recipient and subject');
      return;
    }
    saveDraftMutation.mutate(emailForm);
  };

  const loadDraft = (draft) => {
    setEmailForm({
      to: draft.client_email ? [draft.client_email] : [],
      cc: [],
      subject: draft.subject_line,
      body: draft.email_body,
      attachments: []
    });
    setActiveTab('compose');
    toast.success('Draft loaded');
  };

  const pendingDrafts = drafts.filter(d => d.status === 'draft');
  const sentEmails = drafts.filter(d => d.status === 'sent');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-navy">Email</h1>
              <p className="text-muted-foreground">Compose and manage client communications</p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-sm">
            {pendingDrafts.length} Drafts
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="compose" className="gap-2">
            <Edit3 className="w-4 h-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <Clock className="w-4 h-4" />
            Drafts ({pendingDrafts.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  New Email
                </span>
                <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Insert Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Email Templates</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                      {emailTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                          onClick={() => insertTemplate(template)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-navy">{template.name}</h4>
                              <Badge variant="outline" className="text-xs mt-1">
                                {template.category}
                              </Badge>
                            </div>
                            <Button size="sm" variant="ghost">
                              Insert
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Subject: {template.subject}
                          </p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* To Field */}
              <div>
                <Label htmlFor="to">To *</Label>
                <MultiEmailInput
                  id="to"
                  placeholder="client@example.com"
                  value={emailForm.to}
                  onChange={(to) => setEmailForm({ ...emailForm, to })}
                />
              </div>

              {/* CC Field */}
              <div>
                <Label htmlFor="cc">CC (optional)</Label>
                <MultiEmailInput
                  id="cc"
                  placeholder="cc@example.com"
                  value={emailForm.cc}
                  onChange={(cc) => setEmailForm({ ...emailForm, cc })}
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Message Body */}
              <div>
                <Label htmlFor="body">Message *</Label>
                <Textarea
                  id="body"
                  placeholder="Compose your email message..."
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  className="mt-1 min-h-[300px] font-mono text-sm"
                />
              </div>

              {/* Attachments */}
              <div>
                <Label>Attachments</Label>
                <div className="mt-2 space-y-2">
                  {emailForm.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAttachment(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload').click()}
                      className="gap-2"
                      disabled={uploadFileMutation.isPending}
                    >
                      <Paperclip className="w-4 h-4" />
                      {uploadFileMutation.isPending ? 'Uploading...' : 'Add Attachment'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSend}
                  disabled={sendEmailMutation.isPending}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <Send className="w-4 h-4" />
                  {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending}
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Saved Drafts ({pendingDrafts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingDrafts.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No draft emails</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Saved drafts will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => loadDraft(draft)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-navy">{draft.subject_line}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            To: {draft.client_email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {draft.email_body}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          Draft
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Email Templates ({emailTemplates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-5 border rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-navy text-lg">{template.name}</h4>
                        <Badge className="mt-2 bg-blue-100 text-blue-800">
                          {template.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => insertTemplate(template)}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Use Template
                      </Button>
                    </div>
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-semibold text-navy mb-2">
                        Subject: {template.subject}
                      </p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                        {template.body}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}