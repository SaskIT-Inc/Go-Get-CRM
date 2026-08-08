// Go-Get's real price list — shared between the client onboarding intake
// (Step4Services.jsx), the lead needs assessment (NeedsAssessment.jsx), the
// Email Lead reference block (EmailLeadModal.jsx), and the public marketing
// pricing table (Home.jsx) so none of them drift out of sync with each
// other. Source: "Go Get Service Fee All" price sheet, updated 02 July 2026.
// Kept as a local constant rather than pulled from the seeded Service/
// Package catalog so none of these forms depend on that catalog being
// seeded.

// One-time services.
export const SERVICE_OPTIONS = [
  { name: 'Business Incorporation (Federal & Provincial)', fee: '$999 + govt fees', details: 'Articles of Incorporation, BN registration' },
  { name: 'Business Incorporation (Extra Provincial)', fee: '$499 + govt fees', details: 'Provincial name reservation & registration' },
  { name: 'CRA Account Setup', fee: '$99', details: 'GST/HST & Payroll accounts under BN' },
  { name: 'Bookkeeping Software Setup', fee: '$449', details: 'QBO/Xero setup, chart of accounts, tax codes' },
  { name: 'Startup Bookkeeping Training', fee: '$149', details: '1-2 hrs of training in-person or Zoom' },
  { name: 'CPA Tax Consultation', fee: '$350/hr', details: 'Tax planning, structure, or compliance advice' },
  { name: 'CRA Audit Support', fee: 'Custom Quote', details: 'Payroll/GST audits; CRA correspondence' },
  { name: 'Personal Tax Return (T1)', fee: 'Starting at $45', details: 'Newcomer & New Client: $45 · Existing Client: $45 · Self-Employed: from $100 · Couple/family: 25% off (conditions apply)' },
  { name: 'Business Tax Return (T2)', fee: 'Starting at $650', details: 'Conditions apply' },
  { name: 'Notary', fee: 'Starting at $40', details: 'Conditions apply' },
  { name: 'Govt. Benefits & Application', fee: 'Starting at $75', details: 'EI/WCB, GST/Federal Benefits, Passport applications, CCR, DTC, and more' },
];

// Government pass-through fees referenced by the two incorporation services
// above ("+ govt fees") — shown wherever that caveat needs a breakdown
// (e.g. a tooltip). Updated Nov. 2025 per the price sheet.
export const GOVT_FEES_NOTE =
  'Government fees (updated Nov. 2025): Federal Name Reserve Listing $13.80 · ' +
  'Federal Incorporation $200 · Extra Provincial Registration $255 · ' +
  'Provincial Name Reserve Listing $50.';

// Dedicated Payroll Services — a standalone add-on rate card, distinct from
// the payroll headcount already bundled into each monthly package below.
export const PAYROLL_ADDON = {
  name: 'Dedicated Payroll Services',
  tiers: [
    { name: 'No Direct Deposit', baseFee: '$50/month', includes: '4 employees included', perEmployee: '+$5/employee/month' },
    { name: 'With Direct Deposit', baseFee: '$60/month', includes: 'No employees included', perEmployee: '+$6/employee/month' },
  ],
  features: [
    'Source deduction calculations & CRA remittances',
    'ROE issuance',
    'Year-end T4 & T4 Summary preparation',
  ],
};

