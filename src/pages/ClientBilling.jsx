import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, FileText, Check, Clock, AlertCircle, Download } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

// Only initialize Stripe if the key is available; the actual payment redirects to backend checkout
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function PaymentForm({ invoice, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      // Create payment intent on backend
      const response = await api.functions.invoke('createPaymentIntent', {
        invoice_id: invoice.id,
        amount: Math.round(invoice.total_amount * 100)
      });

      if (!response.data?.client_secret) {
        throw new Error('Failed to create payment intent');
      }

      // Confirm payment
      const result = await stripe.confirmCardPayment(response.data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: invoice.client_name,
            email: invoice.client_email
          }
        }
      });

      if (result.error) {
        toast.error(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        toast.success('Payment successful');
        onSuccess();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-4">
      <div className="border rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '14px',
                color: '#32325d'
              }
            }
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? 'Processing...' : `Pay $${invoice.total_amount.toFixed(2)}`}
      </Button>
    </form>
  );
}

function InvoiceList() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: client } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: () => api.entities.Client.filter({ primary_email: user?.email })
      .then(results => results[0]),
    enabled: !!user
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['clientInvoices', client?.id],
    queryFn: () => api.entities.Invoice.filter({ client_id: client?.id }),
    enabled: !!client
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-amber-100 text-amber-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <Check className="w-4 h-4" />;
      case 'Overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const totalOutstanding = invoices
    .filter(inv => inv.payment_status !== 'Paid')
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-8 h-8" />
          Billing & Invoices
        </h1>
        <p className="text-muted-foreground mt-2">View and pay your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">${totalOutstanding.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${invoices
                .filter(inv => inv.payment_status === 'Paid')
                .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
                .toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No invoices yet</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="font-semibold">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-lg">${invoice.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Balance: ${invoice.balance_due?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(invoice.payment_status)} flex items-center gap-1`}>
                    {getStatusIcon(invoice.payment_status)}
                    {invoice.payment_status}
                  </Badge>
                  {invoice.payment_status !== 'Paid' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setPaymentOpen(true);
                      }}
                      className="ml-4"
                    >
                      Pay Now
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      {selectedInvoice && (
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pay Invoice {selectedInvoice.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-t border-b py-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${selectedInvoice.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${selectedInvoice.tax_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Due</span>
                  <span>${selectedInvoice.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    invoice={selectedInvoice}
                    onSuccess={() => {
                      setPaymentOpen(false);
                      setSelectedInvoice(null);
                    }}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Payment unavailable — Stripe is not configured.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function ClientBillingPage() {
  return <InvoiceList />;
}