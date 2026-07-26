// Shared, complete list — any dropdown offering Canadian provinces/territories
// should import this rather than hand-rolling its own (partial) list.
export const CANADIAN_PROVINCES_AND_TERRITORIES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

// Provinces that levy their own provincial sales tax alongside federal GST
// (as opposed to a combined HST, or GST-only). Used only to decide whether
// to surface a "PST" filing requirement — never to assert a specific rate,
// since tax rates change and this app doesn't give tax advice.
export const PROVINCES_WITH_PST = ['Saskatchewan', 'British Columbia', 'Manitoba', 'Quebec'];

// Canada's IANA time zones, one per UTC offset region actually in use.
export const CANADIAN_TIME_ZONES = [
  { value: 'America/St_Johns', label: 'Newfoundland Time (St. John\'s)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
  { value: 'America/Regina', label: 'Central Time, no DST (Regina)' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
];
