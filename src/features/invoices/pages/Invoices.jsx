import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import InvoiceGenerator from '@/features/invoices/components/InvoiceGenerator';
import InvoiceCard from '@/features/invoices/components/InvoiceCard';
import { toast } from 'sonner';

export default function Invoices() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer'
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.filter({ status: 'Active' })
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings', selectedClient?.id],
    queryFn: () =>
      selectedClient
        ? api.entities.ServiceFiling.filter({ 
            client_id: selectedClient.id,
            status: 'Completed'
          })
        : Promise.resolve([]),
    enabled: !!selectedClient
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data) => {
      const newAmountPaid = selectedInvoice.amount_paid + parseFloat(data.amount);
      const newBalance = selectedInvoice.total_amount - newAmountPaid;
      
      let newStatus = 'Pending';
      if (newBalance <= 0) newStatus = 'Paid';
      else if (newAmountPaid > 0) newStatus = 'Partial';
      
      return api.entities.Invoice.update(selectedInvoice.id, {
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        payment_status: newStatus,
        payment_method: data.payment_method,
        payment_date: data.payment_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      toast.success('Payment recorded successfully');
    }
  });

  // Update overdue invoices
  useEffect(() => {
    const updateOverdueInvoices = async () => {
      const now = new Date();
      const overdueInvoices = invoices.filter(
        inv => inv.payment_status !== 'Paid' && new Date(inv.due_date) < now
      );
      
      for (const invoice of overdueInvoices) {
        if (invoice.payment_status !== 'Overdue') {
          await api.entities.Invoice.update(invoice.id, { payment_status: 'Overdue' });
        }
      }
      
      if (overdueInvoices.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    };
    
    if (invoices.length > 0) {
      updateOverdueInvoices();
    }
  }, [invoices]);

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.balance_due,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer'
    });
    setShowPaymentDialog(true);
  };

  const filteredInvoices = invoices.filter(inv => {
    const client = clients.find(c => c.id === inv.client_id);
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || inv.payment_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const outstanding = totalRevenue - paidAmount;
  const overdueCount = invoices.filter(inv => inv.payment_status === 'Overdue').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Invoices</h1>
          <p className="text-muted-foreground">Manage client invoices and payments</p>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-yellow text-navy hover:bg-yellow-dark gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-navy" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-navy">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-dark">${outstanding.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="bg-muted">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Paid">Paid</TabsTrigger>
                <TabsTrigger value="Overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No invoices found</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first invoice to get started
            </p>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="bg-yellow text-navy hover:bg-yellow-dark"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              client={clients.find(c => c.id === invoice.client_id)}
              onRecordPayment={handleRecordPayment}
            />
          ))}
        </div>
      )}

      {/* Generate Invoice Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate New Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Client *</Label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value);
                  setSelectedClient(client);
                  setSelectedFiling(null);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg"
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.legal_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="space-y-2">
                <Label>Link to Service Filing (Optional)</Label>
                <select
                  value={selectedFiling?.id || ''}
                  onChange={(e) => {
                    const filing = serviceFilings.find(f => f.id === e.target.value);
                    setSelectedFiling(filing);
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                >
                  <option value="">No service filing</option>
                  {serviceFilings.map(filing => (
                    <option key={filing.id} value={filing.id}>
                      {filing.service_name} - {filing.filing_year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedClient && (
              <InvoiceGenerator
                clientId={selectedClient.id}
                serviceFilingId={selectedFiling?.id}
                onSuccess={() => {
                  setShowGenerateDialog(false);
                  setSelectedClient(null);
                  setSelectedFiling(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="font-bold text-navy">{selectedInvoice.invoice_number}</p>
                <p className="text-sm mt-2">
                  Balance Due: <span className="font-bold text-red">${selectedInvoice.balance_due?.toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  min="0"
                  max={selectedInvoice.balance_due}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <select
                  id="payment_method"
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="E-Transfer">E-Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Button
                onClick={() => recordPaymentMutation.mutate(paymentData)}
                disabled={recordPaymentMutation.isPending || paymentData.amount <= 0}
                className="w-full bg-yellow text-navy hover:bg-yellow-dark"
              >
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}