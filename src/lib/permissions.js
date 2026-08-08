import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

// Mirrors backend/app/modules.py — keep in sync. Only what the frontend
// needs to render (labels aren't needed here beyond invite/edit UI, kept
// minimal): key -> director_implied.
export const MODULES = {
  tasks: { label: 'Tasks & Workspace', director_implied: true },
  calendar: { label: 'Calendar', director_implied: true },
  documents: { label: 'Documents', director_implied: true },
  email: { label: 'Email', director_implied: true },
  clients: { label: 'Clients', director_implied: true },
  filings: { label: 'Filings & Work', director_implied: true },
  compliance: { label: 'Compliance', director_implied: true },
  leads: { label: 'Leads & Sales', director_implied: true },
  billing: { label: 'Billing & Payments', director_implied: true },
  services: { label: 'Service Catalog', director_implied: true },
  team: { label: 'Team', director_implied: true },
  settings: { label: 'Firm Settings', director_implied: true },
  analytics: { label: 'Reports & Analytics', director_implied: true },
  announcements: { label: 'Announcements', director_implied: true },
  conversations: { label: 'Conversations', director_implied: true },
  notifications: { label: 'Notifications', director_implied: true },
};

export const ACTIONS = ['view', 'create', 'edit', 'delete'];

// Mirrors backend/app/modules.py MANAGERIAL_ROLES — who can see/manage
// every team member's tasks vs. only their own. UI-only convenience for
// hiding controls that would be rejected server-side anyway; the real
// enforcement is generic.py's _task_scope_filter.
export const MANAGERIAL_ROLES = ['director', 'admin', 'manager'];

// Who each role can invite — mirrors backend/app/modules.py INVITABLE.
export const INVITABLE = {
  director: ['admin', 'manager', 'bookkeeper', 'accountant', 'business_consultant', 'cpa', 'intern', 'other', 'client'],
  admin: ['manager', 'bookkeeper', 'accountant', 'business_consultant', 'cpa', 'intern', 'other', 'client'],
};

const FULL = ['view', 'create', 'edit', 'delete'];
const VCE = ['view', 'create', 'edit'];
const V = ['view'];

// Starting-point permission package per role — a sensible default an admin
// can apply with one click (PermissionMatrixEditor's "Apply Defaults"
// button) and then freely add to or remove from. Purely a UI convenience;
// never enforced server-side — the backend only ever reads whatever matrix
// actually ends up stored on the user, same as before this existed.
export const ROLE_PERMISSION_PRESETS = {
  admin: {
    tasks: FULL, calendar: FULL, documents: FULL, email: FULL, clients: FULL,
    filings: FULL, compliance: FULL, leads: FULL, billing: FULL, services: FULL,
    team: FULL, settings: FULL, analytics: FULL, announcements: FULL,
    conversations: FULL, notifications: FULL,
  },
  manager: {
    tasks: FULL, calendar: FULL, documents: VCE, email: VCE, clients: VCE,
    filings: VCE, compliance: VCE, leads: FULL, billing: VCE, services: V,
    team: V, analytics: V, announcements: VCE, conversations: FULL,
  },
  bookkeeper: {
    tasks: VCE, calendar: V, documents: VCE, email: V, clients: VCE,
    filings: FULL, compliance: VCE, billing: VCE, services: V,
    announcements: V, conversations: VCE,
  },
  accountant: {
    tasks: VCE, calendar: V, documents: VCE, email: V, clients: VCE,
    filings: VCE, compliance: VCE, billing: FULL, services: V,
    analytics: V, announcements: V, conversations: VCE,
  },
  business_consultant: {
    tasks: VCE, calendar: FULL, documents: V, email: VCE, clients: FULL,
    filings: V, compliance: V, leads: FULL, services: V,
    analytics: V, announcements: V, conversations: FULL,
  },
  cpa: {
    tasks: VCE, calendar: V, documents: VCE, email: V, clients: VCE,
    filings: FULL, compliance: FULL, billing: VCE, services: V,
    analytics: V, announcements: V, conversations: VCE,
  },
  intern: {
    tasks: V, calendar: V, documents: V, announcements: V, conversations: V,
  },
  other: {
    tasks: V, announcements: V, conversations: V,
  },
};

export function can(user, module, action = 'view') {
  if (!user) return false;
  if (user.role === 'client') return false;
  if (user.role === 'director' && MODULES[module]?.director_implied) return true;
  const granted = user.permissions?.[module];
  return Array.isArray(granted) && granted.includes(action);
}

export function canAny(user, modules, action = 'view') {
  return modules.some((m) => can(user, m, action));
}

export function useCurrentUser() {
  return useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me(), staleTime: 5 * 60 * 1000 });
}

// const canX = useCan(); canX('tasks', 'create')
export function useCan() {
  const { data: user } = useCurrentUser();
  return (module, action = 'view') => can(user, module, action);
}
