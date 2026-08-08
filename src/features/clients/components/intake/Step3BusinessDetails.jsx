import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Step3BusinessDetails({ formData, updateFormData }) {
  const { data: provincialTax = [] } = useQuery({
    queryKey: ['provincialTax'],
    queryFn: () => api.provincialTax.list(),
    staleTime: 60 * 60 * 1000, // this is federal/provincial law, not per-firm data — safe to cache long
  });
  const { data: industries = [] } = useQuery({
    queryKey: ['industryTypes'],
    queryFn: () => api.entities.IndustryType.filter({ is_active: true }),
  });
  const provinceTaxInfo = provincialTax.find((p) => p.province === formData.province);
  const provincialCorpLabel = provinceTaxInfo
    ? `Corp Number — Provincial (${provinceTaxInfo.abbreviation})`
    : 'Corp Number — Provincial';

  return (
    <div className="space-y-6">
      {/* Industry */}
      <div>
        <Label>Industry / Business Type</Label>
        <Select value={formData.industry || ''} onValueChange={(value) => updateFormData({ industry: value })}>
          <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {industries.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {formData.industry === 'Other' && (
          <Input
            className="mt-2"
            placeholder="Specify your industry..."
            value={formData.industry_custom || ''}
            onChange={(e) => updateFormData({ industry_custom: e.target.value })}
          />
        )}
      </div>

      {formData.client_type === 'Business' && (
        <>
          {/* Tax Numbers */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">CRA & Registration Numbers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Number (BN)</Label>
                <Input
                  placeholder="123456789RC0001"
                  value={formData.business_number}
                  onChange={(e) => updateFormData({ business_number: e.target.value })}
                />
              </div>
              <div>
                <Label>GST/HST Number</Label>
                <Input
                  placeholder="123456789RT0001"
                  value={formData.gst_hst_number}
                  onChange={(e) => updateFormData({ gst_hst_number: e.target.value })}
                />
              </div>
              {(!formData.province || provinceTaxInfo?.sales_tax_number_label) && (
                <div>
                  <Label>{provinceTaxInfo?.sales_tax_number_label || 'Provincial Sales Tax Number'}</Label>
                  <Input
                    placeholder={
                      provinceTaxInfo
                        ? `${provinceTaxInfo.sales_tax_number_label} registration number`
                        : 'Select a province in the Contact step first'
                    }
                    value={formData.pst_number || ''}
                    onChange={(e) => updateFormData({ pst_number: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>Payroll Account Number</Label>
                <Input
                  placeholder="123456789RP0001"
                  value={formData.payroll_number || ''}
                  onChange={(e) => updateFormData({ payroll_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Corp Number — Federal</Label>
                <Input
                  placeholder="Federal incorporation #"
                  value={formData.corp_number_federal || ''}
                  onChange={(e) => updateFormData({ corp_number_federal: e.target.value })}
                />
              </div>
              <div>
                <Label>{provincialCorpLabel}</Label>
                <Input
                  placeholder={provinceTaxInfo ? `${provinceTaxInfo.abbreviation} corporation #` : 'Provincial corporation #'}
                  value={formData.corp_number_provincial || ''}
                  onChange={(e) => updateFormData({ corp_number_provincial: e.target.value })}
                />
              </div>
              <div>
                <Label>Number of Shareholders</Label>
                <Input
                  placeholder="e.g. 2"
                  value={formData.number_of_shareholders || ''}
                  onChange={(e) => updateFormData({ number_of_shareholders: e.target.value })}
                />
              </div>
              <div>
                <Label>Fiscal Year End</Label>
                <Input
                  type="text"
                  placeholder="MM-DD (e.g., 12-31)"
                  value={formData.fiscal_year_end}
                  onChange={(e) => updateFormData({ fiscal_year_end: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Incorporation Date</Label>
                <Input
                  type="date"
                  value={formData.incorporation_date}
                  onChange={(e) => updateFormData({ incorporation_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Employees */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Employees & Payroll</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number of Employees</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.number_of_employees}
                  onChange={(e) => updateFormData({ number_of_employees: parseInt(e.target.value) || 0 })}
                />
              </div>
              {formData.number_of_employees > 0 && (
                <div>
                  <Label>Payroll Frequency</Label>
                  <Select value={formData.payroll_frequency} onValueChange={(value) => updateFormData({ payroll_frequency: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="Semi-Monthly">Semi-Monthly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Revenue */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Financial Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Annual Revenue (Estimate)</Label>
            <Select value={formData.annual_revenue} onValueChange={(value) => updateFormData({ annual_revenue: value })}>
              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Under $50K">Under $50K</SelectItem>
                <SelectItem value="$50K-$100K">$50K - $100K</SelectItem>
                <SelectItem value="$100K-$250K">$100K - $250K</SelectItem>
                <SelectItem value="$250K-$500K">$250K - $500K</SelectItem>
                <SelectItem value="$500K-$1M">$500K - $1M</SelectItem>
                <SelectItem value="Over $1M">Over $1M</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Last Year's Revenue</Label>
            <Input
              placeholder="e.g. $250,000"
              value={formData.last_year_revenue || ''}
              onChange={(e) => updateFormData({ last_year_revenue: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Previous Accountant / Issues */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">History</h3>
        <div className="space-y-4">
          <div>
            <Label>Previous Accountant / Firm</Label>
            <Input
              placeholder="Name of previous accountant or firm"
              value={formData.previous_accountant || ''}
              onChange={(e) => updateFormData({ previous_accountant: e.target.value })}
            />
          </div>
          <div>
            <Label>Outstanding Tax / Compliance Issues</Label>
            <Textarea
              placeholder="Any outstanding CRA issues, unfiled returns, penalties, etc."
              value={formData.outstanding_issues || ''}
              onChange={(e) => updateFormData({ outstanding_issues: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}