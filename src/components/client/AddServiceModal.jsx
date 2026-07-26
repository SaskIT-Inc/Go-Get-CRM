import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { X, Plus, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

const FREQUENCIES = ['One-time', 'Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUSES = ['Not Started', 'Documents Pending', 'In Progress', 'Review', 'Filed', 'Completed'];
const SHOW_SCHEDULE = ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Semi-Monthly', 'Bi-Weekly', 'Weekly'];

const DEFAULT_FORM = (year) => ({
  service_id: '',
  service_name: '',
  filing_year: String(year),
  fee: '',
  status: 'Not Started',
  assigned_to: '',
  filing_frequency: 'Annual',
  schedule_month: '',
  schedule_day: '',
  tax_cycle_start: '',
  due_date: '',
  notes: ''
});

const mapFrequency = (freq) => {
  const map = {
    'Monthly': 'Monthly', 'Weekly': 'Weekly', 'Annual': 'Annual',
    'Quarterly': 'Quarterly', 'One-time': 'One-time', 'Ad-hoc': 'One-time',
    'Semi-Monthly': 'Semi-Monthly', 'Bi-Weekly': 'Bi-Weekly', 'Semi-Annual': 'Semi-Annual'
  };
  return map[freq] || 'Annual';
};

export default function AddServiceModal({ open, onClose, onSave, services = [], isSaving, initialData }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState(DEFAULT_FORM(currentYear));
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['catalogUsers'],
    queryFn: () => api.entities.User.list(),
  });
  const activeStaff = users.filter((u) => u.is_active !== false);
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          service_id: initialData.service_id || '',
          service_name: initialData.service_name || '',
          filing_year: initialData.filing_year || String(currentYear),
          fee: initialData.fee != null ? String(initialData.fee) : '',
          status: initialData.status || 'Not Started',
          assigned_to: initialData.assigned_to || '',
          filing_frequency: initialData.filing_frequency || 'Annual',
          schedule_month: initialData.schedule_month || '',
          schedule_day: initialData.schedule_day != null ? String(initialData.schedule_day) : '',
          tax_cycle_start: initialData.tax_cycle_start || '',
          due_date: initialData.due_date || '',
          notes: initialData.notes || ''
        });
      } else {
        setForm(DEFAULT_FORM(currentYear));
      }
    }
  }, [open, initialData]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setVal = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleCatalogSelect = (serviceId) => {
    if (serviceId === '__none__') {
      setForm(prev => ({ ...prev, service_id: '' }));
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      service_name: svc?.service_name || '',
      filing_frequency: mapFrequency(svc?.service_frequency) || prev.filing_frequency,
      fee: svc?.base_price ? String(svc.base_price) : prev.fee,
    }));
  };

  const showScheduleDetails = SHOW_SCHEDULE.includes(form.filing_frequency);
  const showMonth = ['Annual', 'Semi-Annual'].includes(form.filing_frequency);

  const handleSubmit = () => {
    if (!form.service_name.trim()) return;
    const data = {
      ...form,
      fee: form.fee !== '' ? parseFloat(form.fee) : undefined,
      schedule_day: form.schedule_day ? parseInt(form.schedule_day) : undefined
    };
    onSave(data);
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Service Catalog Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pick from Service Catalog</Label>
            <Select value={form.service_id || '__none__'} onValueChange={handleCatalogSelect}>
              <SelectTrigger className="h-10 border-slate-200 text-slate-500">
                <SelectValue placeholder="— Select a service —" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                <SelectItem value="__none__">— Select a service —</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.service_name}
                    {s.service_category ? ` (${s.service_category})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Service Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.service_name}
              onChange={set('service_name')}
              placeholder="e.g. T2 Corporate Tax Return"
              className="h-10 border-slate-200"
            />
          </div>

          {/* Filing Year + Fee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filing Year <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.filing_year}
                onChange={set('filing_year')}
                placeholder={String(currentYear)}
                className="h-10 border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.fee}
                onChange={set('fee')}
                placeholder="0.00"
                className="h-10 border-slate-200"
              />
            </div>
          </div>

          {/* Status + Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={setVal('status')}>
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned To</Label>
              <Select value={form.assigned_to || '__unassigned__'} onValueChange={(v) => setVal('assigned_to')(v === '__unassigned__' ? '' : v)}>
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="— Unassigned —" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="__unassigned__">— Unassigned —</SelectItem>
                   {activeStaff.map(member => (
                     <SelectItem key={member.id} value={member.email}>
                       {member.full_name || member.email}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filing Frequency */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filing Frequency</Label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map(freq => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, filing_frequency: freq }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                    form.filing_frequency === freq
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-navy/50 hover:text-navy'
                  )}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Details */}
          {showScheduleDetails && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Schedule Details</p>
              <div className={cn('grid gap-3', showMonth ? 'grid-cols-2' : 'grid-cols-1 max-w-[180px]')}>
                {showMonth && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Month</Label>
                    <Select value={form.schedule_month || '__none__'} onValueChange={(v) => setVal('schedule_month')(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-9 bg-white border-slate-200">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select month</SelectItem>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.schedule_day}
                    onChange={set('schedule_day')}
                    placeholder="e.g. 30"
                    className="h-9 bg-white border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Start Date + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</Label>
              <Input
                type="date"
                value={form.tax_cycle_start}
                onChange={set('tax_cycle_start')}
                className="h-10 border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={set('due_date')}
                className="h-10 border-slate-200"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes / Instructions</Label>
            <Textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Add any special instructions, client-specific notes, or reminders..."
              rows={3}
              className="border-slate-200 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50/50">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="w-4 h-4" />Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.service_name.trim() || isSaving}
            className="gap-1.5 bg-navy text-white hover:bg-navy/90 px-5"
          >
            {isEditing ? <><Save className="w-4 h-4" />Save Changes</> : <><Plus className="w-4 h-4" />Add Service</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}