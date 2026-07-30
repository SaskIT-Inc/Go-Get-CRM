import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Calendar, User, Search, Check, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientServices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [newFiling, setNewFiling] = useState({
    client_id: '',
    service_id: '',
    service_name: '',
    tax_cycle_start: '',
    tax_cycle_end: '',
    status: 'Not Started',
    due_date: '',
    assigned_to: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list()
  });

  const createFilingMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceFiling.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceFilings'] });
      setShowAddDialog(false);
      setNewFiling({
        client_id: '',
        service_id: '',
        service_name: '',
        tax_cycle_start: '',
        tax_cycle_end: '',
        status: 'Not Started',
        due_date: '',
        assigned_to: '',
        notes: ''
      });
      toast.success('Service filing created successfully');
    }
  });

  const filteredFilings = serviceFilings.filter(filing => {
    const client = clients.find(c => c.id === filing.client_id);
    const matchesSearch = !searchTerm || 
      filing.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || filing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return services;
    const term = serviceSearchTerm.toLowerCase();
    return services.filter(s =>
      s.service_name?.toLowerCase().includes(term) ||
      s.service_category?.toLowerCase().includes(term)
    );
  }, [services, serviceSearchTerm]);

  const handleCreateFiling = () => {
    const selectedService = services.find(s => s.id === newFiling.service_id);
    createFilingMutation.mutate({
      ...newFiling,
      service_name: selectedService?.service_name
    });
  };

  const statusColors = {
    'Not Started': 'bg-gray-500/10 text-gray-700 border-gray-500/20',
    'Documents Pending': 'bg-yellow/10 text-yellow-dark border-yellow/20',
    'In Progress': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    'Review': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    'Filed': 'bg-green-500/10 text-green-700 border-green-500/20',
    'Completed': 'bg-green-600/10 text-green-800 border-green-600/20'
  };

  const statusCounts = {
    all: filteredFilings.length,
    'Not Started': filteredFilings.filter(f => f.status === 'Not Started').length,
    'Documents Pending': filteredFilings.filter(f => f.status === 'Documents Pending').length,
    'In Progress': filteredFilings.filter(f => f.status === 'In Progress').length,
    'Review': filteredFilings.filter(f => f.status === 'Review').length,
    'Filed': filteredFilings.filter(f => f.status === 'Filed').length,
    'Completed': filteredFilings.filter(f => f.status === 'Completed').length
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Client Services</h1>
          <p className="text-muted-foreground">Manage service filings and track progress</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Service Filing
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by service or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                <SelectItem value="Not Started">Not Started ({statusCounts['Not Started']})</SelectItem>
                <SelectItem value="Documents Pending">Documents Pending ({statusCounts['Documents Pending']})</SelectItem>
                <SelectItem value="In Progress">In Progress ({statusCounts['In Progress']})</SelectItem>
                <SelectItem value="Review">Review ({statusCounts['Review']})</SelectItem>
                <SelectItem value="Filed">Filed ({statusCounts['Filed']})</SelectItem>
                <SelectItem value="Completed">Completed ({statusCounts['Completed']})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Filings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFilings.map(filing => {
          const client = clients.find(c => c.id === filing.client_id);
          return (
            <Card key={filing.id} className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-navy truncate">{filing.service_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{client?.legal_name}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusColors[filing.status]}>
                    {filing.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {(filing.tax_cycle_start || filing.tax_cycle_end) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Cycle:</span>
                      <span className="font-medium">{filing.tax_cycle_start || '?'} → {filing.tax_cycle_end || '?'}</span>
                    </div>
                  )}
                  {filing.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className="font-medium">
                        {new Date(filing.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {filing.assigned_to && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned:</span>
                      <span className="font-medium">{filing.assigned_to.split('@')[0]}</span>
                    </div>
                  )}
                </div>

                {filing.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{filing.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredFilings.length === 0 && (
          <div className="col-span-3">
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No Service Filings</h3>
                <p className="text-muted-foreground">No filings match your search criteria</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Service Picker Dialog */}
      <Dialog open={showServicePicker} onOpenChange={setShowServicePicker}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Service Package</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map(service => (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all ${newFiling.service_id === service.id ? 'border-navy border-2 bg-navy/5' : 'hover:border-navy'}`}
                onClick={() => {
                  setNewFiling({ ...newFiling, service_id: service.id, service_name: service.service_name });
                  setShowServicePicker(false);
                  setServiceSearchTerm('');
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-navy">{service.service_name}</h4>
                      <p className="text-xs text-muted-foreground">{service.service_category}</p>
                    </div>
                    {newFiling.service_id === service.id && (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  {service.base_price && (
                    <div className="mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-navy">${service.base_price.toFixed(2)}</span>
                      {service.estimated_hours && (
                        <span className="text-xs text-muted-foreground">({service.estimated_hours}h)</span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {service.service_frequency && (
                      <div>
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <Badge variant="secondary" className="text-xs">{service.service_frequency}</Badge>
                      </div>
                    )}
                    {service.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">{service.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No services found matching your search</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Filing Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Service Filing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={newFiling.client_id} onValueChange={(value) => setNewFiling({ ...newFiling, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => setShowServicePicker(true)}
                >
                  {newFiling.service_name || 'Select service...'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Tax Cycle Start</Label>
                <Input
                  type="date"
                  value={newFiling.tax_cycle_start}
                  onChange={(e) => setNewFiling({ ...newFiling, tax_cycle_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tax Cycle End</Label>
                <Input
                  type="date"
                  value={newFiling.tax_cycle_end}
                  onChange={(e) => setNewFiling({ ...newFiling, tax_cycle_end: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newFiling.due_date}
                  onChange={(e) => setNewFiling({ ...newFiling, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newFiling.status} onValueChange={(value) => setNewFiling({ ...newFiling, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="Documents Pending">Documents Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Filed">Filed</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newFiling.assigned_to}
                  onChange={(e) => setNewFiling({ ...newFiling, assigned_to: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newFiling.notes}
                onChange={(e) => setNewFiling({ ...newFiling, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFiling} disabled={!newFiling.client_id || !newFiling.service_id}>
              Create Filing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}