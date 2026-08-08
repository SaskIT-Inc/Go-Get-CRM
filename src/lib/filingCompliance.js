import { addDays, addMonths, format } from 'date-fns';

// Mirrors backend/app/routers/generic.py's _classify_filing — best-effort
// keyword match on the free-text service_name, since ServiceFiling has no
// dedicated category column. Order matters: more specific tokens are
// checked before "gst"/"pst" so combo names like "GST/PST Filing"
// classify as GST.
export function classifyFiling(serviceName) {
  const name = (serviceName || '').toLowerCase();
  if (name.includes('t2') || name.includes('corporate tax') || name.includes('corporation tax')) return 't2';
  if (name.includes('t1') || name.includes('personal tax')) return 't1';
  if (name.includes('t4')) return 't4';
  if (name.includes('wcb')) return 'wcb';
  if (name.includes('remittance')) return 'remittance';
  if (name.includes('bookkeeping')) return 'bookkeeping';
  if (name.includes('gst')) return 'gst';
  if (name.includes('pst')) return 'pst';
  return null;
}

// Due Date is the editable, operational field — this only supplies the
// initial suggestion shown when Period End Date is set; the user can
// always override it afterward (see AddServiceModal.jsx). Anything not
// listed here keeps the original flat +15-day default.
export function computeDefaultDueDate(serviceName, periodEndDateIso) {
  if (!periodEndDateIso) return null;
  const category = classifyFiling(serviceName);
  const base = new Date(periodEndDateIso);
  let result;
  if (category === 'bookkeeping' || category === 'gst') {
    result = addDays(base, 20);
  } else if (category === 't2') {
    result = addMonths(base, 2);
  } else if (category === 't4' || category === 'wcb') {
    result = addMonths(base, 1);
  } else {
    result = addDays(base, 15);
  }
  return format(result, 'yyyy-MM-dd');
}
