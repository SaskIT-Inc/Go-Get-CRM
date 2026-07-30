import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Send, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';

export default function SignatureWorkflow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiling, setSelectedFiling] = useState('');
  const [selectedDocument, setSelectedDocument] = useState('');
  const [signatureEmail, setSignatureEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: filings = [] } = useQuery({
    queryKey: ['signatureFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['sigDocuments', selectedFiling],
    queryFn: () => selectedFiling ? api.entities.Document.filter({ service_filing_id: selectedFiling }) : Promise.resolve([]),
    enabled: !!selectedFiling
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['signatures'],
    queryFn: () => api.entities.Signature.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['signatureClients'],
    queryFn: () => api.entities.Client.list()
  });

  const requestSignatureMutation = useMutation({
    mutationFn: async (data) => {
      const signature = await api.entities.Signature.create({
        document_id: data.document_id,
        service_filing_id: data.service_filing_id,
        client_id: data.client_id,
        requested_from_email: data.email,
        status: 'pending',
        request_date: new Date().toISOString(),
        message: data.message
      });

      // Send notification to client
      await api.integrations.Core.SendEmail({
        to: data.email,
        subject: `Signature Request: ${data.documentName}`,
        body: `Please review and sign the attached document.\n\nMessage: ${data.message || 'N/A'}\n\nPlease contact us if you have any questions.`
      });

      return signature;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Signature request sent to client',
      });
      setIsDialogOpen(false);
      setSelectedDocument('');
      setSignatureEmail('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request signature',
        variant: 'destructive'
      });
    }
  });

  const uploadSignedDocMutation = useMutation({
    mutationFn: async (signatureId) => {
      await api.functions.invoke('uploadSignedDocumentToOneDrive', { signature_id: signatureId });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Signed document uploaded to OneDrive',
      });
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive'
      });
    }
  });

  const selectedFilingData = filings.find((f) => f.id === selectedFiling);
  const selectedDocData = documents.find((d) => d.id === selectedDocument);
  const selectedClientData = selectedFilingData ? clients.find((c) => c.id === selectedFilingData.client_id) : null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'signed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Signed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Signature Workflow</h1>
        <p className="text-muted-foreground">
          Request signatures on tax and compliance documents, manage responses, and sync to OneDrive
        </p>
      </div>

      {/* Request Signature Section */}
      <div className="mb-8">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy hover:bg-navy/90 text-white">
              <Send className="w-4 h-4 mr-2" />
              Request Signature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-navy">Request Document Signature</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {/* Filing Selection */}
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Service Filing</label>
                <Select value={selectedFiling} onValueChange={setSelectedFiling}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a filing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filings.map((filing) => (
                      <SelectItem key={filing.id} value={filing.id}>
                        {filing.service_name} - {filing.client_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Selection */}
              {selectedFiling && (
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Document</label>
                  <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.document_name || doc.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client Email */}
              {selectedFilingData && (
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Recipient Email</label>
                  <Input
                    type="email"
                    value={signatureEmail}
                    onChange={(e) => setSignatureEmail(e.target.value)}
                    placeholder={selectedClientData?.email || 'client@example.com'}
                    className="h-10"
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Message (Optional)</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any specific instructions or notes..."
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedDocument && signatureEmail && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold text-navy mb-2">Signature Request Summary</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li><strong>Document:</strong> {selectedDocData?.document_name || selectedDocData?.file_name}</li>
                      <li><strong>Recipient:</strong> {signatureEmail}</li>
                      <li><strong>Filing:</strong> {selectedFilingData?.service_name}</li>
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedFiling('');
                    setSelectedDocument('');
                    setSignatureEmail('');
                    setMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => requestSignatureMutation.mutate({
                    document_id: selectedDocument,
                    service_filing_id: selectedFiling,
                    client_id: selectedFilingData?.client_id,
                    email: signatureEmail,
                    message,
                    documentName: selectedDocData?.document_name || selectedDocData?.file_name
                  })}
                  disabled={!selectedDocument || !signatureEmail || requestSignatureMutation.isPending}
                  className="bg-navy hover:bg-navy/90"
                >
                  {requestSignatureMutation.isPending ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signatures List */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">Signature Requests</h2>
        {signatures.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No signature requests yet</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {signatures.map((sig) => {
              const doc = documents.find((d) => d.id === sig.document_id);
              return (
                <Card key={sig.id} className="border-l-4 border-l-navy">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-navy" />
                          <h3 className="font-semibold text-navy">
                            {doc?.document_name || 'Document'}
                          </h3>
                          {getStatusBadge(sig.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mt-3">
                          <div>
                            <p className="text-xs text-slate-500">Requested From</p>
                            <p className="font-medium text-slate-900">{sig.requested_from_email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Request Date</p>
                            <p className="font-medium text-slate-900">
                              {new Date(sig.request_date).toLocaleDateString()}
                            </p>
                          </div>
                          {sig.signed_date && (
                            <div>
                              <p className="text-xs text-slate-500">Signed Date</p>
                              <p className="font-medium text-slate-900">
                                {new Date(sig.signed_date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {sig.status === 'signed' && (
                          <Button
                            size="sm"
                            onClick={() => uploadSignedDocMutation.mutate(sig.id)}
                            disabled={uploadSignedDocMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {uploadSignedDocMutation.isPending ? 'Uploading...' : 'Upload to OneDrive'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}