import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GitBranch, Clock, CheckCircle, Edit, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ProcessFormModal from '@/features/processes/components/ProcessFormModal';

export default function Processes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: workflowTemplates = [] } = useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: () => api.entities.WorkflowTemplate.list()
  });

  const { data: processTemplates = [] } = useQuery({
    queryKey: ['processTemplates'],
    queryFn: () => api.entities.ProcessTemplate.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (item) => {
      if (item.process_name) {
        return api.entities.ProcessTemplate.delete(item.id);
      }
      return api.entities.WorkflowTemplate.delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
      toast.success('Item deleted');
      setDeleteDialogOpen(false);
      setProcessToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    }
  });

  const handleEditProcess = (process) => {
    setSelectedProcess(process);
    setModalOpen(true);
  };

  const handleCreateProcess = () => {
    setSelectedProcess(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProcess(null);
  };

  const handleDeleteProcess = (process) => {
    setProcessToDelete(process);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (processToDelete) {
      deleteMutation.mutate(processToDelete.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Workflow Processes</h1>
          <p className="text-muted-foreground">
            Standard workflow templates and automation processes
          </p>
        </div>
        <Button onClick={handleCreateProcess} className="gap-2">
          <Plus className="w-4 h-4" />
          New Process
        </Button>
      </div>

      {/* Process Templates */}
      {processTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-navy mb-4">Process Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processTemplates.map(process => (
              <Card key={process.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <GitBranch className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{process.process_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{process.service_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={process.is_active ? 'default' : 'secondary'}>
                        {process.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditProcess(process)}
                        className="gap-1"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteProcess(process)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-muted-foreground">Frequency:</span>
                      <Badge variant="outline">{process.frequency}</Badge>
                    </div>

                    {process.process_steps && process.process_steps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Steps ({process.process_steps.length}):</p>
                        {process.process_steps.slice(0, 2).map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm ml-2">
                            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span>{step.step_title}</span>
                          </div>
                        ))}
                        {process.process_steps.length > 2 && (
                          <p className="text-xs text-muted-foreground ml-6">
                            +{process.process_steps.length - 2} more steps
                          </p>
                        )}
                      </div>
                    )}

                    {process.total_estimated_time && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Est. {process.total_estimated_time} hours</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Templates */}
      {workflowTemplates.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-navy mb-4">Workflow Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflowTemplates.map(workflow => (
              <Card key={workflow.id} className="border-none shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <GitBranch className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{workflow.template_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{workflow.service_category}</p>
                      </div>
                    </div>
                    <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProcess(workflow)}
                      className="gap-1"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteProcess(workflow)}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{workflow.description}</p>
                  
                  {workflow.steps && workflow.steps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Workflow Steps:</p>
                      {workflow.steps.slice(0, 3).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{step.step_name}</span>
                        </div>
                      ))}
                      {workflow.steps.length > 3 && (
                        <p className="text-xs text-muted-foreground ml-6">
                          +{workflow.steps.length - 3} more steps
                        </p>
                      )}
                    </div>
                  )}

                  {workflow.total_estimated_hours && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Est. {workflow.total_estimated_hours} hours</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {processTemplates.length === 0 && workflowTemplates.length === 0 && (
        <Card className="col-span-2 border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No Processes Available</h3>
            <p className="text-muted-foreground">
              Create a new process to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <ProcessFormModal isOpen={modalOpen} onClose={handleCloseModal} process={selectedProcess} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Process?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{processToDelete?.process_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}