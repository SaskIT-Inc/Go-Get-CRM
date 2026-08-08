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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, DollarSign, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_SERVICE = { service_name: '', base_price: '' };

const EMPTY_PACKAGE = { name: '', price: '', billing_frequency: 'Monthly', description: '' };

export default function DatabaseServices() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [newPackage, setNewPackage] = useState(EMPTY_PACKAGE);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list(),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.entities.Package.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, base_price: data.base_price === '' ? null : parseFloat(data.base_price) };
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

  const savePackageMutation = useMutation({
    mutationFn: (data) => (editingPackageId ? api.entities.Package.update(editingPackageId, data) : api.entities.Package.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(editingPackageId ? 'Package updated' : 'Package added');
      closePackageDialog();
    },
    onError: (error) => toast.error('Failed to save package: ' + error.message),
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id) => api.entities.Package.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package removed');
    },
    onError: (error) => toast.error('Failed to remove package: ' + error.message),
  });

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_SERVICE);
    setShowForm(true);
  };

  const openEditForm = (service) => {
    setEditingId(service.id);
    setForm({ ...EMPTY_SERVICE, ...service, base_price: service.base_price ?? '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_SERVICE);
  };

  const openAddPackage = () => {
    setEditingPackageId(null);
    setNewPackage(EMPTY_PACKAGE);
    setShowAddPackage(true);
  };

  const openEditPackage = (pkg) => {
    setEditingPackageId(pkg.id);
    setNewPackage({ ...EMPTY_PACKAGE, ...pkg });
    setShowAddPackage(true);
  };

  const closePackageDialog = () => {
    setShowAddPackage(false);
    setEditingPackageId(null);
    setNewPackage(EMPTY_PACKAGE);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Service Catalog</h1>
          <p className="text-muted-foreground">Master list of services and packages — filing details are set per client</p>
        </div>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="services" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="mb-6 flex justify-end">
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
                    {service.period_end_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Period End</span>
                        <span className="font-medium">{service.period_end_date}</span>
                      </div>
                    )}
                    {service.due_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span className="font-medium">{service.due_date}</span>
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
                  <Label htmlFor="base_price">Fees ($)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={!form.service_name || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Service'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="packages">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Packages
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your firm's own pricing tiers — these are what show up when assigning a package to a client.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {packages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No packages yet. Add your first pricing tier below.
                </p>
              )}
              {packages.map((pkg) => (
                <Card key={pkg.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-navy text-lg">{pkg.name}</h3>
                        {!pkg.is_active && (
                          <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-1 rounded mt-1 inline-block">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditPackage(pkg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePackageMutation.mutate(pkg.id)}
                          disabled={deletePackageMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Price</p>
                        <p className="font-medium">{pkg.price || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Billing</p>
                        <p className="font-medium">{pkg.billing_frequency || '—'}</p>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">{pkg.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={openAddPackage}>
                + Add New Package
              </Button>
            </CardContent>
          </Card>

          <Dialog open={showAddPackage} onOpenChange={(open) => (open ? setShowAddPackage(true) : closePackageDialog())}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPackageId ? 'Edit Pricing Package' : 'Add Pricing Package'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="package_name">Package Name</Label>
                  <Input
                    id="package_name"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    placeholder="Essential Plan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="package_price">Price</Label>
                    <Input
                      id="package_price"
                      value={newPackage.price}
                      onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                      placeholder="$299"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package_billing">Billing Frequency</Label>
                    <Input
                      id="package_billing"
                      value={newPackage.billing_frequency}
                      onChange={(e) => setNewPackage({ ...newPackage, billing_frequency: e.target.value })}
                      placeholder="Monthly"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package_description">Description</Label>
                  <Textarea
                    id="package_description"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                    rows={3}
                  />
                </div>
                {editingPackageId && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-navy text-sm">Active</p>
                      <p className="text-xs text-muted-foreground">Inactive packages are hidden from selectors</p>
                    </div>
                    <Switch
                      checked={newPackage.is_active !== false}
                      onCheckedChange={(checked) => setNewPackage({ ...newPackage, is_active: checked })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closePackageDialog}>Cancel</Button>
                <Button
                  onClick={() => savePackageMutation.mutate(newPackage)}
                  disabled={!newPackage.name || savePackageMutation.isPending}
                >
                  {savePackageMutation.isPending ? 'Saving…' : editingPackageId ? 'Save Changes' : 'Add Package'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
