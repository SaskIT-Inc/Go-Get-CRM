import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Users, BookOpen, Briefcase, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ServiceCatalog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [taskInstructions, setTaskInstructions] = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['serviceCatalog'],
    queryFn: () => api.entities.ServiceMaster.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['catalogClients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['catalogUsers'],
    queryFn: () => api.entities.User.list()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => api.entities.TaskTemplate.list()
  });

  // Create service filing mutation
  const createFilingMutation = useMutation({
    mutationFn: async (filingData) => {
      const filing = await api.entities.ServiceFiling.create({
        service_id: filingData.service_id,
        service_name: filingData.service_name,
        client_id: filingData.client_id,
        status: 'Not Started'
      });

      // Create tasks for each assignee
      for (const assignee of filingData.assignees) {
        const taskTemplate = templates.find((t) => t.role === assignee);
        
        await api.entities.Task.create({
          title: `${filingData.service_name} - ${assignee}`,
          description: filingData.instructions || taskTemplate?.description || '',
          service_filing_id: filing.id,
          client_id: filingData.client_id,
          assigned_to: assignee,
          status: 'Not Started',
          priority: filingData.priority || 'Medium',
          estimated_hours: taskTemplate?.estimated_hours || 0
        });
      }

      return filing;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service filing created with tasks assigned',
      });
      setIsDialogOpen(false);
      setSelectedClient('');
      setSelectedAssignees([]);
      setTaskInstructions('');
      queryClient.invalidateQueries({ queryKey: ['catalogClients'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service filing',
        variant: 'destructive'
      });
    }
  });

  // Filter services based on search
  const filteredServices = useMemo(() => {
    return services.filter((service) =>
      service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.service_family && service.service_family.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [services, searchTerm]);

  const handleCreateFiling = () => {
    if (!selectedService || !selectedClient || selectedAssignees.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a service, client, and at least one team member',
        variant: 'destructive'
      });
      return;
    }

    createFilingMutation.mutate({
      service_id: selectedService.service_id,
      service_name: selectedService.service_name,
      client_id: selectedClient,
      assignees: selectedAssignees,
      instructions: taskInstructions,
      priority: selectedService.complexity || 'Medium'
    });
  };

  const toggleAssignee = (userEmail) => {
    setSelectedAssignees((prev) =>
      prev.includes(userEmail)
        ? prev.filter((e) => e !== userEmail)
        : [...prev, userEmail]
    );
  };

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Service Catalog</h1>
          <p className="text-muted-foreground">
            Browse and assign services - use Commercial Hub for estimates
          </p>
        </div>
        <Link to={createPageUrl('CommercialHub')}>
          <Button variant="outline">Commercial Hub</Button>
        </Link>
      </div>

      {/* Search Section */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by service name or family..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-6 text-lg"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No services found matching your search</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <Dialog key={service.service_id} open={selectedService?.service_id === service.service_id && isDialogOpen}>
              <DialogTrigger asChild>
                <Card
                  className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedService(service);
                    setIsDialogOpen(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-navy text-xl mb-2">
                          {service.service_name}
                        </CardTitle>
                        {service.service_family && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {service.service_family}
                          </Badge>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100">
                        <Briefcase className="w-6 h-6 text-navy" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {service.complexity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Complexity:</span>
                        <Badge
                          className={
                            service.complexity === 'High'
                              ? 'bg-red-100 text-red-800'
                              : service.complexity === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {service.complexity}
                        </Badge>
                      </div>
                    )}

                    {service.service_frequency && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Frequency:</span>
                        <span className="font-semibold text-navy">{service.service_frequency}</span>
                      </div>
                    )}

                    {service.estimate_required && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-600">Estimate Required</span>
                      </div>
                    )}

                    {service.ra_required && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-600">RA Required</span>
                      </div>
                    )}

                    <Button className="w-full mt-4 bg-navy hover:bg-navy/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Assign Service
                    </Button>
                  </CardContent>
                </Card>
              </DialogTrigger>

              {isDialogOpen && selectedService?.service_id === service.service_id && (
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-navy">
                      Assign {service.service_name} to Client
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 mt-6">
                    {/* Client Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">
                        Select Client
                      </label>
                      <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose a client..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id} className="text-slate-900 focus:bg-blue-50 focus:text-slate-900 cursor-pointer">
                              {client.legal_name || client.operating_name || client.primary_email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Team Member Assignment */}
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assign to Team Members
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {users.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => toggleAssignee(user.email)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              selectedAssignees.includes(user.email)
                                ? 'border-navy bg-blue-50'
                                : 'border-slate-200 bg-white hover:border-navy'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded border-2 ${
                                  selectedAssignees.includes(user.email)
                                    ? 'bg-navy border-navy'
                                    : 'border-slate-300'
                                }`}
                              />
                              <div>
                                <p className="font-semibold text-navy">{user.full_name}</p>
                                <p className="text-xs text-slate-500">{user.role}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Instructions */}
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Task Instructions (Optional)
                      </label>
                      <textarea
                        value={taskInstructions}
                        onChange={(e) => setTaskInstructions(e.target.value)}
                        placeholder="Add specific instructions for this service assignment..."
                        className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy text-sm"
                        rows={4}
                      />
                    </div>

                    {/* Summary */}
                    {selectedClient && selectedAssignees.length > 0 && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-navy mb-3">Service Assignment Summary</h4>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li>
                              <strong>Service:</strong> {service.service_name}
                            </li>
                            <li>
                              <strong>Client:</strong> {selectedClientData?.company_name || selectedClientData?.contact_name}
                            </li>
                            <li>
                              <strong>Team Members ({selectedAssignees.length}):</strong>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedAssignees.map((email) => {
                                  const user = users.find((u) => u.email === email);
                                  return (
                                    <Badge key={email} className="bg-navy text-white">
                                      {user?.full_name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setSelectedClient('');
                          setSelectedAssignees([]);
                          setTaskInstructions('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateFiling}
                        disabled={!selectedClient || selectedAssignees.length === 0 || createFilingMutation.isPending}
                        className="bg-navy hover:bg-navy/90 text-white"
                      >
                        {createFilingMutation.isPending ? 'Creating...' : 'Create Service Filing'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          ))
        )}
      </div>
    </div>
  );
}