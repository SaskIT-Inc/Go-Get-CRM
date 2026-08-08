import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import AddServiceModal from '@/features/clients/components/detail/AddServiceModal';
import {
  Users,
  UserPlus,
  FileText,
  CheckCircle,
  MessageSquare,
  Building2,
  User,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';

const clientModules = [
  {
    title: 'Client Onboarding',
    description: 'Streamlined intake process for new clients',
    icon: UserPlus,
    color: 'bg-green-500/10 text-green-700',
    page: 'ClientOnboarding',
    features: ['Multi-step intake', 'Business & individual', 'Service selection']
  },
  {
    title: 'Client Directory',
    description: 'Complete client database and profiles',
    icon: Users,
    color: 'bg-blue-500/10 text-blue-700',
    page: 'ClientDirectory',
    features: ['Searchable directory', 'Filter & sort', 'Quick access']
  },
  {
    title: 'Client Profile',
    description: 'Detailed client information and history',
    icon: User,
    color: 'bg-purple-500/10 text-purple-700',
    page: 'ClientProfile',
    features: ['Contact details', 'Service history', 'Documents']
  },
  {
    title: 'Client Services',
    description: 'Service filings and tracking',
    icon: FileText,
    color: 'bg-yellow/10 text-yellow-dark',
    page: 'ClientServices',
    features: ['Active filings', 'Status tracking', 'Due dates']
  },
  {
    title: 'Compliance Tracking',
    description: 'Monitor deadlines and requirements',
    icon: CheckCircle,
    color: 'bg-indigo-500/10 text-indigo-700',
    page: 'ClientCompliance',
    features: ['Filing deadlines', 'Compliance status', 'Alerts']
  },
  {
    title: 'Client Documents',
    description: 'Document management and uploads',
    icon: FileText,
    color: 'bg-red/10 text-red',
    page: 'ClientDocuments',
    features: ['Upload center', 'Document library', 'Status tracking']
  },
  {
    title: 'Communication History',
    description: 'Track all client interactions',
    icon: MessageSquare,
    color: 'bg-teal-500/10 text-teal-700',
    page: 'CommunicationHistory',
    features: ['Email logs', 'Meeting notes', 'Activity timeline']
  }
];

export default function Clients() {
  const [showAddService, setShowAddService] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const createFilingMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceFiling.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceFilings'] });
      setShowAddService(false);
      setSelectedClientId('');
      toast.success('Service added successfully');
    }
  });

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const onboardingClients = clients.filter(c => c.status === 'Onboarding').length;
  const activeFilings = serviceFilings.filter(f => !['Completed', 'Filed'].includes(f.status)).length;

  const handleAddServiceClick = () => {
    setSelectedClientId('');
    setShowClientPicker(true);
  };

  const handleClientSelected = (clientId) => {
    setSelectedClientId(clientId);
    setShowClientPicker(false);
    setShowAddService(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Client Management</h1>
          <p className="text-muted-foreground">
            Complete client lifecycle management system
          </p>
        </div>
        <Button onClick={handleAddServiceClick} className="gap-2 bg-navy text-white hover:bg-navy/90">
          <Plus className="w-4 h-4" />Add Service
        </Button>
      </div>

      {/* Client Picker Dialog */}
      <Dialog open={showClientPicker} onOpenChange={setShowClientPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-navy font-bold">Select a Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select onValueChange={handleClientSelected}>
              <SelectTrigger><SelectValue placeholder="— Pick a client —" /></SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Modal */}
      <AddServiceModal
        open={showAddService}
        onClose={() => setShowAddService(false)}
        onSave={(data) => createFilingMutation.mutate({ ...data, client_id: selectedClientId })}
        services={services}
        isSaving={createFilingMutation.isPending}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold text-navy">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-green-600">{activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboarding</p>
                <p className="text-3xl font-bold text-yellow-dark">{onboardingClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Filings</p>
                <p className="text-3xl font-bold text-purple-600">{activeFilings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientModules.map((module) => (
          <Link key={module.page} to={createPageUrl(module.page)}>
            <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <module.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-navy text-lg mb-1 group-hover:text-yellow transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Key Features:
                  </p>
                  <div className="space-y-1">
                    {module.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-navy/30" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}