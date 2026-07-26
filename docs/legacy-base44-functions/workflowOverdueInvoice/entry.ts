import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data, old_data } = payload;
    
    // Only trigger when payment_status changes to "Overdue"
    // Check if this is a status change (not initial creation)
    if (event.type === 'create' || data.payment_status !== 'Overdue') {
      return Response.json({ 
        message: 'Not an overdue status change, skipping workflow',
        status: 'skipped' 
      });
    }
    
    // Check if status actually changed to Overdue (wasn't already Overdue)
    if (old_data && old_data.payment_status === 'Overdue') {
      return Response.json({ 
        message: 'Invoice was already overdue, skipping duplicate late fee',
        status: 'skipped' 
      });
    }
    
    // Get client information
    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
    
    if (!client || !client.primary_email) {
      return Response.json({ 
        error: 'Client not found or missing email',
        status: 'error' 
      });
    }
    
    // Calculate late fee (5% of balance due)
    const lateFeeRate = 0.05;
    const lateFeeAmount = (data.balance_due || 0) * lateFeeRate;
    
    // Generate late fee invoice
    const lateFeeInvoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: `${data.invoice_number}-LATE`,
      client_id: data.client_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
      line_items: [
        {
          description: `Late Payment Fee for Invoice ${data.invoice_number}`,
          quantity: 1,
          rate: lateFeeAmount,
          amount: lateFeeAmount
        }
      ],
      subtotal: lateFeeAmount,
      tax_rate: 0.05,
      tax_amount: lateFeeAmount * 0.05,
      total_amount: lateFeeAmount * 1.05,
      balance_due: lateFeeAmount * 1.05,
      amount_paid: 0,
      payment_status: 'Pending',
      terms: 'Net 15',
      notes: `This is a late payment fee (${lateFeeRate * 100}%) for overdue invoice ${data.invoice_number}. Original invoice amount: $${data.balance_due.toFixed(2)}`
    });
    
    // Send notification email to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'GoGet Accounting',
      to: client.primary_email,
      subject: `⚠️ Overdue Invoice Notice & Late Fee - ${data.invoice_number}`,
      body: `Dear ${client.primary_contact_name || client.legal_name},

This is to notify you that invoice ${data.invoice_number} is now overdue.

Original Invoice Details:
- Invoice Number: ${data.invoice_number}
- Original Due Date: ${new Date(data.due_date).toLocaleDateString()}
- Outstanding Balance: $${data.balance_due.toFixed(2)}

Late Fee Applied:
A late payment fee of ${lateFeeRate * 100}% has been automatically applied to your account.
- Late Fee Amount: $${lateFeeAmount.toFixed(2)}
- Late Fee Invoice: ${lateFeeInvoice.invoice_number}
- New Due Date: ${new Date(lateFeeInvoice.due_date).toLocaleDateString()}

Total Amount Now Due: $${(data.balance_due + lateFeeInvoice.total_amount).toFixed(2)}

Please remit payment immediately to avoid additional fees.

If you have already made payment, please disregard this notice and contact us to update our records.

Payment Options:
- E-Transfer
- Bank Transfer
- Credit Card

Thank you for your prompt attention to this matter.

GoGet Accounting Team`
    });
    
    return Response.json({ 
      success: true,
      message: 'Late fee invoice generated and client notified',
      original_invoice: data.invoice_number,
      late_fee_invoice: lateFeeInvoice.invoice_number,
      late_fee_amount: lateFeeAmount,
      client_email: client.primary_email
    });
    
  } catch (error) {
    console.error('Workflow error:', error);
    return Response.json({ 
      error: error.message,
      status: 'error' 
    }, { status: 500 });
  }
});