// Monthly retainer packages — a client/lead picks at most one ongoing tier
// (distinct from the one-time services above, which can be combined freely).
// Each package carries three views of the same data so every consumer can
// pull from this one source instead of keeping its own copy:
//   - `bullets`: one condensed summary line per category, for compact
//     selector cards (Step4Services.jsx / NeedsAssessment.jsx) and the
//     Email Lead reference block.
//   - `features` / `missing`: individual included/excluded line items, for
//     the full checkmark/cross comparison grid on the public marketing page
//     (Home.jsx).
//   - `ideal` / `highlight`: marketing copy for that same grid.
export const MONTHLY_PACKAGES = [
  {
    name: 'Promotional', price: '$149/month', ideal: 'Very small or just-starting businesses', highlight: false,
    bullets: [
      'Bookkeeping: up to 99 transactions/month, yearly bookkeeping',
      'Tax: T2 corporate tax included (return filing not included), GST/PST remittance, up to 5 T4/T4A/T5 slips',
      'Payroll: up to 3 employees (no direct deposit)',
      'Support: email / call only, annual financial review',
    ],
    features: [
      'Up to 99 transactions/month',
      'Yearly bookkeeping',
      'Corporate Tax (T2) included',
      'GST/PST remittance filings',
      'Up to 5 T4/T4A/T5 slips',
      'Up to 3 payroll employees (no direct deposit)',
      'Email / Call support',
      'Annual financial review',
    ],
    missing: ['Corporate Return Filing', 'Personal Tax Returns', 'Financial alerts', "Gov't benefit updates", 'Industry insights', 'QBO subscription'],
  },
  {
    name: 'Basic', price: '$299/month', ideal: 'Startups & solo operators', highlight: false,
    bullets: [
      'Bookkeeping: up to 150 transactions/month, quarterly bookkeeping, QBO Basic subscription',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 2 personal tax returns included, ' +
        'up to 10 T4/T4A/T5 slips',
      'Payroll: up to 6 employees (no direct deposit)',
      'Support: email / call / text, quarterly financial summary',
    ],
    features: [
      'Up to 150 transactions/month',
      'Quarterly bookkeeping',
      'QBO Basic subscription',
      'Corporate Tax (T2) & return filing',
      '2 Personal Tax Returns included',
      'GST/PST remittance',
      'Up to 10 T4/T4A/T5 slips',
      'Up to 6 payroll employees (no direct deposit)',
      'Email / Call / Text support',
      'Quarterly financial summary',
    ],
    missing: ['Financial alerts', "Gov't benefit updates", 'Industry insights'],
  },
  {
    name: 'Standard', price: '$599/month', ideal: 'Growing businesses', highlight: true,
    bullets: [
      'Bookkeeping: up to 350 transactions/month, monthly bookkeeping + reconciliation, QBO Standard ' +
        'subscription',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 3 personal tax returns included, up to 20 ' +
        'T4/T4A/T5 slips',
      'Payroll: up to 20 employees (no direct deposit)',
      'Support: phone + 1hr consult/month, quarterly meetings, financial alerts, government benefit updates, ' +
        'basic industry insights',
    ],
    features: [
      'Up to 350 transactions/month',
      'Monthly bookkeeping + reconciliation',
      'QBO Standard subscription',
      'Corporate Tax (T2) & return filing',
      '3 Personal Tax Returns included',
      'GST/PST remittance',
      'Up to 20 T4/T4A/T5 slips',
      'Up to 20 payroll employees (no direct deposit)',
      'Phone support + 1hr consult/month',
      'Quarterly review meetings',
      "Financial alerts & gov't benefit updates",
      'Basic industry tips',
    ],
    missing: ['Tailored industry benchmarks'],
  },
  {
    name: 'Premium', price: '$1,499/month', ideal: 'Established businesses', highlight: false,
    bullets: [
      'Bookkeeping: up to 1,500 transactions/month, weekly bookkeeping + reconciliation, QBO subscription as ' +
        'required',
      'Tax: T2 corporate tax & return filing, GST/PST remittance, 5 personal tax returns included, up to 100 ' +
        'T4/T4A/T5 slips',
      'Payroll: up to 100 employees (no direct deposit)',
      'Support: priority, unlimited access, CFO-level strategic planning, real-time financial alerts, early ' +
        "access to government benefit updates, tailored industry insights + benchmarks",
    ],
    features: [
      'Up to 1,500 transactions/month',
      'Weekly bookkeeping + reconciliation',
      'QBO subscription as required',
      'Corporate Tax (T2) & return filing',
      '5 Personal Tax Returns included',
      'GST/PST remittance',
      'Up to 100 T4/T4A/T5 slips',
      'Up to 100 payroll employees (no direct deposit)',
      'Priority support, unlimited access',
      'CFO-level strategic planning',
      'Real-time alerts & tailored industry insights',
      "Early access to gov't benefit updates",
    ],
    missing: [],
  },
];
