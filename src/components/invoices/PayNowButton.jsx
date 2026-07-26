import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PayNowButton({ invoice, client, onPaymentSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFramed, setIsFramed] = useState(false);

  React.useEffect(() => {
    // Check if running in iframe
    setIsFramed(window.self !== window.top);
  }, []);

  const handlePayNow = async () => {
    if (isFramed) {
      toast.error('Checkout only works from a published app. Please access via the full app URL.');
      return;
    }

    if (!invoice || !client) {
      toast.error('Missing invoice or client information');
      return;
    }

    setIsProcessing(true);
    try {
      // Create Stripe checkout session
      const response = await api.functions.invoke('createPaymentIntent', {
        invoice_id: invoice.id,
        client_id: client.id,
        amount: Math.round(invoice.total_amount * 100), // Convert to cents
        description: `Invoice ${invoice.invoice_number} - ${invoice.line_items?.[0]?.description || 'Professional Services'}`,
        client_email: client.primary_email,
        invoice_number: invoice.invoice_number
      });

      if (response.data?.sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.data.sessionUrl;
      } else {
        toast.error('Failed to create payment session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!invoice || invoice.payment_status === 'Paid') {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={isProcessing}
        className="gap-2 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay Now
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${invoice.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax (GST):</span>
                  <span>${invoice.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${invoice.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {isFramed && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> You'll be redirected to a secure Stripe payment page.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayNow}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Processing...' : 'Proceed to Payment'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}