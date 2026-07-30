import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building, Mail, Phone, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_VENDOR = { name: '', category: '', contact_email: '', phone: '', website: '', services: '' };

export default function Vendors() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newVendor, setNewVendor] = useState(EMPTY_VENDOR);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.entities.Vendor.list(),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) =>
      api.entities.Vendor.create({
        ...data,
        services: data.services ? data.services.split(',').map((s) => s.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added');
      setShowAdd(false);
      setNewVendor(EMPTY_VENDOR);
    },
    onError: (error) => toast.error('Failed to add vendor: ' + error.message),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id) => api.entities.Vendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor removed');
    },
    onError: (error) => toast.error('Failed to remove vendor: ' + error.message),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Vendor Network</h1>
          <p className="text-muted-foreground">
            Third-party service providers and partners
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Vendor</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading vendors...
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No vendors yet. Add your first one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="border-none shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Building className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                      {vendor.category && <Badge variant="secondary" className="mt-1">{vendor.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {vendor.status && <Badge className="bg-green-500/10 text-green-700">{vendor.status}</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVendorMutation.mutate(vendor.id)}
                      disabled={deleteVendorMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendor.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{vendor.contact_email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {(vendor.services || []).length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {vendor.services.map(service => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                placeholder="QuickBooks Accounting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_category">Category</Label>
              <Input
                id="vendor_category"
                value={newVendor.category}
                onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                placeholder="Software"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_email">Contact Email</Label>
                <Input
                  id="vendor_email"
                  type="email"
                  value={newVendor.contact_email}
                  onChange={(e) => setNewVendor({ ...newVendor, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_phone">Phone</Label>
                <Input
                  id="vendor_phone"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_website">Website</Label>
              <Input
                id="vendor_website"
                value={newVendor.website}
                onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_services">Services (comma-separated)</Label>
              <Input
                id="vendor_services"
                value={newVendor.services}
                onChange={(e) => setNewVendor({ ...newVendor, services: e.target.value })}
                placeholder="Accounting Software, Payroll Integration"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createVendorMutation.mutate(newVendor)}
              disabled={!newVendor.name || createVendorMutation.isPending}
            >
              {createVendorMutation.isPending ? 'Adding…' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
