import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, X, Users, Target, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENTITY_CONFIG = [
  {
    key: 'clients',
    label: 'Clients',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    fetch: () => api.entities.Client.list('-created_date', 200),
    getName: (r) => r.legal_name || r.primary_contact_name,
    getSub: (r) => r.primary_email,
    getUrl: (r) => `${createPageUrl('ClientProfile')}?client=${r.id}`,
  },
  {
    key: 'leads',
    label: 'Leads',
    icon: Target,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    fetch: () => api.entities.Lead.list('-created_date', 200),
    getName: (r) => r.contact_name,
    getSub: (r) => r.company_name || r.email,
    getUrl: (r) => `${createPageUrl('LeadDirectory')}?lead=${r.id}`,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    fetch: () => api.entities.Task.list('-created_date', 200),
    getName: (r) => r.title,
    getSub: (r) => r.status,
    getUrl: () => createPageUrl('Tasks'),
  },
  {
    key: 'filings',
    label: 'Filings',
    icon: FileText,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    fetch: () => api.entities.ServiceFiling.list('-created_date', 200),
    getName: (r) => r.service_name,
    getSub: (r) => `${r.filing_year} · ${r.status}`,
    getUrl: (r) => `${createPageUrl('ClientProfile')}?client=${r.client_id}`,
  },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch all data for search (cached, stale 2 min)
  const { data: clients = [] } = useQuery({ queryKey: ['search-clients'], queryFn: ENTITY_CONFIG[0].fetch, staleTime: 2 * 60 * 1000, enabled: open });
  const { data: leads = [] } = useQuery({ queryKey: ['search-leads'], queryFn: ENTITY_CONFIG[1].fetch, staleTime: 2 * 60 * 1000, enabled: open });
  const { data: tasks = [] } = useQuery({ queryKey: ['search-tasks'], queryFn: ENTITY_CONFIG[2].fetch, staleTime: 2 * 60 * 1000, enabled: open });
  const { data: filings = [] } = useQuery({ queryKey: ['search-filings'], queryFn: ENTITY_CONFIG[3].fetch, staleTime: 2 * 60 * 1000, enabled: open });

  const dataMap = { clients, leads, tasks, filings };

  const results = query.trim().length < 1 ? [] : ENTITY_CONFIG.flatMap((cfg) =>
    (dataMap[cfg.key] || [])
      .filter((r) => {
        const name = cfg.getName(r) || '';
        const sub = cfg.getSub(r) || '';
        const q = query.toLowerCase();
        return name.toLowerCase().includes(q) || sub.toLowerCase().includes(q) || r.id?.includes(q);
      })
      .slice(0, 5)
      .map((r) => ({ ...r, _cfg: cfg }))
  );

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (result) => {
    const url = result._cfg.getUrl(result);
    navigate(url);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all text-sm"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline text-white/80">Search…</span>
        <kbd className="hidden lg:inline text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono text-white/70">⌘K</kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-12 right-0 w-[480px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, clients, leads, filings…"
              className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto">
            {query.trim().length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Type to search across tasks, clients, leads & filings</p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-400">No results for "<span className="font-medium text-slate-600">{query}</span>"</p>
              </div>
            ) : (
              (() => {
                // Group by entity type
                const grouped = {};
                results.forEach(r => {
                  const lbl = r._cfg.label;
                  if (!grouped[lbl]) grouped[lbl] = [];
                  grouped[lbl].push(r);
                });
                return Object.entries(grouped).map(([label, items]) => {
                  const cfg = ENTITY_CONFIG.find(c => c.label === label);
                  const Icon = cfg.icon;
                  return (
                    <div key={label}>
                      <div className={cn('px-4 py-1.5 flex items-center gap-2', cfg.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                        <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.color)}>{label}</span>
                      </div>
                      {items.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {result._cfg.getName(result)}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {result._cfg.getSub(result)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  );
                });
              })()
            )}
          </div>

          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-right">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}