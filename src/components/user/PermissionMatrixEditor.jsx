import { MODULES, ACTIONS } from '@/lib/permissions';

// Module x [view, create, edit, delete] checkbox grid. `value` is the
// {module: [actions]} shape stored on User/Invitation.permissions; checking
// create/edit/delete auto-checks view (mirrors the server-side
// normalize_matrix behavior in backend/app/modules.py).
export default function PermissionMatrixEditor({ value, onChange }) {
  const matrix = value || {};

  const toggle = (moduleKey, action) => {
    const current = new Set(matrix[moduleKey] || []);
    if (current.has(action)) {
      current.delete(action);
      if (action === 'view') ['create', 'edit', 'delete'].forEach((a) => current.delete(a));
    } else {
      current.add(action);
      if (action !== 'view') current.add('view');
    }
    const next = { ...matrix };
    if (current.size === 0) {
      delete next[moduleKey];
    } else {
      next[moduleKey] = Array.from(current);
    }
    onChange(next);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="text-left py-2 px-3 font-semibold text-slate-600">Module</th>
            {ACTIONS.map((action) => (
              <th key={action} className="text-center py-2 px-2 font-semibold text-slate-600 capitalize">
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(MODULES).map(([key, spec]) => {
              const granted = new Set(matrix[key] || []);
              return (
                <tr key={key} className="border-b last:border-b-0 hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-medium text-navy">{spec.label}</td>
                  {ACTIONS.map((action) => (
                    <td key={action} className="text-center py-2 px-2">
                      <input
                        type="checkbox"
                        checked={granted.has(action)}
                        onChange={() => toggle(key, action)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
