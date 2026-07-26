import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, CheckCircle, Clock, AlertCircle, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ClientOnboardingPipeline() {
  const queryClient = useQueryClient();

  const stages = [
    { id: 'Lead', label: 'Lead', description: 'Prospect stage' },
    { id: 'Prospect', label: 'Prospect', description: 'Qualified lead' },
    { id: 'Client', label: 'Client', description: 'Agreement signed' },
    { id: 'Active', label: 'Active Client', description: 'Onboarding complete' }
  ];

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: retainers = [] } = useQuery({
    queryKey: ['retainers'],
    queryFn: () => api.entities.Retainer.list()
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.entities.Document.list()
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, status }) => api.entities.Client.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client status updated');
    }
  });

  const clientsByStage = stages.map(stage => ({
    ...stage,
    clients: clients.filter(c => c.status === stage.id)
  }));

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'Lead':
        return <Clock className="w-5 h-5" />;
      case 'Prospect':
        return <AlertCircle className="w-5 h-5" />;
      case 'Client':
        return <FileText className="w-5 h-5" />;
      case 'Active':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'Lead': 'bg-slate-50 border-slate-200',
      'Prospect': 'bg-yellow-50 border-yellow-200',
      'Client': 'bg-blue-50 border-blue-200',
      'Active': 'bg-green-50 border-green-200'
    };
    return colors[stage] || 'bg-slate-50 border-slate-200';
  };

  const getClientType = (client) => {
    return client.client_type === 'Business' ? (
      <Building2 className="w-4 h-4" />
    ) : (
      <User className="w-4 h-4" />
    );
  };

  const getDocumentsForClient = (clientId) => {
    return documents.filter(d => d.client_id === clientId);
  };

  const getRetainerForClient = (clientId) => {
    return retainers.find(r => r.client_id === clientId);
  };

  return (
    <div className="p-8 max-w-[2000px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Client Onboarding Pipeline</h1>
        <p className="text-muted-foreground">Track clients through the onboarding journey with automatic document and retainer generation</p>
      </div>

      {/* Pipeline Overview */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex gap-2">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm',
                  stage.id === 'Active' ? 'bg-green-500 border-green-600 text-white' :
                  stage.id === 'Client' ? 'bg-blue-500 border-blue-600 text-white' :
                  stage.id === 'Prospect' ? 'bg-yellow-500 border-yellow-600 text-white' :
                  'bg-slate-500 border-slate-600 text-white'
                )}>
                  {stages.indexOf(stage) + 1}
                </div>
                <p className="text-xs font-semibold mt-2 text-center w-16">{stage.label}</p>
              </div>
              {idx < stages.length - 1 && (
                <ArrowRight className="w-5 h-5 text-slate-400 mx-3 mb-6" />
              )}
            </div>
          ))}
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-navy">{clients.length}</p>
          <p className="text-sm text-muted-foreground">Total Clients</p>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {clientsByStage.map(stageData => (
          <div key={stageData.id} className={cn('rounded-lg border-2 p-4 min-h-[600px]', getStageColor(stageData.id))}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-white/50">
                {getStageIcon(stageData.id)}
              </div>
              <div>
                <h3 className="font-bold text-navy text-lg">{stageData.label}</h3>
                <p className="text-xs text-muted-foreground">{stageData.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {stageData.clients.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No clients</p>
              ) : (
                stageData.clients.map(client => {
                  const clientDocs = getDocumentsForClient(client.id);
                  const clientRetainer = getRetainerForClient(client.id);

                  return (
                    <Card key={client.id} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-3">
                          {getClientType(client)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-navy text-sm truncate">{client.legal_name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{client.primary_email}</p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span className="text-muted-foreground">
                              Documents: <span className="font-semibold">{clientDocs.length}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-muted-foreground">
                              Retainer: {clientRetainer?.status === 'signed' ? 
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 ml-1">Active</Badge> :
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 ml-1">
                                  {clientRetainer?.status || 'None'}
                                </Badge>
                              }
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {stageData.id !== 'Active' && (
                          <Button
                            onClick={() => {
                              const nextStageIdx = stages.findIndex(s => s.id === stageData.id) + 1;
                              if (nextStageIdx < stages.length) {
                                updateClientMutation.mutate({
                                  id: client.id,
                                  status: stages[nextStageIdx].id
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                          >
                            Move to {stages[stages.findIndex(s => s.id === stageData.id) + 1]?.label}
                          </Button>
                        )}
                        {stageData.id === 'Active' && (
                          <Badge className="w-full justify-center bg-green-500 text-white">Onboarding Complete</Badge>
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Documents Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-navy">{documents.length}</p>
            <p className="text-sm text-muted-foreground mt-2">Across all clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Active Retainers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-navy">
              {retainers.filter(r => r.status === 'active' || r.status === 'signed').length}
            </p>
            <p className="text-sm text-muted-foreground mt-2">Signed agreements</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-navy">
              {clients.length > 0 
                ? Math.round((clientsByStage.find(s => s.id === 'Active').clients.length / clients.length) * 100)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">Clients in Active stage</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}