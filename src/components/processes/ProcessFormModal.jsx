import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_TYPES = [
  'T2 Corporate Tax Filing',
  'GST/HST Filing',
  'PST Filing',
  'T4 Preparation & Filing',
  'T4A Preparation & Filing',
  'T5 Preparation & Filing',
  'ROE Submission',
  'Incorporation',
  'Annual Return Filing',
  'Financial Reporting',
  'Bookkeeping',
  'Payroll Processing',
  'Personal Tax Return',
  'Other'
];

const FREQUENCIES = ['One-Time', 'Monthly', 'Quarterly', 'Annual', 'As Needed'];

export default function ProcessFormModal({ isOpen, onClose, process }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(process || {
    process_name: '',
    service_type: '',
    frequency: 'One-Time',
    process_steps: [],
    total_estimated_time: 0,
    required_roles: [],
    deadline_offset_days: 30,
    is_active: true
  });

  const [newStep, setNewStep] = useState({ step_title: '', instructions: '', estimated_time: 0, required_documents: [] });
  const [newRole, setNewRole] = useState('');
  const [newDoc, setNewDoc] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (process?.id) {
        return api.entities.ProcessTemplate.update(process.id, data);
      }
      return api.entities.ProcessTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processTemplates'] });
      toast.success(process ? 'Process updated' : 'Process created');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save process');
    }
  });

  const addStep = () => {
    if (!newStep.step_title) {
      toast.error('Step title is required');
      return;
    }
    const stepToAdd = {
      step_number: (formData.process_steps?.length || 0) + 1,
      ...newStep,
      required_documents: newStep.required_documents || []
    };
    setFormData({
      ...formData,
      process_steps: [...(formData.process_steps || []), stepToAdd],
      total_estimated_time: (formData.total_estimated_time || 0) + (newStep.estimated_time || 0)
    });
    setNewStep({ step_title: '', instructions: '', estimated_time: 0, required_documents: [] });
  };

  const removeStep = (index) => {
    const stepsArray = formData.process_steps || [];
    setFormData({
      ...formData,
      process_steps: stepsArray.filter((_, i) => i !== index),
      total_estimated_time: Math.max(0, (formData.total_estimated_time || 0) - (stepsArray[index]?.estimated_time || 0))
    });
  };

  const addRole = () => {
    if (!newRole) return;
    setFormData({
      ...formData,
      required_roles: [...(formData.required_roles || []), newRole]
    });
    setNewRole('');
  };

  const removeRole = (role) => {
    setFormData({
      ...formData,
      required_roles: (formData.required_roles || []).filter(r => r !== role)
    });
  };

  const addDoc = () => {
    if (!newDoc) return;
    setNewStep({
      ...newStep,
      required_documents: [...(newStep.required_documents || []), newDoc]
    });
    setNewDoc('');
  };

  const removeDoc = (doc) => {
    setNewStep({
      ...newStep,
      required_documents: (newStep.required_documents || []).filter(d => d !== doc)
    });
  };

  const handleSave = () => {
    if (!formData.process_name || !formData.service_type) {
      toast.error('Process name and service type are required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{process ? 'Edit Process' : 'Create New Process'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div>
              <Label>Process Name</Label>
              <Input
                value={formData.process_name}
                onChange={(e) => setFormData({ ...formData, process_name: e.target.value })}
                placeholder="e.g., T2 Corporate Tax Filing"
              />
            </div>

            <div>
              <Label>Service Type</Label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deadline Offset (days)</Label>
                <Input
                  type="number"
                  value={formData.deadline_offset_days}
                  onChange={(e) => setFormData({ ...formData, deadline_offset_days: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Required Roles */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Required Roles</h3>
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g., CPA, Manager"
                onKeyPress={(e) => e.key === 'Enter' && addRole()}
              />
              <Button onClick={addRole} size="sm" variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.required_roles || []).map((role) => (
                <Badge key={role} variant="secondary" className="cursor-pointer" onClick={() => removeRole(role)}>
                  {role} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Process Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Process Steps ({formData.process_steps?.length || 0})</h3>
            
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label>Step Title</Label>
                <Input
                  value={newStep.step_title}
                  onChange={(e) => setNewStep({ ...newStep, step_title: e.target.value })}
                  placeholder="e.g., Collect client documents"
                />
              </div>

              <div>
                <Label>Instructions</Label>
                <Input
                  value={newStep.instructions}
                  onChange={(e) => setNewStep({ ...newStep, instructions: e.target.value })}
                  placeholder="Detailed instructions for this step"
                />
              </div>

              <div>
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  value={newStep.estimated_time}
                  onChange={(e) => setNewStep({ ...newStep, estimated_time: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Required Documents</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    placeholder="e.g., T1 General, Notice of Assessment"
                    onKeyPress={(e) => e.key === 'Enter' && addDoc()}
                  />
                  <Button onClick={addDoc} size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(newStep.required_documents || []).map((doc) => (
                    <Badge key={doc} variant="outline" className="cursor-pointer" onClick={() => removeDoc(doc)}>
                      {doc} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={addStep} className="w-full" size="sm">Add Step</Button>
            </div>

            {/* Added Steps List */}
            <div className="space-y-2">
              {(formData.process_steps || []).map((step, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.step_number}. {step.step_title}</p>
                    <p className="text-xs text-muted-foreground">{step.instructions}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ⏱ {step.estimated_time}h {step.required_documents?.length > 0 && `• ${step.required_documents.length} doc(s)`}
                    </p>
                  </div>
                  <Button onClick={() => removeStep(idx)} size="sm" variant="ghost">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Total Estimated Time */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm"><span className="font-semibold">Total Estimated Time:</span> {formData.total_estimated_time} hours</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Process'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}