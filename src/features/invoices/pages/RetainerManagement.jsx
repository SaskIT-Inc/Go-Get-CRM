import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function RetainerManagement() {
  const [selectedRetainer, setSelectedRetainer] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const queryClient = useQueryClient();

  // Fetch approved estimates
  const { data: estimates = [] } = useQuery({
    queryKey: ['approvedEstimates'],
    queryFn: () => api.entities.Estimate.filter({ status: 'approved' })
  });

  // Fetch all retainers
  const { data: retainers = [] } = useQuery({
    queryKey: ['retainers'],
    queryFn: () => api.entities.Retainer.list()
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  // Create retainer from estimate
  const createRetainerMutation = useMutation({
    mutationFn: async (estimateData) => {
      const retainerNumber = `RET-${Date.now()}`;
      const retainer = {
        estimate_id: estimateData.id,
        client_id: estimateData.client_id,
        retainer_number: retainerNumber,
        services: estimateData.services || [],
        total_monthly_fee: estimateData.total_amount || 0,
        total_annual_fee: (estimateData.total_amount || 0) * 12,
        start_date: new Date().toISOString().split('T')[0],
        billing_frequency: 'Monthly',
        payment_terms: 'Due on receipt',
        status: 'draft',
        agreement_terms: `Standard Retainer Agreement Terms\n\nThis retainer agreement outlines the services to be provided on a recurring basis.`
      };
      return api.entities.Retainer.create(retainer);
    },
    onSuccess: (retainer) => {
      queryClient.invalidateQueries({ queryKey: ['retainers'] });
      setSelectedRetainer(retainer);
      setShowCreateDialog(false);
      setSelectedEstimate(null);
      toast.success('Retainer created successfully');
    }
  });

  // Send for signature
  const sendForSignatureMutation = useMutation({
    mutationFn: async (retainerId) => {
      const retainer = retainers.find(r => r.id === retainerId);
      const client = clients.find(c => c.id === retainer.client_id);
      
      // Generate signature request
      const signatureRequest = {
        document_id: retainerId,
        service_filing_id: retainer.estimate_id,
        requested_from_email: client.primary_email,
        status: 'pending',
        request_date: new Date().toISOString(),
        message: `Please review and sign the retainer agreement for ${retainer.retainer_number}`
      };

      const signature = await api.entities.Signature.create(signatureRequest);
      
      // Update retainer status
      await api.entities.Retainer.update(retainerId, {
        status: 'sent_for_signature',
        signature_id: signature.id
      });

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retainers'] });
      toast.success('Retainer sent to client for signature');
    }
  });

  const statusColors = {
    draft: 'bg-gray-500/10 text-gray-700',
    sent_for_signature: 'bg-blue-500/10 text-blue-700',
    signed: 'bg-green-500/10 text-green-700',
    active: 'bg-green-600 text-white',
    paused: 'bg-yellow-500/10 text-yellow-700',
    cancelled: 'bg-red-500/10 text-red-700'
  };

  const statusIcons = {
    draft: <FileText className="w-4 h-4" />,
    sent_for_signature: <Send className="w-4 h-4" />,
    signed: <CheckCircle2 className="w-4 h-4" />,
    active: <CheckCircle2 className="w-4 h-4" />,
    paused: <Clock className="w-4 h-4" />,
    cancelled: <X className="w-4 h-4" />
  };

  const draftRetainers = retainers.filter(r => r.status === 'draft');
  const sentRetainers = retainers.filter(r => r.status === 'sent_for_signature');
  const activeRetainers = retainers.filter(r => r.status === 'active' || r.status === 'signed');
  const inactiveRetainers = retainers.filter(r => r.status === 'paused' || r.status === 'cancelled');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy">Retainer Management</h1>
          <p className="text-muted-foreground mt-2">Generate and track retainer agreements</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('CommercialHub')}>
            <Button variant="outline">Commercial Hub</Button>
          </Link>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Create from Estimate
          </Button>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Create Retainer from Approved Estimate
              <Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(false)}>
                <X className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {estimates.length === 0 ? (
                <p className="text-muted-foreground">No approved estimates available</p>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {estimates.map(estimate => {
                    const client = clients.find(c => c.id === estimate.client_id);
                    return (
                      <div
                        key={estimate.id}
                        className="p-4 border rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                        onClick={() => setSelectedEstimate(estimate)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-navy">{estimate.estimate_number}</h4>
                            <p className="text-sm text-muted-foreground">{client?.legal_name}</p>
                            <p className="text-xs text-slate-600 mt-1">{estimate.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-navy">${estimate.total_amount?.toFixed(2)}</p>
                            <Badge>{estimate.status}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedEstimate && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => createRetainerMutation.mutate(selectedEstimate)}
                    className="flex-1"
                    disabled={createRetainerMutation.isPending}
                  >
                    Generate Retainer Agreement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEstimate(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="drafts" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-4">
          <TabsTrigger value="drafts">Drafts ({draftRetainers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({sentRetainers.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeRetainers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveRetainers.length})</TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          <div className="grid gap-4">
            {draftRetainers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">No draft retainers</p>
                </CardContent>
              </Card>
            ) : (
              draftRetainers.map(retainer => {
                const client = clients.find(c => c.id === retainer.client_id);
                return (
                  <Card key={retainer.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-navy">{retainer.retainer_number}</h3>
                            <Badge className={statusColors[retainer.status]}>
                              {retainer.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{client?.legal_name}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Monthly Fee</p>
                              <p className="font-bold text-navy">${retainer.total_monthly_fee?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Annual Fee</p>
                              <p className="font-bold text-navy">${retainer.total_annual_fee?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Services</p>
                              <p className="font-bold text-navy">{retainer.services?.length || 0}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => sendForSignatureMutation.mutate(retainer.id)}
                            className="gap-2"
                            disabled={sendForSignatureMutation.isPending}
                          >
                            <Send className="w-4 h-4" />
                            Send for Signature
                          </Button>
                          <Button variant="outline" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <div className="grid gap-4">
            {sentRetainers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">No pending signatures</p>
                </CardContent>
              </Card>
            ) : (
              sentRetainers.map(retainer => {
                const client = clients.find(c => c.id === retainer.client_id);
                return (
                  <Card key={retainer.id} className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-navy">{retainer.retainer_number}</h3>
                            <Badge className={statusColors[retainer.status]}>
                              <Send className="w-3 h-3 mr-1" />
                              Awaiting Signature
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{client?.legal_name}</p>
                          <p className="text-xs text-blue-600 mt-2">Sent to: {client?.primary_email}</p>
                        </div>
                        <Button variant="outline">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Follow Up
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Active Tab */}
        <TabsContent value="active">
          <div className="grid gap-4">
            {activeRetainers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">No active retainers</p>
                </CardContent>
              </Card>
            ) : (
              activeRetainers.map(retainer => {
                const client = clients.find(c => c.id === retainer.client_id);
                return (
                  <Card key={retainer.id} className="border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-navy">{retainer.retainer_number}</h3>
                            <Badge className={statusColors[retainer.status]}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {retainer.status === 'active' ? 'Active' : 'Signed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{client?.legal_name}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Monthly</p>
                              <p className="font-bold text-green-700">${retainer.total_monthly_fee?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Billing</p>
                              <p className="font-bold text-navy">{retainer.billing_frequency}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Services</p>
                              <p className="font-bold text-navy">{retainer.services?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Signed</p>
                              <p className="font-bold text-navy">
                                {retainer.signed_date ? new Date(retainer.signed_date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Inactive Tab */}
        <TabsContent value="inactive">
          <div className="grid gap-4">
            {inactiveRetainers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">No inactive retainers</p>
                </CardContent>
              </Card>
            ) : (
              inactiveRetainers.map(retainer => {
                const client = clients.find(c => c.id === retainer.client_id);
                return (
                  <Card key={retainer.id} className="opacity-75">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-navy">{retainer.retainer_number}</h3>
                            <Badge className={statusColors[retainer.status]}>
                              {retainer.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{client?.legal_name}</p>
                        </div>
                        <Button variant="outline">Reactivate</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}