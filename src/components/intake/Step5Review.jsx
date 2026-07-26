import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="border-b pb-3">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export default function Step5Review({ formData }) {
  const resolvedIndustry = formData.industry === 'Other' && formData.industry_custom
    ? formData.industry_custom
    : formData.industry;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-900">Ready to Complete</p>
          <p className="text-sm text-green-700 mt-1">
            Review your information below. Upon completion, we'll automatically:
          </p>
          <ul className="text-sm text-green-700 mt-2 ml-4 space-y-1">
            <li>• Create the client profile</li>
            <li>• Generate required service filings based on selections</li>
            <li>• Set up document checklists</li>
            <li>• Initialize filing pipelines for T2, T4, and GST/PST</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">

        {/* Identity */}
        <div className="space-y-3 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity</h3>
        </div>
        <Row label="Client Type" value={[formData.client_type, formData.business_type || formData.individual_type].filter(Boolean).join(' — ')} />
        <Row label="Legal Name" value={formData.legal_name} />
        <Row label="Operating / DBA Name" value={formData.operating_name} />
        <Row label="Industry" value={resolvedIndustry} />

        {/* Contact */}
        <div className="space-y-3 md:col-span-2 border-t pt-3 mt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact</h3>
        </div>
        <Row label="Contact Person" value={[formData.primary_contact_name, formData.contact_person_position].filter(Boolean).join(', ')} />
        <Row label="Business Email" value={formData.primary_email} />
        <Row label="Business Phone" value={formData.primary_phone} />
        <Row label="Direct Email" value={formData.contact_person_email} />
        <Row label="Direct Phone" value={formData.contact_person_phone} />
        <Row label="Website" value={formData.website} />
        <Row label="Address" value={[formData.address, formData.city, formData.province, formData.postal_code].filter(Boolean).join(', ')} />
        <Row label="Preferred Contact" value={formData.preferred_contact_method} />
        <Row label="Preferred Office" value={formData.preferred_office} />

        {/* Business / Tax */}
        <div className="space-y-3 md:col-span-2 border-t pt-3 mt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Business & Tax Numbers</h3>
        </div>
        <Row label="Fiscal Year End" value={formData.fiscal_year_end} />
        <Row label="Incorporation Date" value={formData.incorporation_date} />
        <Row label="Business Number (BN)" value={formData.business_number} />
        <Row label="GST/HST Number" value={formData.gst_hst_number} />
        <Row label="PST Number" value={formData.pst_number} />
        <Row label="Payroll Account #" value={formData.payroll_number} />
        <Row label="Corp Number — Federal" value={formData.corp_number_federal} />
        <Row label="Corp Number — SK" value={formData.corp_number_provincial} />
        <Row label="Number of Shareholders" value={formData.number_of_shareholders} />
        <Row label="Employees" value={formData.number_of_employees > 0 ? `${formData.number_of_employees} (${formData.payroll_frequency} payroll)` : null} />
        <Row label="Annual Revenue" value={formData.annual_revenue} />
        <Row label="Last Year Revenue" value={formData.last_year_revenue} />
        <Row label="Previous Accountant" value={formData.previous_accountant} />
        {formData.outstanding_issues && (
          <div className="border-b pb-3 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-1">Outstanding Issues</p>
            <p className="font-semibold text-sm">{formData.outstanding_issues}</p>
          </div>
        )}

        {/* Services */}
        <div className="space-y-3 md:col-span-2 border-t pt-3 mt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Services & Lead Info</h3>
        </div>
        {formData.services_needed?.length > 0 && (
          <div className="border-b pb-3 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-2">Services Needed</p>
            <div className="flex flex-wrap gap-2">
              {formData.services_needed.map(service => (
                <Badge key={service} variant="outline" className="bg-blue-50">{service}</Badge>
              ))}
            </div>
          </div>
        )}
        <Row label="Monthly Package" value={formData.monthly_package} />
        <Row label="Lead Source" value={formData.lead_source} />
        <Row label="Referral Source" value={formData.referral_source} />
        <Row label="Urgency Level" value={formData.urgency_level} />
        <Row label="Assigned To" value={formData.assigned_to} />
        <Row label="Desired Start Date" value={formData.desired_start_date} />
        <Row label="Client Value Tier" value={formData.client_value_tier} />
        <Row label="Accounting Software" value={formData.current_accounting_software} />
        {formData.special_requirements && (
          <div className="border-b pb-3 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-1">Special Requirements</p>
            <p className="text-sm">{formData.special_requirements}</p>
          </div>
        )}
      </div>
    </div>
  );
}