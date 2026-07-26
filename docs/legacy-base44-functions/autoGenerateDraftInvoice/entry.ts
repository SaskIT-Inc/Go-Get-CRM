import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process completion events
    if (event.type !== 'update' || !data) {
      return Response.json({ success: true, message: 'No action needed' });
    }

    // Check if status changed to Completed or Filed
    const isCompleted = data.status === 'Completed' || data.status === 'Filed';
    if (!isCompleted) {
      return Response.json({ success: true, message: 'Status not completed' });
    }

    // Check if invoice already exists for this filing
    const existingInvoices = await base44.asServiceRole.entities.Invoice.filter({
      service_filing_id: data.id
    });

    if (existingInvoices.length > 0) {
      console.log(`Invoice already exists for filing ${data.id}`);
      return Response.json({ success: true, message: 'Invoice already exists' });
    }

    // Get service details for pricing
    const services = await base44.asServiceRole.entities.Service.filter({
      service_name: data.service_name
    });

    const service = services[0];
    const basePrice = service?.base_price || 0;
    const estimatedHours = service?.estimated_hours || 0;

    // Calculate invoice amounts
    const subtotal = basePrice;
    const taxRate = 0.05; // 5% GST (default system rate)
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number (YYYY-MM-NNNN format)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existingMonthInvoices = await base44.asServiceRole.entities.Invoice.list();
    const monthInvoices = existingMonthInvoices.filter(inv => 
      inv.invoice_number?.startsWith(yearMonth)
    );
    const invoiceNumber = `${yearMonth}-${String(monthInvoices.length + 1).padStart(4, '0')}`;

    // Create draft invoice
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_number: invoiceNumber,
      client_id: data.client_id,
      service_filing_id: data.id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      line_items: [
        {
          description: data.service_name,
          quantity: estimatedHours || 1,
          rate: basePrice / (estimatedHours || 1),
          amount: basePrice
        }
      ],
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      payment_status: 'Pending',
      terms: 'Net 30',
      sent_to_client: false,
      notes: `Auto-generated draft invoice for ${data.service_name} (Filing Year: ${data.filing_year})`
    });

    console.log(`✅ Draft invoice ${invoiceNumber} created for filing ${data.id}`);

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      message: 'Draft invoice generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating draft invoice:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
});