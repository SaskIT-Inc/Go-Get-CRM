import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const stripe = await import('npm:stripe@14.0.0').then(m => m.default);
const stripeClient = stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_id, invoice_id } = await req.json();

    console.log(`Processing successful payment for session: ${session_id}`);

    // Verify session with Stripe
    const session = await stripeClient.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      console.log('Payment not yet completed');
      return Response.json({ success: false, error: 'Payment not completed' }, { status: 400 });
    }

    // Update invoice payment status
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    
    const paymentAmount = session.amount_total / 100; // Convert from cents
    const balanceDue = invoice.total_amount - paymentAmount;

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      payment_status: balanceDue <= 0 ? 'Paid' : 'Partial',
      amount_paid: invoice.amount_paid + paymentAmount,
      balance_due: Math.max(0, balanceDue),
      payment_method: 'Credit Card',
      payment_date: new Date().toISOString().split('T')[0]
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      invoice_id,
      client_id: invoice.client_id,
      payment_amount: paymentAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Credit Card',
      transaction_id: session.payment_intent,
      payment_status: 'Completed',
      notes: `Stripe payment processed - Session ID: ${session_id}`
    });

    console.log(`Invoice ${invoice_id} payment processed successfully`);

    return Response.json({
      success: true,
      message: 'Payment recorded successfully',
      invoice_id,
      amount_paid: paymentAmount
    });

  } catch (error) {
    console.error('Error processing payment success:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});