import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CHECKLIST_SECTIONS = [
  {
    title: 'Engagement & Scope',
    items: [
      { key: 'engagement_letter_signed', label: 'Engagement letter signed by client', required: true },
      { key: 'scope_of_services_confirmed', label: 'Scope of services confirmed and documented', required: true },
      { key: 'fee_agreement_confirmed', label: 'Fee agreement reviewed and confirmed', required: true },
    ]
  },
  {
    title: 'Entity File & Identification',
    items: [
      { key: 'id_collected', label: 'Government-issued ID collected (photo ID)', required: true },
      { key: 'authorizing_personnel_identified', label: 'Authorizing personnel identified and documented', required: true },
      { key: 'beneficial_owners_identified', label: 'Beneficial owners identified (if applicable)', required: false },
      { key: 'articles_of_incorporation', label: 'Articles of incorporation obtained (corporations)', required: false },
    ]
  },
  {
    title: 'CRA & Tax Accounts',
    items: [
      { key: 'business_number_verified', label: 'CRA Business Number (BN) verified', required: true },
      { key: 'gst_hst_registered', label: 'GST/HST registration confirmed or applied', required: false },
      { key: 'payroll_account_setup', label: 'Payroll program account set up (if employees)', required: false },
      { key: 'cra_my_business_access', label: 'CRA My Business Account access obtained', required: false },
    ]
  },
  {
    title: 'Provincial & Regulatory',
    items: [
      { key: 'pst_registered', label: 'Provincial sales tax (PST/RST/QST) registration confirmed or applied, if applicable', required: false },
      { key: 'wcb_registered', label: "Workers' compensation board account confirmed, if applicable", required: false },
      { key: 'annual_return_reviewed', label: "Annual return filing status reviewed (provincial corporate registry)", required: false },
    ]
  },
  {
    title: 'Access & Authorizations',
    items: [
      { key: 'rep_auth_submitted', label: 'CRA Representative Authorization (T1013/AUT-01) submitted', required: true },
      { key: 'accounting_software_access', label: 'Accounting software access granted', required: false },
      { key: 'bank_statements_access', label: 'Bank statement access / bank feeds connected', required: false },
    ]
  },
  {
    title: 'Records & Books',
    items: [
      { key: 'prior_year_returns', label: 'Prior year tax returns obtained', required: false },
      { key: 'prior_accountant_records', label: 'Records requested from previous accountant', required: false },
      { key: 'chart_of_accounts_setup', label: 'Chart of accounts set up / reviewed', required: false },
      { key: 'opening_balances_entered', label: 'Opening balances entered', required: false },
    ]
  },
  {
    title: 'Payroll Setup',
    items: [
      { key: 'employee_list_received', label: 'Employee list and details received', required: false },
      { key: 'td1_forms_collected', label: 'TD1 forms collected for all employees', required: false },
      { key: 'direct_deposit_info', label: 'Direct deposit banking information collected', required: false },
    ]
  },
  {
    title: 'Compliance & Final Sign-Off',
    items: [
      { key: 'pipeda_privacy_consent', label: 'PIPEDA privacy consent obtained', required: true },
      { key: 'compliance_calendar_set', label: 'Compliance/filing calendar set up for client', required: true },
      { key: 'welcome_package_sent', label: 'Welcome package sent to client', required: false },
      { key: 'onboarding_complete', label: 'Onboarding marked complete internally', required: true },
    ]
  }
];

export default function Step6Checklist({ formData, updateFormData }) {
  const checklist = formData.onboarding_checklist || {};

  const toggle = (key) => {
    updateFormData({
      onboarding_checklist: {
        ...checklist,
        [key]: !checklist[key]
      }
    });
  };

  const allItems = CHECKLIST_SECTIONS.flatMap(s => s.items);
  const requiredItems = allItems.filter(i => i.required);
  const completedCount = allItems.filter(i => checklist[i.key]).length;
  const requiredCompleted = requiredItems.filter(i => checklist[i.key]).length;
  const progress = Math.round((completedCount / allItems.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-navy">Onboarding Checklist</h3>
          <p className="text-sm text-muted-foreground">{completedCount}/{allItems.length} items complete · {requiredCompleted}/{requiredItems.length} required</p>
        </div>
        <Badge variant={progress === 100 ? 'default' : 'secondary'}>{progress}%</Badge>
      </div>
      <Progress value={progress} className="h-2 mb-4" />

      {CHECKLIST_SECTIONS.map((section) => (
        <div key={section.title} className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm text-navy border-b pb-2">{section.title}</h4>
          {section.items.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
              <Checkbox
                id={item.key}
                checked={!!checklist[item.key]}
                onCheckedChange={() => toggle(item.key)}
                className="mt-0.5"
              />
              <Label htmlFor={item.key} className="text-sm leading-snug cursor-pointer flex-1">
                {item.label}
                {item.required && (
                  <span className="ml-1 text-xs text-red-500 font-semibold">*</span>
                )}
              </Label>
            </div>
          ))}
        </div>
      ))}

      <p className="text-xs text-muted-foreground"><span className="text-red-500 font-semibold">*</span> Required items must be completed before client activation.</p>
    </div>
  );
}