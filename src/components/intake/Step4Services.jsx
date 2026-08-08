import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';
import { SERVICE_OPTIONS as serviceOptions, MONTHLY_PACKAGES as monthlyPackages } from '@/lib/serviceCatalog';

export default function Step4Services({ formData, updateFormData }) {
  const { data: users = [] } = useQuery({
    queryKey: ['catalogUsers'],
    queryFn: () => api.entities.User.list(),
  });
  const activeStaff = users.filter((u) => u.is_active !== false);

  const toggleService = (service) => {
    const current = formData.services_needed || [];
    if (current.includes(service)) {
      updateFormData({ services_needed: current.filter(s => s !== service) });
    } else {
      updateFormData({ services_needed: [...current, service] });
    }
  };

  const selectPackage = (name) => {
    updateFormData({ monthly_package: formData.monthly_package === name ? '' : name });
  };

  return (
    <div className="space-y-6">
      {/* Services Needed */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Services Needed</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceOptions.map(service => (
            <div key={service.name} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-slate-50">
              <Checkbox
                id={service.name}
                className="mt-0.5"
                checked={(formData.services_needed || []).includes(service.name)}
                onCheckedChange={() => toggleService(service.name)}
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

      {/* Monthly Package */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Monthly Package (optional)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {monthlyPackages.map(pkg => {
            const selected = formData.monthly_package === pkg.name;
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

      {/* Lead Info */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Lead & Assignment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Lead Source</Label>
            <Select value={formData.lead_source || ''} onValueChange={(value) => updateFormData({ lead_source: value })}>
              <SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
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
          <div>
            <Label>Referral Source</Label>
            <Input
              placeholder="Who referred them?"
              value={formData.referral_source || ''}
              onChange={(e) => updateFormData({ referral_source: e.target.value })}
            />
          </div>
          <div>
            <Label>Urgency Level</Label>
            <Select value={formData.urgency_level || 'This Month'} onValueChange={(value) => updateFormData({ urgency_level: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Immediate">Immediate</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="Future Planning">Future Planning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned To</Label>
            <Select value={formData.assigned_to || ''} onValueChange={(value) => updateFormData({ assigned_to: value })}>
              <SelectTrigger><SelectValue placeholder="— Unassigned —" /></SelectTrigger>
              <SelectContent>
                {activeStaff.map((member) => (
                  <SelectItem key={member.id} value={member.email}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Desired Start Date</Label>
            <Input
              type="date"
              value={formData.desired_start_date || ''}
              onChange={(e) => updateFormData({ desired_start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Client Value Tier</Label>
            <Select value={formData.client_value_tier || 'New'} onValueChange={(value) => updateFormData({ client_value_tier: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High Value">High Value</SelectItem>
                <SelectItem value="Medium Value">Medium Value</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="New">New</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Software & Notes */}
      <div className="border-t pt-4">
        <div className="space-y-4">
          <div>
            <Label>Current Accounting Software</Label>
            <Input
              placeholder="QuickBooks, Xero, Sage, etc."
              value={formData.current_accounting_software}
              onChange={(e) => updateFormData({ current_accounting_software: e.target.value })}
            />
          </div>
          <div>
            <Label>Special Requirements or Notes</Label>
            <Textarea
              placeholder="Any specific needs, preferences, or additional information..."
              value={formData.special_requirements}
              onChange={(e) => updateFormData({ special_requirements: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}