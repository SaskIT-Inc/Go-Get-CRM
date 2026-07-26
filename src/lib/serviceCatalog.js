// Go-Get's real price list — shared between the client onboarding intake
// (Step4Services.jsx) and the lead needs assessment (NeedsAssessment.jsx) so
// the two never drift out of sync. Kept as a local constant rather than
// pulled from the seeded Service/Package catalog so neither form depends on
// that catalog being seeded.

// One-time services.
export const SERVICE_OPTIONS = [
  { name: 'Business Incorporation (Federal & Provincial)', fee: '$999 + govt fees', details: 'Articles of Incorporation, BN registration' },
  { name: 'Business Incorporation (Extra Provincial)', fee: '$499 + govt fees', details: 'Saskatchewan name reservation & registration' },
  { name: 'CRA Account Setup', fee: '$99', details: 'GST/PST & Payroll accounts under BN' },
  { name: 'Bookkeeping Software Setup', fee: '$449', details: 'QBO/Xero setup, chart of accounts, tax codes' },
  { name: 'Startup Bookkeeping Training', fee: '$149', details: '1-2 hrs of training in-person or Zoom' },
  { name: 'CPA Tax Consultation', fee: '$350/hr', details: 'Tax planning, structure, or compliance advice' },
  { name: 'CRA Audit Support', fee: 'Custom Quote', details: 'Payroll/GST audits; CRA correspondence' },
  { name: 'Personal Tax Return (T1)', fee: 'Starting at $45', details: 'Newcomer & New Client: $45 · Existing Client: $45 · Self-Employed: from $100 · Couple/family: 25% off (conditions apply)' },
  { name: 'Business Tax Return (T2)', fee: 'Starting at $650', details: 'Conditions apply' },
  { name: 'Notary', fee: 'Starting at $40', details: 'Conditions apply' },
  { name: 'Govt. Benefits & Application', fee: 'Starting at $75', details: 'EI/WCB, GST/Federal Benefits, Passport applications, CCR, DTC, and more' },
];

// Monthly retainer packages — a client/lead picks at most one ongoing tier
// (distinct from the one-time services above, which can be combined freely).
export const MONTHLY_PACKAGES = [
  {
    name: 'Essential', price: '$299/month',
    bullets: ['Quarterly bookkeeping rhythm', 'T2 corporate tax support', 'GST/PST filing support', 'Payroll support for smaller teams', 'QuickBooks support depending on setup'],
  },
  {
    name: 'Standard', price: '$599/month',
    bullets: ['Monthly bookkeeping and reconciliation', 'T2 corporate tax support', 'GST/PST filing support', 'Payroll & slip support for growing teams', 'Financial alerts & consultation support'],
  },
  {
    name: 'Premium', price: '$1,499/month',
    bullets: ['Weekly bookkeeping and reconciliation', 'Priority support', 'Higher transaction capacity', 'More slips & payroll complexity', 'CFO-level planning & advanced reporting'],
  },
];
