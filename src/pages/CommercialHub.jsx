import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Briefcase, Calculator, FileText, Send, CheckCircle2, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function CommercialHub() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');
  
  // Service Assignment
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  // Estimate Builder
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState('');
  const [lineItems, setLineItems] = useState([{ service_id: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [validUntil, setValidUntil] = useState('');

  // Retainer
  const [showRetainerDialog, setShowRetainerDialog] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  // Data fetching
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.ServiceMaster.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const { data: retainers = [] } = useQuery({
    queryKey: ['retainers'],
    queryFn: () => api.entities.Retainer.list()
  });

  // Mutations
  const createFilingMutation = useMutation({
    mutationFn: async (data) => {
      const filing = await api.entities.ServiceFiling.create({
        service_id: data.service_id,
        service_name: data.service_name,
        client_id: data.client_id,
        status: 'Not Started'
      });

      for (const assignee of data.assignees) {
        await api.entities.Task.create({
          title: `${data.service_name} - ${assignee}`,
          service_filing_id: filing.id,
          client_id: data.client_id,
          assigned_to: assignee,
          status: 'Not Started',
          priority: 'Medium'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Service assigned successfully');
      setShowServiceDialog(false);
      resetServiceForm();
    }
  });

  const createEstimateMutation = useMutation({
    mutationFn: ({ leadId, data }) => api.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Estimate created and sent');
      setShowEstimateDialog(false);
      resetEstimateForm();
    }
  });

  const createRetainerMutation = useMutation({
    mutationFn: async (estimate) => {
      return api.entities.Retainer.create({
        estimate_id: estimate.id,
        client_id: estimate.client_id,
        retainer_number: `RET-${Date.now()}`,
        services: estimate.services || [],
        total_monthly_fee: estimate.total_amount || 0,
        total_annual_fee: (estimate.total_amount || 0) * 12,
        start_date: new Date().toISOString().split('T')[0],
        billing_frequency: 'Monthly',
        status: 'draft'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Retainer created successfully');
      setShowRetainerDialog(false);
      setSelectedEstimate(null);
    }
  });

  const sendRetainerMutation = useMutation({
    mutationFn: async (retainerId) => {
      const retainer = retainers.find(r => r.id === retainerId);
      const client = clients.find(c => c.id === retainer.client_id);
      
      await api.entities.Signature.create({
        document_id: retainerId,
        service_filing_id: retainer.estimate_id,
        requested_from_email: client.primary_email,
        status: 'pending',
        request_date: new Date().toISOString()
      });

      await api.entities.Retainer.update(retainerId, { status: 'sent_for_signature' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Retainer sent for signature');
    }
  });

  // Helper functions
  const resetServiceForm = () => {
    setSelectedService(null);
    setSelectedClient('');
    setSelectedAssignees([]);
  };

  const resetEstimateForm = () => {
    setSelectedLead('');
    setLineItems([{ service_id: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
    setValidUntil('');
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    if (field === 'service_id' && value) {
      const service = services.find(s => s.id === value);
      if (service) {
        updated[index].description = service.service_name;
        updated[index].rate = service.base_price || 0;
        updated[index].amount = updated[index].quantity * (service.base_price || 0);
      }
    }
    
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setLineItems(updated);
  };

  const handleCreateEstimate = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    createEstimateMutation.mutate({
      leadId: selectedLead,
      data: {
        estimated_value: total,
        stage: 'Estimate Sent',
        notes: `ESTIMATE:\n${lineItems.map(i => `${i.description}: ${i.quantity} x $${i.rate}`).join('\n')}\nTotal: $${total.toFixed(2)}\nValid: ${validUntil}`
      }
    });
  };

  const filteredServices = services.filter(s => 
    s.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedEstimates = leads.filter(l => l.stage === 'Won' && l.estimated_value > 0);
  const draftRetainers = retainers.filter(r => r.status === 'draft');
  const activeRetainers = retainers.filter(r => r.status === 'active' || r.status === 'signed');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Commercial Hub</h1>
          <p className="text-muted-foreground">Unified service catalog, estimates, and retainer management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-3">
          <TabsTrigger value="catalog" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Service Catalog ({services.length})
          </TabsTrigger>
          <TabsTrigger value="estimates" className="gap-2">
            <Calculator className="w-4 h-4" />
            Estimates ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="retainers" className="gap-2">
            <FileText className="w-4 h-4" />
            Retainers ({retainers.length})
          </TabsTrigger>
        </TabsList>

        {/* Service Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => (
              <Card key={service.service_id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => { setSelectedService(service); setShowServiceDialog(true); }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{service.service_name}</CardTitle>
                    <Briefcase className="w-5 h-5 text-navy" />
                  </div>
                  {service.service_family && (
                    <Badge variant="outline">{service.service_family}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {service.complexity && (
                      <div className="flex justify-between">
                        <span>Complexity:</span>
                        <Badge className={service.complexity === 'High' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {service.complexity}
                        </Badge>
                      </div>
                    )}
                    {service.service_frequency && (
                      <div className="flex justify-between">
                        <span>Frequency:</span>
                        <span className="font-semibold">{service.service_frequency}</span>
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Assign to Client
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Estimates Tab */}
        <TabsContent value="estimates" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{leads.length} leads ready for estimates</p>
            <Button onClick={() => setShowEstimateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Estimate
            </Button>
          </div>

          <div className="grid gap-4">
            {approvedEstimates.map(estimate => (
              <Card key={estimate.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-navy">{estimate.contact_name}</h3>
                      <p className="text-sm text-muted-foreground">{estimate.company_name}</p>
                      <p className="text-lg font-bold text-green-600 mt-2">${estimate.estimated_value?.toFixed(2)}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Won
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Retainers Tab */}
        <TabsContent value="retainers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Badge variant="outline">Drafts: {draftRetainers.length}</Badge>
              <Badge variant="outline">Active: {activeRetainers.length}</Badge>
            </div>
            <Button onClick={() => setShowRetainerDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create from Estimate
            </Button>
          </div>

          <div className="grid gap-4">
            {retainers.map(retainer => {
              const client = clients.find(c => c.id === retainer.client_id);
              return (
                <Card key={retainer.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-navy">{retainer.retainer_number}</h3>
                          <Badge>{retainer.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{client?.legal_name}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Monthly</p>
                            <p className="font-bold text-navy">${retainer.total_monthly_fee?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Annual</p>
                            <p className="font-bold text-navy">${retainer.total_annual_fee?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Services</p>
                            <p className="font-bold text-navy">{retainer.services?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                      {retainer.status === 'draft' && (
                        <Button onClick={() => sendRetainerMutation.mutate(retainer.id)} className="gap-2">
                          <Send className="w-4 h-4" />
                          Send
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Service Assignment Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign {selectedService?.service_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Client</label>
              <select className="w-full p-2 border rounded-md" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Team Members</label>
              <div className="grid grid-cols-2 gap-2">
                {users.map(u => (
                  <button key={u.id} onClick={() => setSelectedAssignees(prev => 
                    prev.includes(u.email) ? prev.filter(e => e !== u.email) : [...prev, u.email]
                  )} className={`p-2 border rounded-md ${selectedAssignees.includes(u.email) ? 'bg-blue-50 border-blue-500' : ''}`}>
                    {u.full_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowServiceDialog(false)}>Cancel</Button>
              <Button onClick={() => createFilingMutation.mutate({
                service_id: selectedService?.service_id,
                service_name: selectedService?.service_name,
                client_id: selectedClient,
                assignees: selectedAssignees
              })} disabled={!selectedClient || selectedAssignees.length === 0}>
                Assign Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Estimate Builder Dialog */}
      <Dialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <select className="w-full p-2 border rounded-md" value={selectedLead} onChange={(e) => setSelectedLead(e.target.value)}>
              <option value="">Select lead...</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.contact_name}</option>)}
            </select>

            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <select className="col-span-5 p-2 border rounded-md" value={item.service_id}
                  onChange={(e) => updateLineItem(i, 'service_id', e.target.value)}>
                  <option value="">Select service...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
                </select>
                <Input type="number" className="col-span-2" value={item.quantity} 
                  onChange={(e) => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                <Input type="number" className="col-span-2" value={item.rate}
                  onChange={(e) => updateLineItem(i, 'rate', parseFloat(e.target.value) || 0)} />
                <Input type="number" className="col-span-2" value={item.amount.toFixed(2)} readOnly />
                {i > 0 && <Button size="icon" variant="ghost" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))}>
                  <X className="w-4 h-4" />
                </Button>}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { service_id: '', description: '', quantity: 1, rate: 0, amount: 0 }])}>
              <Plus className="w-4 h-4 mr-2" />Add Item
            </Button>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${(lineItems.reduce((s, i) => s + i.amount, 0) * 1.05).toFixed(2)}</span>
              </div>
            </div>

            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="Valid until..." />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEstimateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateEstimate} disabled={!selectedLead}>Create Estimate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retainer Creation Dialog */}
      <Dialog open={showRetainerDialog} onOpenChange={setShowRetainerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Retainer from Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {approvedEstimates.map(est => (
              <Card key={est.id} className="cursor-pointer hover:bg-blue-50"
                onClick={() => setSelectedEstimate(est)}>
                <CardContent className="pt-4">
                  <h4 className="font-bold">{est.contact_name}</h4>
                  <p className="text-sm text-muted-foreground">${est.estimated_value?.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
            {selectedEstimate && (
              <div className="flex gap-2">
                <Button onClick={() => createRetainerMutation.mutate(selectedEstimate)} className="flex-1">
                  Generate Retainer
                </Button>
                <Button variant="outline" onClick={() => setSelectedEstimate(null)}>Cancel</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}