import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle, ArrowRight, ArrowLeft, Building2, Calendar, Users, FileText,
  Sparkles, Plus, Search, ClipboardCheck
} from 'lucide-react';
import Step1Identity from '@/features/clients/components/intake/Step1Identity';
import Step2Contact from '@/features/clients/components/intake/Step2Contact';
import Step3BusinessDetails from '@/features/clients/components/intake/Step3BusinessDetails';
import Step4Services from '@/features/clients/components/intake/Step4Services';
import Step5Review from '@/features/clients/components/intake/Step5Review';
import Step6Checklist from '@/features/clients/components/intake/Step6Checklist';
import ClientCard from '@/features/clients/components/board/ClientCard';
import ClientColumn from '@/features/clients/components/board/ClientColumn';
import RecurringFollowUpModal from '@/features/clients/components/board/RecurringFollowUpModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// The forward onboarding path — the same vocabulary ClientProfile.jsx's own
// status editor uses (Active/Onboarding/Pending/Inactive/Archived), so a
// client's pipeline stage and its Profile status badge never disagree.
// Inactive/Archived are manual end-states set later from the Profile page,
// not pipeline columns — they're exits, not onboarding progress.
const PIPELINE_STAGES = [
  { id: 'Onboarding', label: 'Onboarding', color: 'bg-slate-50 border-slate-200' },
  { id: 'Pending', label: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'Active', label: 'Active', color: 'bg-green-50 border-green-200' },
];

