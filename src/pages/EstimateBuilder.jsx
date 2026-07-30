import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calculator, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CANADIAN_PROVINCES_AND_TERRITORIES } from '@/lib/canada';

export default function EstimateBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLead, setSelectedLead] = useState('');
  const [lineItems, setLineItems] = useState([
    { service_id: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [province, setProvince] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('5');
  const [taxRateTouched, setTaxRateTouched] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.filter({ is_active: true })
  });

  const { data: provincialTax = [] } = useQuery({
    queryKey: ['provincialTax'],
    queryFn: () => api.provincialTax.list(),
    staleTime: 60 * 60 * 1000,
  });
  const provinceTaxInfo = provincialTax.find((p) => p.province === province);

  const handleProvinceChange = (value) => {
    setProvince(value);
    const info = provincialTax.find((p) => p.province === value);
    // Only auto-fill if the user hasn't manually typed their own rate —
    // never clobber a deliberate override.
    if (info && !taxRateTouched) {
      setTaxRatePercent(String(info.combined_rate));
    }
  };

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, data }) => api.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success('Estimate created and sent!');
      navigate(createPageUrl('Estimates'));
    },
    onError: (error) => {
      toast.error('Failed to create estimate: ' + error.message);
    }
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { service_id: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    // Auto-populate when service is selected
    if (field === 'service_id' && value) {
      const service = services.find(s => s.id === value);
      if (service) {
        updated[index].description = service.service_name;
        updated[index].rate = service.base_price || 0;
        updated[index].amount = updated[index].quantity * (service.base_price || 0);
      }
    }
    
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = (parseFloat(taxRatePercent) || 0) / 100;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedLead) {
      toast.error('Please select a lead');
      return;
    }

    const payload = {
      estimated_value: total,
      stage: 'Estimate Sent',
      notes: `ESTIMATE:\n\n${lineItems.map(item => `${item.description}: ${item.quantity} x $${item.rate} = $${item.amount}`).join('\n')}\n\nSubtotal: $${subtotal.toFixed(2)}\n${province ? `Province: ${province}\n` : ''}Tax${provinceTaxInfo ? ` (${provinceTaxInfo.tax_system})` : ''} (${taxRatePercent}%): $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)}\n\nValid Until: ${validUntil}\n\nNotes: ${notes}`
    };

    updateLeadMutation.mutate({ leadId: selectedLead, data: payload });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Link to={createPageUrl('CommercialHub')}>
          <Button variant="outline" size="sm">Commercial Hub</Button>
        </Link>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calculator className="w-6 h-6 text-navy" />
            Estimate Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Select Lead</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedLead}
                onChange={(e) => setSelectedLead(e.target.value)}
                required
              >
                <option value="">Choose a lead...</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.contact_name} {lead.company_name && `(${lead.company_name})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" onClick={addLineItem} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {lineItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Service</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={item.service_id}
                        onChange={(e) => updateLineItem(index, 'service_id', e.target.value)}
                      >
                        <option value="">Select service or enter custom...</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.service_name} - ${service.base_price}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Rate</Label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLineItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!item.service_id && (
                    <Input
                      placeholder="Custom description..."
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="col-span-12"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Client Province</Label>
              <Select value={province || undefined} onValueChange={handleProvinceChange}>
                <SelectTrigger><SelectValue placeholder="Select province (auto-fills tax rate)..." /></SelectTrigger>
                <SelectContent>
                  {CANADIAN_PROVINCES_AND_TERRITORIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="flex items-center gap-2">
                  Tax rate{provinceTaxInfo ? ` (${provinceTaxInfo.tax_system})` : ''}:
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRatePercent}
                    onChange={(e) => { setTaxRatePercent(e.target.value); setTaxRateTouched(true); }}
                    className="w-20 h-7 inline-block"
                  />
                  % {!province && (
                    <span className="text-xs text-muted-foreground">(select a province above, or set your own rate)</span>
                  )}
                </span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Terms, conditions, or additional information..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateLeadMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg"
              >
                {updateLeadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Create & Send Estimate
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}