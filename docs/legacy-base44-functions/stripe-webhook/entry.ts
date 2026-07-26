import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.20.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      console.error('No stripe signature found');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Construct event from webhook payload
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    const base44 = createClientFromRequest(req);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoice_id;

      if (invoiceId) {
        // Fetch invoice
        const invoice = await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId })
          .then(results => results[0]);

        if (invoice) {
          // Update invoice status
          await base44.asServiceRole.entities.Invoice.update(invoiceId, {
            payment_status: 'Paid',
            amount_paid: paymentIntent.amount / 100,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Credit Card',
            balance_due: 0
          });

          // Send confirmation email
          const client = await base44.asServiceRole.entities.Client.filter({ 
            id: invoice.client_id 
          }).then(results => results[0]);

          if (client) {
            await base44.integrations.Core.SendEmail({
              to: client.primary_email,
              subject: `Payment Received - Invoice ${invoice.invoice_number}`,
              body: `Dear ${client.primary_contact_name || client.legal_name},\n\nThank you for your payment. We have received $${(paymentIntent.amount / 100).toFixed(2)} for invoice ${invoice.invoice_number}.\n\nYour account is now settled.\n\nThank you,\nGoGet CRM Team`,
              from_name: 'GoGet CRM'
            });
          }

          console.log(`Payment processed for invoice ${invoiceId}`);
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.error(`Payment failed for intent ${paymentIntent.id}:`, paymentIntent.last_payment_error);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});