export default function ClientOnboarding() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('form');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    client_type: 'Business',
    individual_type: '',
    business_type: '',
    legal_name: '',
    operating_name: '',
    industry: '',
    industry_custom: '',
    // Contact
    primary_contact_name: '',
    contact_person_position: '',
    contact_person_email: '',
    contact_person_phone: '',
    primary_email: '',
    primary_phone: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    preferred_contact_method: 'Email',
    preferred_office: '',
    // Business / Tax
    fiscal_year_end: '',
    business_number: '',
    gst_hst_number: '',
    pst_number: '',
    payroll_number: '',
    corp_number_federal: '',
    corp_number_provincial: '',
    number_of_shareholders: '',
    incorporation_date: '',
    number_of_employees: 0,
    annual_revenue: '',
    last_year_revenue: '',
    payroll_frequency: 'Monthly',
    previous_accountant: '',
    outstanding_issues: '',
    // Services & Lead
    services_needed: [],
    current_accounting_software: '',
    special_requirements: '',
    lead_source: 'Website',
    referral_source: '',
    urgency_level: 'This Month',
    assigned_to: '',
    desired_start_date: '',
    client_value_tier: 'New',
    status: 'Onboarding',
    onboarding_checklist: {}
  });

  const steps = [
    { number: 1, title: 'Identity', icon: Building2, component: Step1Identity },
    { number: 2, title: 'Contact', icon: Users, component: Step2Contact },
    { number: 3, title: 'Business', icon: Calendar, component: Step3BusinessDetails },
    { number: 4, title: 'Services', icon: FileText, component: Step4Services },
    { number: 5, title: 'Review', icon: CheckCircle, component: Step5Review },
    { number: 6, title: 'Checklist', icon: ClipboardCheck, component: Step6Checklist }
  ];

  const [pipelineSearch, setPipelineSearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.entities.Document.list()
  });

  const { data: retainers = [] } = useQuery({
    queryKey: ['retainers'],
    queryFn: () => api.entities.Retainer.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['documentChecklists'],
    queryFn: () => api.entities.DocumentChecklist.list()
  });

  const { data: staffUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const { data: recurringSequences = [] } = useQuery({
    queryKey: ['recurringEmailSequences'],
    queryFn: () => api.entities.RecurringEmailSequence.list(),
    retry: false,
  });

  const [recurringEmailClient, setRecurringEmailClient] = useState(null);

  const sequenceForClient = (clientId) => {
    const forClient = recurringSequences.filter((s) => s.client_id === clientId);
    if (forClient.length === 0) return null;
    const active = forClient.find((s) => s.status === 'active');
    if (active) return active;
    return [...forClient].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  };

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      // Resolve custom industry
      const resolvedData = { ...clientData };
      if (resolvedData.industry === 'Other' && resolvedData.industry_custom?.trim()) {
        resolvedData.industry = resolvedData.industry_custom.trim();
      }
      delete resolvedData.industry_custom;

      const client = await api.entities.Client.create(resolvedData);
      const currentYear = new Date().getFullYear();
      const servicePromises = [];
      
      if (clientData.services_needed.includes('Business Tax Return (T2)') || clientData.services_needed.includes('T2 Corporate Tax') || clientData.services_needed.includes('Corporate Tax')) {
        servicePromises.push(api.entities.ServiceFiling.create({
          client_id: client.id,
          service_name: 'T2 Corporate Tax Filing',
          filing_year: currentYear.toString(),
          status: 'Not Started',
          due_date: calculateT2Deadline(clientData.fiscal_year_end)
        }));
      }
      
      if (clientData.number_of_employees > 0) {
        servicePromises.push(api.entities.ServiceFiling.create({
          client_id: client.id,
          service_name: 'T4 Preparation & Filing',
          filing_year: currentYear.toString(),
          status: 'Not Started',
          due_date: `${currentYear + 1}-02-28`
        }));
      }
      
      if (clientData.gst_hst_number) {
        servicePromises.push(api.entities.ServiceFiling.create({
          client_id: client.id,
          service_name: 'GST/HST Filing',
          filing_year: currentYear.toString(),
          status: 'Not Started'
        }));
      }
      
      await Promise.all(servicePromises);
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Client onboarded successfully!');
      setActiveTab('pipeline');
      setCurrentStep(1);
      setFormData(prev => ({ ...prev, legal_name: '', primary_email: '', services_needed: [], operating_name: '', primary_contact_name: '', contact_person_email: '', contact_person_phone: '' }));
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, status }) => api.entities.Client.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  });

  const calculateT2Deadline = (fiscalYearEnd) => {
    if (!fiscalYearEnd) return null;
    const [month, day] = fiscalYearEnd.split('-');
    const currentYear = new Date().getFullYear();
    const yearEnd = new Date(currentYear, parseInt(month) - 1, parseInt(day));
    const deadline = new Date(yearEnd);
    deadline.setMonth(deadline.getMonth() + 6);
    return deadline.toISOString().split('T')[0];
  };

  const pipelineClients = clients.filter((c) =>
    !pipelineSearch ||
    c.legal_name?.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
    c.primary_email?.toLowerCase().includes(pipelineSearch.toLowerCase())
  );

  const clientsByStage = PIPELINE_STAGES.map(stage => ({
    ...stage,
    clients: pipelineClients.filter(c => c.status === stage.id)
  }));

  // A client's checklist completion is spread across each of their service
  // filings (DocumentChecklist.service_filing_id → ServiceFiling.client_id) —
  // averaged here into one number so the pipeline card can show a single,
  // meaningful progress bar instead of a raw document count.
  const checklistCompletionForClient = (clientId) => {
    const filingIds = serviceFilings.filter(f => f.client_id === clientId).map(f => f.id);
    const relevant = checklists.filter(c => filingIds.includes(c.service_filing_id));
    if (relevant.length === 0) return null;
    const avg = relevant.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / relevant.length;
    return Math.round(avg);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const clientId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const client = clients.find(c => c.id === clientId);
    if (!client || client.status === newStatus) return;
    const fromStatus = client.status;
    updateClientMutation.mutate(
      { id: clientId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`${client.legal_name} moved to "${newStatus}"`);
          api.entities.Activity.create({
            client_id: clientId,
            activity_type: 'stage_change',
            title: `Moved to "${newStatus}"`,
            from_stage: fromStatus,
            to_stage: newStatus,
            performed_by: user?.email || '',
            activity_date: new Date().toISOString()
          }).then(() => queryClient.invalidateQueries({ queryKey: ['activities', clientId] }));
        },
        onError: (error) => toast.error(error.message || 'Failed to update client status')
      }
    );
  };

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Client Onboarding</h1>
          <p className="text-muted-foreground">Streamlined intake wizard and pipeline management</p>
        </div>
        <Link to={createPageUrl('ClientDirectory')}>
          <Button variant="outline">View All Clients</Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="form" className="gap-2">
            <Plus className="w-4 h-4" />
            New Client Form
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            Pipeline ({clients.length})
          </TabsTrigger>
        </TabsList>

        {/* Onboarding Form Tab */}
        <TabsContent value="form" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Client Intake Wizard</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between mb-3">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isComplete = currentStep > step.number;
                  const isCurrent = currentStep === step.number;
                  
                  return (
                    <div key={step.number} className="flex flex-col items-center flex-1">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all',
                        isComplete ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-gradient-to-r from-primary to-purple-600 text-white scale-110' :
                        'bg-slate-200 text-slate-400'
                      )}>
                        {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <p className={cn('text-xs font-medium', isCurrent ? 'text-navy' : 'text-muted-foreground')}>
                        {step.title}
                      </p>
                    </div>
                  );
                })}
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Step {currentStep}: {steps[currentStep - 1].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CurrentStepComponent formData={formData} updateFormData={(updates) => setFormData(prev => ({ ...prev, ...updates }))} />

                <div className="flex justify-between mt-6 pt-6 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < steps.length ? (
                    <Button onClick={() => setCurrentStep(currentStep + 1)}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={() => createClientMutation.mutate(formData)} disabled={createClientMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {createClientMutation.isPending ? 'Creating...' : 'Complete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">Drag-and-drop clients through onboarding stages</p>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold text-navy">{clients.length}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {clientsByStage.find(s => s.id === 'Active')?.clients.length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Documents Received</p>
                <p className="text-2xl font-bold text-navy">{documents.length}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Active Retainers</p>
                <p className="text-2xl font-bold text-navy">
                  {retainers.filter(r => r.status === 'active' || r.status === 'signed').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {clientsByStage.map(stageData => (
                <Droppable key={stageData.id} droppableId={stageData.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      <ClientColumn stage={stageData.label} count={stageData.clients.length} isOver={snapshot.isDraggingOver}>
                        {stageData.clients.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-8">No clients</p>
                        ) : (
                          stageData.clients.map((client, index) => (
                            <Draggable key={client.id} draggableId={client.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                                  <ClientCard
                                    client={client}
                                    completionPct={checklistCompletionForClient(client.id)}
                                    filingCount={serviceFilings.filter(f => f.client_id === client.id).length}
                                    assignedStaffName={staffUsers.find(u => u.email === client.assigned_to)?.full_name}
                                    isDragging={dragSnapshot.isDragging}
                                    onClick={() => window.open(`${createPageUrl('ClientProfile')}?client=${client.id}`, '_blank')}
                                    recurringSequence={sequenceForClient(client.id)}
                                    onOpenRecurringEmail={setRecurringEmailClient}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </ClientColumn>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </TabsContent>
      </Tabs>

      <RecurringFollowUpModal
        open={!!recurringEmailClient}
        onClose={() => setRecurringEmailClient(null)}
        client={recurringEmailClient}
        sequence={recurringEmailClient ? sequenceForClient(recurringEmailClient.id) : null}
      />
    </div>
  );
}