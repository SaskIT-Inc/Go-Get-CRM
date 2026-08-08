import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertCircle, ArrowRight, FileText, Users, CheckSquare, Send, Award } from 'lucide-react';
import StageUpdateModal from '@/features/compliance/components/StageUpdateModal';

export default function FilingPipeline() {
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['filingPipelines'],
    queryFn: () => api.entities.FilingPipeline.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const stages = [
    { name: 'Client Data Collection', icon: FileText, color: 'blue' },
    { name: 'Internal Review', icon: Users, color: 'purple' },
    { name: 'Manager Approval', icon: CheckSquare, color: 'orange' },
    { name: 'CRA Submission', icon: Send, color: 'green' },
    { name: 'Final Filing Confirmation', icon: Award, color: 'teal' },
    { name: 'Completed', icon: CheckCircle, color: 'green' }
  ];

  const getStageIndex = (stageName) => {
    return stages.findIndex(s => s.name === stageName);
  };

  const getProgressPercentage = (currentStage) => {
    const index = getStageIndex(currentStage);
    return ((index + 1) / stages.length) * 100;
  };

  const activePipelines = pipelines.filter(p => p.current_stage !== 'Completed');
  const completedPipelines = pipelines.filter(p => p.current_stage === 'Completed');

  const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());

  const handleStageUpdate = (pipeline) => {
    setSelectedPipeline(pipeline);
    setShowUpdateModal(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Filing Pipeline Management</h1>
        <p className="text-muted-foreground">Track T2, T4, GST/PST filings through automated stages</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Pipelines</p>
                <p className="text-3xl font-bold text-navy">{activePipelines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                <p className="text-3xl font-bold text-orange-600">
                  {activePipelines.filter(p => p.current_stage === 'Manager Approval').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CRA Submission</p>
                <p className="text-3xl font-bold text-green-600">
                  {activePipelines.filter(p => p.current_stage === 'CRA Submission').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-teal-600">{completedPipelines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Pipelines ({activePipelines.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedPipelines.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activePipelines.map(pipeline => {
            const client = clients.find(c => c.id === pipeline.client_id);
            const filing = serviceFilings.find(f => f.id === pipeline.service_filing_id);
            const currentStageIndex = getStageIndex(pipeline.current_stage);
            const progress = getProgressPercentage(pipeline.current_stage);

            return (
              <Card key={pipeline.id} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{client?.legal_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pipeline.filing_type} - {filing?.filing_year}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 text-sm">
                      {pipeline.current_stage}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">Progress</span>
                      <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {/* Stage Timeline */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                    {stages.map((stage, idx) => {
                      const Icon = stage.icon;
                      const isComplete = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const isPending = idx > currentStageIndex;

                      return (
                        <div key={stage.name} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            isComplete ? 'bg-green-500 text-white' :
                            isCurrent ? `bg-${stage.color}-500 text-white` :
                            'bg-slate-200 text-slate-400'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <p className={`text-xs text-center font-medium ${
                            isCurrent ? 'text-navy' : 'text-muted-foreground'
                          }`}>
                            {stage.name.split(' ')[0]}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage History */}
                  {pipeline.stage_history && pipeline.stage_history.length > 0 && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Stage History:</p>
                      <div className="space-y-2">
                        {pipeline.stage_history.slice(-3).map((history, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-semibold">{history.stage}</span>
                            {' - '}
                            <span className="text-muted-foreground">
                              {new Date(history.entered_date).toLocaleDateString()}
                            </span>
                            {history.notes && (
                              <p className="text-muted-foreground ml-4">{history.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isManager && pipeline.current_stage !== 'Completed' && (
                    <Button onClick={() => handleStageUpdate(pipeline)} className="gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Advance to Next Stage
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {activePipelines.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No Active Pipelines</h3>
                <p className="text-muted-foreground">All filings are completed.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedPipelines.map(pipeline => {
            const client = clients.find(c => c.id === pipeline.client_id);
            const filing = serviceFilings.find(f => f.id === pipeline.service_filing_id);

            return (
              <Card key={pipeline.id} className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-navy text-lg">{client?.legal_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pipeline.filing_type} - {filing?.filing_year}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-semibold">Completed</span>
                        {pipeline.final_confirmation_date && (
                          <span className="text-muted-foreground">
                            on {new Date(pipeline.final_confirmation_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {pipeline.cra_confirmation_number && (
                        <p className="text-sm text-muted-foreground mt-2">
                          CRA Confirmation: {pipeline.cra_confirmation_number}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {showUpdateModal && selectedPipeline && (
        <StageUpdateModal
          pipeline={selectedPipeline}
          currentStage={selectedPipeline.current_stage}
          stages={stages}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedPipeline(null);
          }}
        />
      )}
    </div>
  );
}