import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Check, X, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { INVITABLE } from '@/lib/permissions';
import PermissionsPanel from './PermissionsPanel';

const ROLE_COLORS = {
  director: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-indigo-100 text-indigo-800',
  bookkeeper: 'bg-orange-100 text-orange-800',
  accountant: 'bg-teal-100 text-teal-800',
  business_consultant: 'bg-cyan-100 text-cyan-800',
  cpa: 'bg-emerald-100 text-emerald-800',
  intern: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
  client: 'bg-slate-100 text-slate-800',
};

const ROLE_LABEL = (role) => role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || role;

export default function UserCard({ u, currentUser, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [form, setForm] = useState({
    full_name: u.full_name || '',
    role: u.role || 'client',
    job_title: u.job_title || '',
    permissions: u.permissions || {},
  });

  const manageableRoles = INVITABLE[currentUser?.role] || [];
  // An actor can manage a user if they could invite that user's CURRENT role
  // (mirrors the backend's /auth/users/{id}/access check) — never yourself.
  const canManage = u.id !== currentUser?.id && manageableRoles.includes(u.role);
  // Roles this actor may reassign the target TO (their current role stays
  // selectable even if not further re-grantable, so the value never breaks).
  const assignableRoles = Array.from(new Set([u.role, ...manageableRoles]));

  const handleSave = () => {
    onSave(u.id, form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      full_name: u.full_name || '',
      role: u.role || 'client',
      job_title: u.job_title || '',
      permissions: u.permissions || {},
    });
    setEditing(false);
  };

  const toggleActive = () => onSave(u.id, { is_active: !u.is_active });

  if (editing) {
    return (
      <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Full Name</label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Role</label>
          <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.role === 'other' && (
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Custom Role Title</label>
            <Input
              placeholder="e.g. Payroll Specialist"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
          </div>
        )}
        {form.role !== 'client' && (
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Module Access</label>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setShowPermissionsPanel(true)}
              className="gap-2 w-full"
            >
              Configure Permissions
              <span className="text-xs text-muted-foreground">
                ({Object.values(form.permissions).reduce((sum, actions) => sum + actions.length, 0)} granted)
              </span>
            </Button>
            <PermissionsPanel
              open={showPermissionsPanel}
              onClose={() => setShowPermissionsPanel(false)}
              role={form.role}
              name={form.full_name || u.email}
              value={form.permissions}
              onSave={(permissions) => setForm({ ...form, permissions })}
            />
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} className="gap-1 flex-1">
            <Check className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1 flex-1">
            <X className="w-3 h-3" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy truncate">{u.full_name || u.email}</p>
          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
          {!u.is_active && <p className="text-xs text-red-600 mt-0.5 font-semibold">Deactivated</p>}
        </div>
        {canManage && (
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="p-1 h-7 w-7">
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm(`${u.is_active ? 'Deactivate' : 'Reactivate'} ${u.full_name || u.email}?`)) {
                  toggleActive();
                }
              }}
              className="p-1 h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {u.is_active ? <Ban className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    `Permanently delete ${u.full_name || u.email}? This can't be undone — they will ` +
                      `immediately lose access, and any of their connected Gmail/Outlook/OneDrive accounts ` +
                      `will be disconnected. Tasks, filings, notes, and invoices they were attached to are ` +
                      `unaffected and will keep showing their name/email.`
                  )
                ) {
                  onDelete(u.id);
                }
              }}
              className="p-1 h-7 w-7 text-red-700 hover:text-red-900 hover:bg-red-100"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      <Badge className={ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'}>{ROLE_LABEL(u.role)}</Badge>
    </div>
  );
}
