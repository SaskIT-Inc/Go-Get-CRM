import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadCapture() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const [formData, setFormData] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    lead_type: 'Individual',
    pipeline_type: 'Hot Lead',
    lead_source: 'Website',
    referral_source: '',
    services_interested: [],
    estimated_value: '',
    urgency: 'This Month',
    notes: '',
    next_follow_up: '',
    assigned_to: '',
    create_task: false,
    task_title: '',
    task_description: ''
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => api.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => api.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Lead created successfully!');
      navigate(createPageUrl('LeadDirectory'));
    },
    onError: (error) => {
      toast.error('Failed to create lead: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      contact_name: formData.contact_name,
      company_name: formData.company_name,
      email: formData.email,
      phone: formData.phone,
      lead_type: formData.lead_type,
      pipeline_type: formData.pipeline_type,
      lead_source: formData.lead_source,
      referral_source: formData.referral_source,
      services_interested: formData.services_interested,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : 0,
      urgency: formData.urgency,
      notes: formData.notes,
      next_follow_up: formData.next_follow_up,
      stage: 'New Lead',
      probability: 10,
      assigned_to: formData.assigned_to || user?.email
    };

    createLeadMutation.mutate(payload, {
      onSuccess: (leadData) => {
        if (formData.create_task && formData.task_title) {
          const taskPayload = {
            title: formData.task_title,
            description: formData.task_description,
            status: 'Not Started',
            priority: 'High',
            assigned_to: formData.assigned_to || user?.email,
            tags: ['lead-followup'],
            notes: `Follow up on lead: ${formData.contact_name}`
          };
          createTaskMutation.mutate(taskPayload);
        }
      }
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Link to={createPageUrl('LeadDirectory')}>
            <Button variant="outline" size="sm">View Directory</Button>
          </Link>
          <Link to={createPageUrl('LeadPipeline')}>
            <Button variant="outline" size="sm">Pipeline</Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="w-6 h-6 text-navy" />
            Capture New Lead
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-navy">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Pipeline Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-navy">Pipeline</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('pipeline_type', 'Hot Lead')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    formData.pipeline_type === 'Hot Lead'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                  }`}
                >
                  🔥 Hot Lead (Website Inquiry)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('pipeline_type', 'Cold Lead')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    formData.pipeline_type === 'Cold Lead'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  🧊 Cold Lead (Outreach)
                </button>
              </div>
            </div>

            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-navy">Lead Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_type">Lead Type *</Label>
                  <Select value={formData.lead_type} onValueChange={(value) => handleChange('lead_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead_source">Lead Source *</Label>
                  <Select value={formData.lead_source} onValueChange={(value) => handleChange('lead_source', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Existing Client">Existing Client</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.lead_source === 'Referral' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="referral_source">Referral Source</Label>
                    <Input
                      id="referral_source"
                      value={formData.referral_source}
                      onChange={(e) => handleChange('referral_source', e.target.value)}
                      placeholder="Who referred this lead?"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="estimated_value">Estimated Value ($)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => handleChange('estimated_value', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immediate">Immediate</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Future Planning">Future Planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="next_follow_up">Next Follow-Up Date</Label>
                  <Input
                    id="next_follow_up"
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => handleChange('next_follow_up', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Assignment & Task Section */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
              <h3 className="font-semibold text-navy">Assignment & Follow-up</h3>
              
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign to Team Member</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => handleChange('assigned_to', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-3 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create_task"
                    checked={formData.create_task}
                    onChange={(e) => handleChange('create_task', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="create_task" className="font-semibold cursor-pointer">Create Follow-up Task</Label>
                </div>

                {formData.create_task && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary">
                    <div className="space-y-2">
                      <Label htmlFor="task_title">Task Title *</Label>
                      <Input
                        id="task_title"
                        value={formData.task_title}
                        onChange={(e) => handleChange('task_title', e.target.value)}
                        placeholder="e.g., Contact lead and schedule call"
                        required={formData.create_task}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task_description">Task Description</Label>
                      <Textarea
                        id="task_description"
                        value={formData.task_description}
                        onChange={(e) => handleChange('task_description', e.target.value)}
                        placeholder="Additional details for this task..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                placeholder="Additional information about this lead..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLeadMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg"
              >
                {createLeadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Lead
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}