import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    console.log(`Processing service filing: ${data.id} - Status: ${data.status}`);

    // Only generate invoice on filing completion
    if (data.status !== 'Filed' && data.status !== 'Completed') {
      console.log('Filing not in completed state, skipping invoice generation');
      return Response.json({ success: true, skipped: true });
    }

    // Check if invoice already exists for this filing
    const existingInvoices = await base44.asServiceRole.entities.Invoice.filter({
      service_filing_id: data.id
    });

    if (existingInvoices.length > 0) {
      console.log('Invoice already exists for this filing');
      return Response.json({ success: true, alreadyExists: true });
    }

    // Fetch the service to get pricing
    const service = await base44.asServiceRole.entities.Service.filter({
      service_name: data.service_name
    });

    const serviceData = service[0];
    const basePrice = serviceData?.base_price || 0;

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const lineItems = [
      {
        description: data.service_name,
        quantity: 1,
        rate: basePrice,
        amount: basePrice
      }
    ];

    const subtotal = basePrice;
    const taxRate = 0.05; // 5% GST
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNumber,
      client_id: data.client_id,
      service_filing_id: data.id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_due: totalAmount,
      payment_status: 'Pending',
      terms: 'Net 30',
      sent_to_client: false,
      notes: `Auto-generated invoice for ${data.service_name} filing`
    });

    console.log(`Successfully created invoice ${invoiceNumber} for filing ${data.id}`);

    return Response.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoiceNumber,
        total_amount: totalAmount
      }
    });

  } catch (error) {
    console.error('Error generating invoice from filing:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});