import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, Sparkles } from 'lucide-react';
import { MODULES, ACTIONS, ROLE_PERMISSION_PRESETS } from '@/lib/permissions';

const MODULE_KEYS = Object.keys(MODULES);
const TOTAL_PERMISSIONS = MODULE_KEYS.length * ACTIONS.length;
// Stable reference for "no actions granted" so ModuleRow's memo doesn't see
// a "changed" prop (a fresh [] literal) for every ungranted module on every
// parent re-render.
const EMPTY_ACTIONS = [];

const ModuleRow = memo(function ModuleRow({ moduleKey, label, granted, onToggle }) {
  const grantedSet = useMemo(() => new Set(granted), [granted]);
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 border-b last:border-b-0 hover:bg-slate-50/70">
      <span className="font-medium text-navy text-sm">{label}</span>
      <div className="flex items-center gap-4">
        {ACTIONS.map((action) => (
          <label key={action} className="flex flex-col items-center gap-1 text-[11px] text-slate-500 capitalize cursor-pointer select-none">
            {action}
            <input
              type="checkbox"
              checked={grantedSet.has(action)}
              onChange={() => onToggle(moduleKey, action)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </label>
        ))}
      </div>
    </div>
  );
});

// Module x [view, create, edit, delete] permission grid. `value` is the
// {module: [actions]} shape stored on User/Invitation.permissions. Each row
// is its own memoized component so toggling one checkbox only re-renders
// that row, not all of MODULES — the previous raw-<table> version rebuilt
// and re-rendered everything on every click.
export default function PermissionMatrixEditor({ value, onChange, role }) {
  const matrix = value || {};

  // Stable function identities (via refs to the latest value/onChange)
  // so ModuleRow's React.memo can actually skip unaffected rows instead of
  // re-rendering everything because the callback prop changed reference.
  const stateRef = useRef({ matrix, onChange });
  stateRef.current = { matrix, onChange };

  const toggle = useCallback((moduleKey, action) => {
    const { matrix: current, onChange: emit } = stateRef.current;
    const grantedSet = new Set(current[moduleKey] || []);
    if (grantedSet.has(action)) {
      grantedSet.delete(action);
      if (action === 'view') ['create', 'edit', 'delete'].forEach((a) => grantedSet.delete(a));
    } else {
      grantedSet.add(action);
      if (action !== 'view') grantedSet.add('view');
    }
    const next = { ...current };
    if (grantedSet.size === 0) {
      delete next[moduleKey];
    } else {
      next[moduleKey] = Array.from(grantedSet);
    }
    emit(next);
  }, []);

  const selectAll = useCallback(() => {
    const { onChange: emit } = stateRef.current;
    const next = {};
    MODULE_KEYS.forEach((key) => { next[key] = [...ACTIONS]; });
    emit(next);
  }, []);

  const denyAll = useCallback(() => {
    stateRef.current.onChange({});
  }, []);

  const applyPreset = useCallback(() => {
    const { onChange: emit } = stateRef.current;
    emit(role && ROLE_PERMISSION_PRESETS[role] ? { ...ROLE_PERMISSION_PRESETS[role] } : {});
  }, [role]);

  const grantedCount = MODULE_KEYS.reduce((sum, key) => sum + (matrix[key]?.length || 0), 0);
  const presetAvailable = role && ROLE_PERMISSION_PRESETS[role];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border-b px-3 py-2">
        <span className="text-xs font-medium text-slate-500">{grantedCount} of {TOTAL_PERMISSIONS} permissions granted</span>
        <div className="flex flex-wrap gap-2">
          {presetAvailable && (
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={applyPreset}>
              <Sparkles className="w-3.5 h-3.5" />
              Apply {role.replace(/_/g, ' ')} Defaults
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={selectAll}>
            <CheckSquare className="w-3.5 h-3.5" />
            Select All
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={denyAll}>
            <Square className="w-3.5 h-3.5" />
            Deny All
          </Button>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {MODULE_KEYS.map((key) => (
          <ModuleRow
            key={key}
            moduleKey={key}
            label={MODULES[key].label}
            granted={matrix[key] || EMPTY_ACTIONS}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
