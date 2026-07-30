// Shared between LeadPipeline.jsx (kanban columns) and LeadDetailsModal.jsx
// (stage dropdown) so the two never drift out of sync.
export const COLD_STAGES = [
  'New Lead',
  'Mail Sent',
  '1st Follow-Up',
  '2nd Follow-Up',
  'Replied',
  'Closed Leads',
  'Lost Leads'
];

export const HOT_STAGES = [
  'New Lead',
  'Appointment Set',
  'Estimate Sent',
  'Closed Leads',
  'Lost Leads',
  'False Leads'
];
