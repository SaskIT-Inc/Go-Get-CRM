import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event?.type !== 'update' || data?.status !== 'Completed') {
      return Response.json({ success: false, reason: 'Not a completion event' }, { status: 400 });
    }

    const filing = data;
    if (!filing.id || !filing.client_id || !filing.service_name) {
      return Response.json({ error: 'Missing required filing data' }, { status: 400 });
    }

    // Check if invoice already exists
    const existingInvoices = await base44.asServiceRole.entities.Invoice.filter({
      service_filing_id: filing.id
    });

    if (existingInvoices.length > 0) {
      return Response.json({ success: false, reason: 'Invoice already exists' });
    }

    // Fetch client and service details
    const client = await base44.asServiceRole.entities.Client.filter({ id: filing.client_id })
      .then(results => results[0]);

    const service = await base44.asServiceRole.entities.Service.filter({ 
      service_name: filing.service_name 
    }).then(results => results[0]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate invoice amount
    const basePrice = service?.base_price || 500;
    const subtotal = basePrice;
    const taxRate = client.province === 'Saskatchewan' ? 0.05 : 0.05; // GST/HST
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const invoiceCount = await base44.asServiceRole.entities.Invoice.list()
      .then(invoices => invoices.length + 1);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, '0')}`;

    // Create invoice
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNumber,
      client_id: filing.client_id,
      service_filing_id: filing.id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      line_items: [
        {
          description: filing.service_name,
          quantity: 1,
          rate: basePrice,
          amount: basePrice
        }
      ],
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_status: 'Pending',
      balance_due: totalAmount,
      terms: 'Net 30'
    });

    // Notify client about invoice via email
    await base44.integrations.Core.SendEmail({
      to: client.primary_email,
      subject: `Invoice ${invoiceNumber} - ${filing.service_name} Complete`,
      body: `Dear ${client.primary_contact_name || client.legal_name},\n\nYour ${filing.service_name} filing is now complete. Your invoice is ready for payment.\n\nInvoice Number: ${invoiceNumber}\nAmount Due: $${totalAmount.toFixed(2)}\nDue Date: ${invoice.due_date}\n\nPlease log into your account to view and pay your invoice.\n\nThank you,\nGoGet CRM Team`,
      from_name: 'GoGet CRM'
    });

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      total_amount: totalAmount
    });
  } catch (error) {
    console.error('Error in autoGenerateInvoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});