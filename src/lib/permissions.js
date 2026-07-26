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
  conversations: { label: 'Conversations', director_implied: false },
};

export const ACTIONS = ['view', 'create', 'edit', 'delete'];

// Who each role can invite — mirrors backend/app/modules.py INVITABLE.
export const INVITABLE = {
  director: ['admin', 'manager', 'bookkeeper', 'client'],
  admin: ['manager', 'bookkeeper', 'client'],
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
