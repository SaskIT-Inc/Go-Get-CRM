import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Briefcase, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_SERVICE = {
  service_category: '',
  service_name: '',
  service_type: '',
  cra_form: '',
  cra_deadline: '',
  service_frequency: '',
  billing_frequency: '',
  workflow_template: '',
  responsible_role: '',
  base_price: '',
  estimated_hours: '',
  notes: '',
  is_active: true,
  requires_cpa: false,
};

export default function DatabaseServices() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list(),
  });

  const { data: craForms = [] } = useQuery({
    queryKey: ['cra-forms'],
    queryFn: () => api.craForms.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        base_price: data.base_price === '' ? null : parseFloat(data.base_price),
        estimated_hours: data.estimated_hours === '' ? null : parseFloat(data.estimated_hours),
      };
      return editingId ? api.entities.Service.update(editingId, payload) : api.entities.Service.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(editingId ? 'Service updated' : 'Service added');
      closeForm();
    },
    onError: (error) => toast.error('Failed to save service: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service removed');
    },
    onError: (error) => toast.error('Failed to remove service: ' + error.message),
  });

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_SERVICE);
    setShowForm(true);
  };

  const openEditForm = (service) => {
    setEditingId(service.id);
    setForm({
      ...EMPTY_SERVICE,
      ...service,
      base_price: service.base_price ?? '',
      estimated_hours: service.estimated_hours ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_SERVICE);
  };

  const handleCraFormChange = (code) => {
    const matchedForm = craForms.find((f) => f.code === code);
    setForm((prev) => ({
      ...prev,
      cra_form: code,
      // Prefill the deadline from the reference table, but never clobber a
      // deadline the firm already customized for this service.
      cra_deadline: prev.cra_deadline || matchedForm?.deadline || prev.cra_deadline,
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Service Catalog</h1>
          <p className="text-muted-foreground">Master service catalog — pricing, CRA forms, and filing cadence</p>
        </div>
        <Button onClick={openAddForm}>+ Add Service</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading services...
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No services yet. Add your first one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="border-none shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.service_name}</CardTitle>
                      {service.service_category && (
                        <Badge variant="secondary" className="mt-1">{service.service_category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!service.is_active && <Badge variant="outline">Inactive</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(service)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(service.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {service.cra_form && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CRA Form</span>
                    <span className="font-medium">{service.cra_form}</span>
                  </div>
                )}
                {service.cra_deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium">{service.cra_deadline}</span>
                  </div>
                )}
                {service.service_frequency && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{service.service_frequency}</span>
                  </div>
                )}
                {service.base_price != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-medium">${Number(service.base_price).toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : closeForm())}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name *</Label>
                <Input
                  id="service_name"
                  value={form.service_name}
                  onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                  placeholder="Corporate Tax Return"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_category">Category *</Label>
                <Input
                  id="service_category"
                  value={form.service_category}
                  onChange={(e) => setForm({ ...form, service_category: e.target.value })}
                  placeholder="Corporate Tax"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CRA Form</Label>
                <Select value={form.cra_form || undefined} onValueChange={handleCraFormChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CRA form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {craForms.map((cf) => (
                      <SelectItem key={cf.id} value={cf.code}>
                        {cf.code} — {cf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cra_deadline">Filing Deadline</Label>
                <Input
                  id="cra_deadline"
                  value={form.cra_deadline}
                  onChange={(e) => setForm({ ...form, cra_deadline: e.target.value })}
                  placeholder="April 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_frequency">Service Frequency</Label>
                <Input
                  id="service_frequency"
                  value={form.service_frequency}
                  onChange={(e) => setForm({ ...form, service_frequency: e.target.value })}
                  placeholder="Annual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_frequency">Billing Frequency</Label>
                <Input
                  id="billing_frequency"
                  value={form.billing_frequency}
                  onChange={(e) => setForm({ ...form, billing_frequency: e.target.value })}
                  placeholder="One-time"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price ($)</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.25"
                  value={form.estimated_hours}
                  onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible_role">Responsible Role</Label>
              <Input
                id="responsible_role"
                value={form.responsible_role}
                onChange={(e) => setForm({ ...form, responsible_role: e.target.value })}
                placeholder="Bookkeeper"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-navy text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Inactive services are hidden from selectors</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-navy text-sm">Requires CPA</p>
                <p className="text-xs text-muted-foreground">Flags this service as needing a CPA-designated preparer</p>
              </div>
              <Switch
                checked={form.requires_cpa}
                onCheckedChange={(checked) => setForm({ ...form, requires_cpa: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.service_name || !form.service_category || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
