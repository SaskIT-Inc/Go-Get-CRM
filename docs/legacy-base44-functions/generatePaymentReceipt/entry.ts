import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, clientId } = await req.json();

    // Get payment details
    const payment = await base44.asServiceRole.entities.Payment.filter({ id: paymentId });
    if (!payment || payment.length === 0) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentData = payment[0];

    // Get invoice
    const invoice = await base44.asServiceRole.entities.Invoice.filter({ id: paymentData.invoice_id });
    const invoiceData = invoice[0];

    // Get client
    const client = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const clientData = client[0];

    // Generate PDF receipt
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.text('PAYMENT RECEIPT', 20, 20);

    doc.setFontSize(10);
    doc.text('GoGet CRM', 20, 30);
    doc.text('Professional Tax & Accounting Services', 20, 35);
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, 20, 40);

    // Receipt Details
    doc.setFontSize(12);
    doc.text('Receipt Information', 20, 55);
    doc.setFontSize(10);
    doc.text(`Transaction ID: ${paymentData.transaction_id}`, 20, 65);
    doc.text(`Payment Date: ${new Date(paymentData.payment_date).toLocaleDateString()}`, 20, 72);
    doc.text(`Payment Method: ${paymentData.payment_method}`, 20, 79);

    // Client Information
    doc.setFontSize(12);
    doc.text('Client Information', 20, 95);
    doc.setFontSize(10);
    doc.text(`Name: ${clientData.legal_name}`, 20, 105);
    doc.text(`Email: ${clientData.primary_email}`, 20, 112);

    // Invoice Information
    doc.setFontSize(12);
    doc.text('Invoice Details', 20, 128);
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoiceData.invoice_number}`, 20, 138);
    doc.text(`Invoice Date: ${new Date(invoiceData.invoice_date).toLocaleDateString()}`, 20, 145);

    // Payment Summary
    doc.setFontSize(14);
    doc.text('Payment Summary', 20, 165);
    
    doc.setFontSize(12);
    doc.text('Amount Paid:', 20, 180);
    doc.text(`$${paymentData.payment_amount.toFixed(2)}`, 150, 180);

    doc.text('Payment Status:', 20, 190);
    doc.text(paymentData.payment_status, 150, 190);

    // Footer
    doc.setFontSize(8);
    doc.text('Thank you for your payment!', 20, 270);
    doc.text('This is an official receipt for your records.', 20, 275);

    const pdfBytes = doc.output('arraybuffer');

    // Upload PDF to storage
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `receipt-${paymentData.transaction_id}.pdf`, { type: 'application/pdf' });
    
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: pdfFile
    });

    // Update payment record with receipt URL
    await base44.asServiceRole.entities.Payment.update(paymentId, {
      receipt_url: file_url
    });

    // Send receipt email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: clientData.primary_email,
      subject: `Payment Receipt - ${paymentData.transaction_id}`,
      body: `
        <h2>Payment Receipt</h2>
        <p>Thank you for your payment!</p>
        <p><strong>Transaction ID:</strong> ${paymentData.transaction_id}</p>
        <p><strong>Amount Paid:</strong> $${paymentData.payment_amount.toFixed(2)}</p>
        <p><strong>Date:</strong> ${new Date(paymentData.payment_date).toLocaleDateString()}</p>
        <p>Your receipt is attached to this email and can also be downloaded from your client portal.</p>
      `
    });

    return Response.json({
      success: true,
      receiptUrl: file_url,
      message: 'Receipt generated and emailed'
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});