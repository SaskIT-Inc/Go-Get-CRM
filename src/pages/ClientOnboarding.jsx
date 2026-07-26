import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, ArrowRight, ArrowLeft, Building2, Calendar, Users, FileText, 
  Sparkles, Plus, Clock, AlertCircle, User, ClipboardCheck
} from 'lucide-react';
import Step1Identity from '@/components/intake/Step1Identity';
import Step2Contact from '@/components/intake/Step2Contact';
import Step3BusinessDetails from '@/components/intake/Step3BusinessDetails';
import Step4Services from '@/components/intake/Step4Services';
import Step5Review from '@/components/intake/Step5Review';
import Step6Checklist from '@/components/intake/Step6Checklist';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const stages = [
    { id: 'Lead', label: 'Lead', color: 'bg-slate-50 border-slate-200' },
    { id: 'Prospect', label: 'Prospect', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'Client', label: 'Client', color: 'bg-blue-50 border-blue-200' },
    { id: 'Active', label: 'Active', color: 'bg-green-50 border-green-200' }
  ];

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
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Client status updated');
    }
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

  const clientsByStage = stages.map(stage => ({
    ...stage,
    clients: clients.filter(c => c.status === stage.id)
  }));

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
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
        <TabsContent value="pipeline" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center">
                  <div className="text-center">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm',
                      stage.id === 'Active' ? 'bg-green-500 border-green-600 text-white' :
                      stage.id === 'Client' ? 'bg-blue-500 border-blue-600 text-white' :
                      stage.id === 'Prospect' ? 'bg-yellow-500 border-yellow-600 text-white' :
                      'bg-slate-500 border-slate-600 text-white'
                    )}>
                      {idx + 1}
                    </div>
                    <p className="text-xs font-semibold mt-1">{stage.label}</p>
                  </div>
                  {idx < stages.length - 1 && <ArrowRight className="w-4 h-4 text-slate-400 mx-2" />}
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-navy">{clients.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {clientsByStage.map(stageData => (
              <div key={stageData.id} className={cn('rounded-lg border-2 p-4 min-h-[500px]', stageData.color)}>
                <h3 className="font-bold text-navy mb-4">{stageData.label} ({stageData.clients.length})</h3>

                <div className="space-y-3">
                  {stageData.clients.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No clients</p>
                  ) : (
                    stageData.clients.map(client => {
                      const clientDocs = documents.filter(d => d.client_id === client.id);
                      const clientRetainer = retainers.find(r => r.client_id === client.id);

                      return (
                        <Card key={client.id} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2 mb-2">
                              {client.client_type === 'Business' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{client.legal_name}</h4>
                                <p className="text-xs text-muted-foreground truncate">{client.primary_email}</p>
                              </div>
                            </div>

                            <div className="space-y-1 mb-3 text-xs">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                <span>Docs: {clientDocs.length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" />
                                <span>Retainer: {clientRetainer?.status || 'None'}</span>
                              </div>
                            </div>

                            {stageData.id !== 'Active' && (
                              <Button
                                onClick={() => {
                                  const nextStageIdx = stages.findIndex(s => s.id === stageData.id) + 1;
                                  if (nextStageIdx < stages.length) {
                                    updateClientMutation.mutate({ id: client.id, status: stages[nextStageIdx].id });
                                  }
                                }}
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                              >
                                Move to {stages[stages.findIndex(s => s.id === stageData.id) + 1]?.label}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-navy">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-navy">
                  {retainers.filter(r => r.status === 'active' || r.status === 'signed').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Retainers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-navy">
                  {clients.length > 0 ? Math.round((clientsByStage.find(s => s.id === 'Active').clients.length / clients.length) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}