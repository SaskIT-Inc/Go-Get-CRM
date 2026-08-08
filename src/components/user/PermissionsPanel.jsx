import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import PermissionMatrixEditor from './PermissionMatrixEditor';

const ROLE_LABEL = (role) => role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || role;

// Slide-out panel for editing a user's module permissions — used by both the
// invite form and the edit-existing-user flow so this crowded 16-module x
// 4-action grid gets real room instead of being squeezed inline into a form
// or a grid card. Edits a local draft; nothing reaches the caller until Save.
export default function PermissionsPanel({ open, onClose, role, name, value, onSave }) {
  const [draft, setDraft] = useState(value || {});

  useEffect(() => {
    if (open) setDraft(value || {});
  }, [open, value]);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Permissions{name ? ` — ${name}` : ''}</SheetTitle>
          <SheetDescription>
            {role ? `Role: ${ROLE_LABEL(role)}. ` : ''}
            Apply a starting package, then add or remove individual permissions as needed.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <PermissionMatrixEditor value={draft} onChange={setDraft} role={role} />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Permissions</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
