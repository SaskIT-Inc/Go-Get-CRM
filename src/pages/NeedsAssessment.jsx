import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ClipboardList, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_OPTIONS, MONTHLY_PACKAGES } from '@/lib/serviceCatalog';

export default function NeedsAssessment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLead, setSelectedLead] = useState('');
  const [assessmentData, setAssessmentData] = useState({
    services_needed: [],
    monthly_package: '',
    pain_points: '',
    current_situation: '',
    desired_outcomes: '',
    budget_range: '',
    timeline: '',
    decision_makers: '',
    next_steps: ''
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, data }) => api.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Needs assessment completed!');
      navigate(createPageUrl('LeadDirectory'));
    },
    onError: (error) => {
      toast.error('Failed to save assessment: ' + error.message);
    }
  });

  const handleServiceToggle = (service) => {
    setAssessmentData(prev => ({
      ...prev,
      services_needed: prev.services_needed.includes(service)
        ? prev.services_needed.filter(s => s !== service)
        : [...prev.services_needed, service]
    }));
  };

  const selectPackage = (name) => {
    setAssessmentData(prev => ({ ...prev, monthly_package: prev.monthly_package === name ? '' : name }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedLead) {
      toast.error('Please select a lead');
      return;
    }

    const payload = {
      services_interested: assessmentData.services_needed,
      notes: `NEEDS ASSESSMENT:\n\nMonthly Package Interest: ${assessmentData.monthly_package || 'None selected'}\n\nPain Points: ${assessmentData.pain_points}\n\nCurrent Situation: ${assessmentData.current_situation}\n\nDesired Outcomes: ${assessmentData.desired_outcomes}\n\nBudget: ${assessmentData.budget_range}\n\nTimeline: ${assessmentData.timeline}\n\nDecision Makers: ${assessmentData.decision_makers}\n\nNext Steps: ${assessmentData.next_steps}`,
      stage: 'Needs Assessment'
    };

    updateLeadMutation.mutate({ leadId: selectedLead, data: payload });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Link to={createPageUrl('LeadPipeline')}>
          <Button variant="outline" size="sm">View Pipeline</Button>
        </Link>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ClipboardList className="w-6 h-6 text-navy" />
            Lead Needs Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Select Lead</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedLead}
                onChange={(e) => setSelectedLead(e.target.value)}
                required
              >
                <option value="">Choose a lead...</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.contact_name} {lead.company_name && `(${lead.company_name})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label>Services Needed *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SERVICE_OPTIONS.map(service => (
                  <div key={service.name} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox
                      id={service.name}
                      className="mt-0.5"
                      checked={assessmentData.services_needed.includes(service.name)}
                      onCheckedChange={() => handleServiceToggle(service.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Label htmlFor={service.name} className="cursor-pointer text-sm font-medium leading-snug">{service.name}</Label>
                        <span className="text-xs font-bold text-navy whitespace-nowrap flex-shrink-0">{service.fee}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{service.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Monthly Package Interest (optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {MONTHLY_PACKAGES.map(pkg => {
                  const selected = assessmentData.monthly_package === pkg.name;
                  return (
                    <button
                      type="button"
                      key={pkg.name}
                      onClick={() => selectPackage(pkg.name)}
                      className={`text-left p-3 border rounded-lg transition-colors ${
                        selected ? 'border-navy bg-blue-50/60 ring-1 ring-navy' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold">{pkg.name}</span>
                        {selected ? (
                          <Check className="w-4 h-4 text-navy flex-shrink-0" />
                        ) : (
                          <span className="text-xs font-bold text-navy whitespace-nowrap">{pkg.price}</span>
                        )}
                      </div>
                      {selected && <p className="text-xs font-bold text-navy mb-1.5">{pkg.price}</p>}
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {pkg.bullets.map(b => <li key={b}>• {b}</li>)}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pain Points / Challenges</Label>
              <Textarea
                value={assessmentData.pain_points}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, pain_points: e.target.value }))}
                rows={3}
                placeholder="What problems are they trying to solve?"
              />
            </div>

            <div className="space-y-2">
              <Label>Current Situation</Label>
              <Textarea
                value={assessmentData.current_situation}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, current_situation: e.target.value }))}
                rows={3}
                placeholder="Describe their current accounting/tax situation"
              />
            </div>

            <div className="space-y-2">
              <Label>Desired Outcomes</Label>
              <Textarea
                value={assessmentData.desired_outcomes}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, desired_outcomes: e.target.value }))}
                rows={3}
                placeholder="What are they hoping to achieve?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Textarea
                  value={assessmentData.budget_range}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, budget_range: e.target.value }))}
                  rows={2}
                  placeholder="Expected budget or price range"
                />
              </div>

              <div className="space-y-2">
                <Label>Timeline</Label>
                <Textarea
                  value={assessmentData.timeline}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, timeline: e.target.value }))}
                  rows={2}
                  placeholder="When do they need services?"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Decision Makers</Label>
              <Textarea
                value={assessmentData.decision_makers}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, decision_makers: e.target.value }))}
                rows={2}
                placeholder="Who will be making the final decision?"
              />
            </div>

            <div className="space-y-2">
              <Label>Recommended Next Steps</Label>
              <Textarea
                value={assessmentData.next_steps}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, next_steps: e.target.value }))}
                rows={3}
                placeholder="What should happen next?"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateLeadMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg"
              >
                {updateLeadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Complete Assessment
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