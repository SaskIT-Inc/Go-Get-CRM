import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function Step1Identity({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-3 block">Client Type</Label>
        <RadioGroup value={formData.client_type} onValueChange={(value) => updateFormData({ client_type: value })}>
          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="Individual" id="individual" />
            <Label htmlFor="individual" className="cursor-pointer flex-1">
              <p className="font-semibold">Individual</p>
              <p className="text-sm text-muted-foreground">Personal tax filing</p>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
            <RadioGroupItem value="Business" id="business" />
            <Label htmlFor="business" className="cursor-pointer flex-1">
              <p className="font-semibold">Business</p>
              <p className="text-sm text-muted-foreground">Corporate entity</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {formData.client_type === 'Individual' && (
        <div>
          <Label>Individual Type</Label>
          <Select value={formData.individual_type} onValueChange={(value) => updateFormData({ individual_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employed">Employed</SelectItem>
              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.client_type === 'Business' && (
        <div>
          <Label>Business Type *</Label>
          <Select value={formData.business_type} onValueChange={(value) => updateFormData({ business_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Corporation">Corporation</SelectItem>
              <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
              <SelectItem value="Partnership">Partnership</SelectItem>
              <SelectItem value="Non-Profit">Non-Profit</SelectItem>
              <SelectItem value="Professional Corporation">Professional Corporation</SelectItem>
              <SelectItem value="Holding Company">Holding Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Legal Name *</Label>
        <Input
          placeholder={formData.client_type === 'Individual' ? 'Full legal name' : 'Registered business name'}
          value={formData.legal_name}
          onChange={(e) => updateFormData({ legal_name: e.target.value })}
        />
      </div>

      {formData.client_type === 'Business' && (
        <div>
          <Label>Operating Name / DBA</Label>
          <Input
            placeholder="Doing Business As (if different)"
            value={formData.operating_name}
            onChange={(e) => updateFormData({ operating_name: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}