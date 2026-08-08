import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, GitBranch, Clock, Users, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function WorkflowTemplates() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    service_category: '',
    steps: [{ step_number: 1, step_name: '', responsible_role: '', estimated_hours: 0, description: '' }],
    required_documents: [],
    total_estimated_hours: 0,
    is_active: true
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: () => api.entities.WorkflowTemplate.list()
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data) => api.entities.WorkflowTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflowTemplates']);
      toast.success('Workflow template created!');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create workflow: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      template_name: '',
      description: '',
      service_category: '',
      steps: [{ step_number: 1, step_name: '', responsible_role: '', estimated_hours: 0, description: '' }],
      required_documents: [],
      total_estimated_hours: 0,
      is_active: true
    });
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, {
        step_number: prev.steps.length + 1,
        step_name: '',
        responsible_role: '',
        estimated_hours: 0,
        description: ''
      }]
    }));
  };

  const removeStep = (index) => {
    const updated = formData.steps.filter((_, i) => i !== index);
    const renumbered = updated.map((step, idx) => ({ ...step, step_number: idx + 1 }));
    setFormData(prev => ({ ...prev, steps: renumbered }));
  };

  const updateStep = (index, field, value) => {
    const updated = [...formData.steps];
    updated[index][field] = value;
    setFormData(prev => ({
      ...prev,
      steps: updated,
      total_estimated_hours: updated.reduce((sum, s) => sum + (parseFloat(s.estimated_hours) || 0), 0)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createWorkflowMutation.mutate(formData);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Workflow Templates</h1>
          <p className="text-muted-foreground">
            Standardized processes linked to service delivery
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-navy hover:bg-navy-light">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workflows.map(workflow => (
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
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{workflow.description}</p>
              
              {workflow.steps && workflow.steps.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground">Process Steps:</p>
                  {workflow.steps.slice(0, 4).map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{step.step_number}.</span>
                      <span>{step.step_name}</span>
                      {step.estimated_hours > 0 && (
                        <span className="text-muted-foreground">({step.estimated_hours}h)</span>
                      )}
                    </div>
                  ))}
                  {workflow.steps.length > 4 && (
                    <p className="text-xs text-muted-foreground ml-6">
                      +{workflow.steps.length - 4} more steps
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{workflow.total_estimated_hours}h total</span>
                </div>
                {workflow.required_documents && workflow.required_documents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{workflow.required_documents.length} docs</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card className="col-span-2 border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No Workflow Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create standardized workflows for service delivery
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-navy hover:bg-navy-light">
                <Plus className="w-4 h-4 mr-2" />
                Create First Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workflow Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Service Category *</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={formData.service_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_category: e.target.value }))}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Personal Tax">Personal Tax</option>
                  <option value="Corporate Tax">Corporate Tax</option>
                  <option value="Bookkeeping">Bookkeeping</option>
                  <option value="Payroll">Payroll</option>
                  <option value="GST/HST">GST/HST</option>
                  <option value="Incorporation">Incorporation</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Consultation">Consultation</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Workflow Steps</Label>
                <Button type="button" size="sm" onClick={addStep} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {formData.steps.map((step, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-sm text-navy">{step.step_number}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Step name"
                        value={step.step_name}
                        onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                      />
                      <Input
                        placeholder="Responsible role"
                        value={step.responsible_role}
                        onChange={(e) => updateStep(index, 'responsible_role', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={step.estimated_hours}
                        onChange={(e) => updateStep(index, 'estimated_hours', e.target.value)}
                        step="0.5"
                      />
                      <Input
                        placeholder="Description"
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                      />
                    </div>
                    {formData.steps.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeStep(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Total Estimated: <span className="font-bold text-navy">{formData.total_estimated_hours}h</span>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-light">
                  Create Workflow
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}