import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceGenerator({ clientId, serviceFilingId, onSuccess }) {
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 0.05,
    terms: 'Net 30',
    notes: ''
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.entities.Client.get(clientId),
    enabled: !!clientId
  });

  const { data: serviceFiling } = useQuery({
    queryKey: ['serviceFiling', serviceFilingId],
    queryFn: () => api.entities.ServiceFiling.get(serviceFilingId),
    enabled: !!serviceFilingId
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      const invoiceCount = await api.entities.Invoice.list();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount.length + 1).padStart(4, '0')}`;
      
      return api.entities.Invoice.create({
        ...invoiceData,
        invoice_number: invoiceNumber
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice generated successfully');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to generate invoice');
    }
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = subtotal * formData.tax_rate;
  const total = subtotal + taxAmount;

  const handleGenerate = () => {
    if (lineItems.some(item => !item.description || item.rate === 0)) {
      toast.error('Please fill in all line items');
      return;
    }

    if (!formData.due_date) {
      toast.error('Please set a due date');
      return;
    }

    const invoiceData = {
      client_id: clientId,
      service_filing_id: serviceFilingId,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      line_items: lineItems,
      subtotal,
      tax_rate: formData.tax_rate,
      tax_amount: taxAmount,
      total_amount: total,
      balance_due: total,
      payment_status: 'Pending',
      terms: formData.terms,
      notes: formData.notes
    };

    generateInvoiceMutation.mutate(invoiceData);
  };

  return (
    <div className="space-y-6">
      {/* Client & Service Info */}
      {client && (
        <Card className="border-none shadow-sm bg-navy/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-navy">Bill To:</p>
                <p>{client.legal_name}</p>
                <p>{client.primary_email}</p>
              </div>
              {serviceFiling && (
                <div>
                  <p className="font-semibold text-navy">Service:</p>
                  <p>{serviceFiling.service_name}</p>
                  <p>Year: {serviceFiling.filing_year}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice_date">Invoice Date</Label>
          <Input
            id="invoice_date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      </div>

      {/* Line Items */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Service description"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Rate</Label>
                <Input
                  type="number"
                  value={item.rate}
                  onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  value={`$${item.amount.toFixed(2)}`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                >
                  <Trash2 className="w-4 h-4 text-red" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addLineItem}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="border-none shadow-sm bg-yellow/5">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span>Tax Rate:</span>
              <Input
                type="number"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-24 h-8 text-right"
                step="0.01"
                min="0"
                max="1"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({(formData.tax_rate * 100).toFixed(0)}%):</span>
              <span className="font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-navy pt-2 border-t">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="terms">Payment Terms</Label>
          <select
            id="terms"
            value={formData.terms}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg"
          >
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
            <option value="Upon Receipt">Upon Receipt</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes or payment instructions..."
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generateInvoiceMutation.isPending}
        className="w-full bg-yellow text-navy hover:bg-yellow-dark"
      >
        {generateInvoiceMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Invoice'
        )}
      </Button>
    </div>
  );
}