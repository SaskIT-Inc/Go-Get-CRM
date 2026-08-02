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
// Bullets are one summary line per category (Bookkeeping/Tax/Payroll/
// Support & Advisory), condensed from the firm's full feature-comparison
// sheet so they stay readable in a compact selector card and in the Email
// Lead reference block, which share this same data.
export const MONTHLY_PACKAGES = [
  {
    name: 'Essential', price: '$299/month',
    bullets: [
      'Bookkeeping: up to 150 transactions/month, quarterly bookkeeping, QBO Basic subscription',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 2 personal tax returns included, up to 10 T4/T4A/T5 slips',
      'Payroll: up to 6 employees (no direct deposit)',
      'Support: email / call / text, quarterly financial summary',
    ],
  },
  {
    name: 'Standard', price: '$599/month',
    bullets: [
      'Bookkeeping: up to 350 transactions/month, monthly bookkeeping + reconciliation, QBO Standard subscription',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 3 personal tax returns included, up to 20 T4/T4A/T5 slips',
      'Payroll: up to 20 employees (no direct deposit)',
      'Support: phone + 1hr consult/month, quarterly meetings, financial alerts, government benefit updates, basic industry insights',
    ],
  },
  {
    name: 'Premium', price: '$1,499/month',
    bullets: [
      'Bookkeeping: up to 1,500 transactions/month, weekly bookkeeping + reconciliation, QBO subscription as required',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 5 personal tax returns included, up to 100 T4/T4A/T5 slips',
      'Payroll: up to 100 employees (no direct deposit)',
      'Support: priority, unlimited access, CFO-level strategic planning, real-time financial alerts, early access to government benefit updates, tailored industry insights + benchmarks',
    ],
  },
];
