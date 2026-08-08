import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, PenTool, MessageSquare, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import DocumentUploadModal from '@/features/clients/components/detail/DocumentUploadModal';
import SignatureModal from '@/features/clients/components/detail/SignatureModal';
import useLiveChat from '@/hooks/useLiveChat';

export default function ClientPortal() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  // The backend already scopes a client-role user's Client.list() to just
  // their own row (generic.py's _authorize_client, matched case-insensitively
  // against their login email) — no need to also filter client-side by
  // primary_email here, which used to require an exact case match and could
  // return nothing if that ever drifted from the login email's casing.
  const { data: client } = useQuery({
    queryKey: ['myClient'],
    queryFn: async () => {
      const clients = await api.entities.Client.list();
      return clients[0];
    },
    enabled: !!user
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['myFilings'],
    queryFn: () => api.entities.ServiceFiling.filter({ client_id: client.id }),
    enabled: !!client
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['myDocuments'],
    queryFn: () => api.entities.Document.filter({ client_id: client.id }),
    enabled: !!client
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['myChecklists'],
    queryFn: () => api.entities.DocumentChecklist.filter({ client_id: client.id }),
    enabled: !!client
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['mySignatures'],
    queryFn: () => api.entities.Signature.filter({ client_id: client.id }),
    enabled: !!client
  });

  useLiveChat();

  const { data: communications = [] } = useQuery({
    queryKey: ['communications', client?.id],
    queryFn: () => api.entities.Communication.filter({ client_id: client.id }),
    enabled: !!client,
    refetchInterval: 5000
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text) => api.entities.Communication.create({ notes: text }),
    onMutate: async (text) => {
      const key = ['communications', client?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => [
        { id: `optimistic-${Date.now()}`, client_id: client?.id, communication_type: 'Portal Message', notes: text, sender_type: 'client', communication_date: new Date().toISOString() },
        ...old,
      ]);
      setMessageText('');
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', client?.id] });
    },
    onError: (error, _text, context) => {
      if (context?.previous) queryClient.setQueryData(['communications', client?.id], context.previous);
    }
  });

  const statusColors = {
    'Not Started': 'bg-gray-500/10 text-gray-700',
    'Documents Pending': 'bg-yellow-500/10 text-yellow-700',
    'In Progress': 'bg-blue-500/10 text-blue-700',
    'Review': 'bg-purple-500/10 text-purple-700',
    'Filed': 'bg-green-500/10 text-green-700',
    'Completed': 'bg-green-600/10 text-green-800'
  };

  const handleUploadClick = (filing) => {
    setSelectedFiling(filing);
    setShowUploadModal(true);
  };

  const handleSignatureClick = (filing) => {
    setSelectedFiling(filing);
    setShowSignatureModal(true);
  };

  if (!client) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No Client Profile Found</h3>
            <p className="text-muted-foreground">
              Your account is not yet linked to a client profile. Please contact your accountant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Client Portal</h1>
        <p className="text-muted-foreground">Welcome, {client.legal_name}</p>
      </div>

      <Tabs defaultValue="filings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="filings">My Filings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filings" className="space-y-4">
          {serviceFilings.map(filing => {
            const checklist = checklists.find(c => c.service_filing_id === filing.id);
            const missingDocs = checklist?.checklist_items?.filter(i => i.status === 'Missing').length || 0;
            const completionPct = checklist?.completion_percentage || 0;

            return (
              <Card key={filing.id} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{filing.service_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Filing Year: {filing.filing_year}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[filing.status]}>
                      {filing.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {checklist && (
                    <>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">Document Completion</span>
                          <span className="text-sm text-muted-foreground">{completionPct}%</span>
                        </div>
                        <Progress value={completionPct} className="h-2" />
                        {missingDocs > 0 && (
                          <p className="text-sm text-orange-600 mt-2">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            {missingDocs} document(s) still needed
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-semibold">Required Documents:</p>
                        {checklist.checklist_items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              {item.status === 'Missing' ? (
                                <Clock className="w-4 h-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              <span className="text-sm">{item.document_name}</span>
                            </div>
                            <Badge variant="outline" className={
                              item.status === 'Approved' ? 'bg-green-500/10 text-green-700' :
                              item.status === 'Uploaded' ? 'bg-blue-500/10 text-blue-700' :
                              'bg-orange-500/10 text-orange-700'
                            }>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => handleUploadClick(filing)} className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Documents
                    </Button>
                    <Button variant="outline" onClick={() => handleSignatureClick(filing)} className="gap-2">
                      <PenTool className="w-4 h-4" />
                      Sign Forms
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {serviceFilings.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No Active Filings</h3>
                <p className="text-muted-foreground">You don't have any active service filings.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Card key={doc.id} className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{doc.document_type}</p>
                      <Badge variant="outline" className="mt-2">
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signatures">
          <div className="space-y-4">
            {signatures.map(sig => (
              <Card key={sig.id} className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{sig.document_type}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Signed on {new Date(sig.signed_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Signed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Messages</CardTitle>
              <p className="text-xs text-muted-foreground">
                Send a message to your firm — they'll see it and can reply right here.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 mb-4">
                {communications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No messages yet</p>
                ) : [...communications].reverse().map(comm => {
                  const fromMe = comm.sender_type === 'client';
                  return (
                    <div key={comm.id} className={cn('flex', fromMe ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2.5',
                        fromMe ? 'bg-navy text-white' : 'bg-slate-100 text-slate-800'
                      )}>
                        {comm.communication_type && comm.communication_type !== 'Portal Message' && (
                          <p className={cn('text-xs font-semibold mb-1', fromMe ? 'text-white/70' : 'text-slate-500')}>
                            {comm.subject || comm.communication_type}
                          </p>
                        )}
                        {comm.notes && <p className="text-sm whitespace-pre-wrap">{comm.notes}</p>}
                        <p className={cn('text-[10px] mt-1', fromMe ? 'text-white/60' : 'text-slate-400')}>
                          {fromMe ? 'You' : 'Your firm'}
                          {' · '}
                          {new Date(comm.communication_date).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  className="self-end gap-2"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  onClick={() => sendMessageMutation.mutate(messageText.trim())}
                >
                  {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showUploadModal && (
        <DocumentUploadModal
          filing={selectedFiling}
          client={client}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedFiling(null);
          }}
        />
      )}

      {showSignatureModal && (
        <SignatureModal
          filing={selectedFiling}
          client={client}
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedFiling(null);
          }}
        />
      )}
    </div>
  );
}