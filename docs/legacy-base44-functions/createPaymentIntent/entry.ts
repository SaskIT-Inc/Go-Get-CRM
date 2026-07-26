import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = await import('npm:stripe@14.0.0').then(m => m.default);
const stripeClient = stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const { invoice_id, client_id, amount, description, client_email, invoice_number } = await req.json();

    console.log(`Creating payment intent for invoice ${invoice_number}, amount: ${amount}`);

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: description,
              description: `Invoice: ${invoice_number}`
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('PAYMENT_SUCCESS_URL') || 'http://localhost:5173'}/ClientBilling?payment=success&session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice_id}`,
      cancel_url: `${Deno.env.get('PAYMENT_CANCEL_URL') || 'http://localhost:5173'}/ClientBilling?payment=cancelled`,
      customer_email: client_email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        invoice_id,
        client_id,
        invoice_number
      }
    });

    console.log(`Checkout session created: ${session.id}`);

    return Response.json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});