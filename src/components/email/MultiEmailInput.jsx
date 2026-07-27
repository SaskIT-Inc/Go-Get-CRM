import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MultiEmailInput({ id, value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const candidates = draft.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const valid = candidates.filter((addr) => EMAIL_RE.test(addr) && !value.includes(addr));
    if (valid.length) {
      onChange([...value, ...valid]);
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
      {value.map((addr, idx) => (
        <span
          key={addr + idx}
          className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
        >
          {addr}
          <button
            type="button"
            onClick={() => removeAt(idx)}
            className="rounded-full hover:bg-slate-200"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <Input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={value.length === 0 ? placeholder : 'Add another...'}
        className="h-6 flex-1 min-w-[140px] border-none p-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
