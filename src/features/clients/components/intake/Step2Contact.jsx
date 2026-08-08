import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CANADIAN_PROVINCES_AND_TERRITORIES } from '@/lib/canada';

export default function Step2Contact({ formData, updateFormData }) {
  const { data: offices = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.entities.Office.list(),
  });
  const activeOffices = offices.filter((o) => o.is_active !== false);
  return (
    <div className="space-y-6">
      {/* Business Contact */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Business / Primary Contact</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Business Email *</Label>
              <Input
                type="email"
                placeholder="info@company.com"
                value={formData.primary_email}
                onChange={(e) => updateFormData({ primary_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Business Phone *</Label>
              <Input
                type="tel"
                placeholder="(306) 123-4567"
                value={formData.primary_phone}
                onChange={(e) => updateFormData({ primary_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Website</Label>
            <Input
              placeholder="https://www.example.com"
              value={formData.website || ''}
              onChange={(e) => updateFormData({ website: e.target.value })}
            />
          </div>

          <div>
            <Label>Street Address</Label>
            <Input
              placeholder="123 Main Street"
              value={formData.address}
              onChange={(e) => updateFormData({ address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => updateFormData({ city: e.target.value })}
              />
            </div>
            <div>
              <Label>Province</Label>
              <Select value={formData.province || ''} onValueChange={(value) => updateFormData({ province: value })}>
                <SelectTrigger><SelectValue placeholder="Select province..." /></SelectTrigger>
                <SelectContent>
                  {CANADIAN_PROVINCES_AND_TERRITORIES.map((province) => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input
                placeholder="S7K 1A1"
                value={formData.postal_code}
                onChange={(e) => updateFormData({ postal_code: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Person */}
      <div className="border-t pt-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Contact Person</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Contact person's full name"
                value={formData.primary_contact_name}
                onChange={(e) => updateFormData({ primary_contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Position / Title</Label>
              <Input
                placeholder="e.g. Owner, CFO, Manager"
                value={formData.contact_person_position || ''}
                onChange={(e) => updateFormData({ contact_person_position: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direct Email</Label>
              <Input
                type="email"
                placeholder="contact@company.com"
                value={formData.contact_person_email || ''}
                onChange={(e) => updateFormData({ contact_person_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Direct Phone</Label>
              <Input
                type="tel"
                placeholder="(306) 123-4567"
                value={formData.contact_person_phone || ''}
                onChange={(e) => updateFormData({ contact_person_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preferred Contact Method</Label>
              <Select value={formData.preferred_contact_method} onValueChange={(value) => updateFormData({ preferred_contact_method: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="In Person">In Person</SelectItem>
                  <SelectItem value="Online Meeting">Online Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Office</Label>
              <Select value={formData.preferred_office || ''} onValueChange={(value) => updateFormData({ preferred_office: value })}>
                <SelectTrigger><SelectValue placeholder="Select office..." /></SelectTrigger>
                <SelectContent>
                  {activeOffices.map((office) => (
                    <SelectItem key={office.id} value={office.name}>{office.name}</SelectItem>
                  ))}
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}