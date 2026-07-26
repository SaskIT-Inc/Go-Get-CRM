import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const emailTemplates = {
  invoice: {
    subject: 'Invoice: Payment Required',
    body: (invoiceNumber, clientName, totalAmount, dueDate, paymentLink) => `
Dear ${clientName},

Thank you for choosing our services. Please find your invoice details below:

**Invoice Number:** ${invoiceNumber}
**Total Amount:** $${totalAmount.toFixed(2)}
**Due Date:** ${new Date(dueDate).toLocaleDateString()}

---

**PAYMENT INSTRUCTIONS**

You can pay your invoice securely using the link below:

🔗 [PAY NOW - SECURE PAYMENT LINK](${paymentLink})

We accept the following payment methods:
• Credit Card (Visa, Mastercard, Amex)
• Bank Transfer
• E-Transfer

**Payment Terms:** ${dueDate ? 'Net 30 days from invoice date' : 'Due upon receipt'}

If you have any questions or need assistance, please don't hesitate to contact us.

Thank you for your business!

Best regards,
GoGet Accounting Team
`
  },
  filing: {
    subject: 'Filing Complete: Action Required',
    body: (serviceName, clientName, details, instructions) => `
Dear ${clientName},

We're pleased to inform you that your ${serviceName} filing is complete and ready for submission.

**Filing Details:**
${details}

**NEXT STEPS:**
${instructions}

If you need to make any changes or have questions about your filing, please reply to this email or contact us directly.

Thank you for your business!

Best regards,
GoGet Accounting Team
`
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId, filingId, type = 'invoice', includePaymentLink = true } = await req.json();

    if (!invoiceId && !filingId) {
      return Response.json({ error: 'Either invoiceId or filingId is required' }, { status: 400 });
    }

    let invoiceData, clientData, pdfBytes, emailSubject, emailBody, draftData;

    if (invoiceId) {
      // Fetch invoice data
      invoiceData = await base44.asServiceRole.entities.Invoice.read(invoiceId);
      if (!invoiceData) {
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Fetch client data
      clientData = await base44.asServiceRole.entities.Client.read(invoiceData.client_id);
      if (!clientData) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }

      // Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('INVOICE', 20, 20);

      doc.setFontSize(10);
      doc.text(`Invoice #: ${invoiceData.invoice_number}`, 20, 35);
      doc.text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString()}`, 20, 45);
      doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 20, 55);

      // Bill To
      doc.setFontSize(12);
      doc.text('Bill To:', 20, 75);
      doc.setFontSize(10);
      doc.text(`${clientData.legal_name || clientData.operating_name}`, 20, 85);
      if (clientData.primary_email) doc.text(clientData.primary_email, 20, 95);
      if (clientData.primary_phone) doc.text(clientData.primary_phone, 20, 105);

      // Line Items Table
      let yPos = 130;
      doc.setFontSize(10);
      doc.text('Description', 20, yPos);
      doc.text('Qty', 110, yPos);
      doc.text('Rate', 140, yPos);
      doc.text('Amount', 170, yPos);
      yPos += 10;

      if (invoiceData.line_items && Array.isArray(invoiceData.line_items)) {
        invoiceData.line_items.forEach((item) => {
          doc.text(item.description, 20, yPos);
          doc.text(item.quantity.toString(), 110, yPos);
          doc.text(`$${item.rate.toFixed(2)}`, 140, yPos);
          doc.text(`$${item.amount.toFixed(2)}`, 170, yPos);
          yPos += 10;
        });
      }

      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      // Totals
      doc.setFontSize(11);
      doc.text(`Subtotal: $${invoiceData.subtotal.toFixed(2)}`, 140, yPos);
      yPos += 10;
      doc.text(`Tax (${(invoiceData.tax_rate * 100).toFixed(1)}%): $${invoiceData.tax_amount.toFixed(2)}`, 140, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`TOTAL: $${invoiceData.total_amount.toFixed(2)}`, 140, yPos);

      // Payment instructions
      yPos += 20;
      doc.setFontSize(10);
      doc.text('Payment Instructions:', 20, yPos);
      yPos += 8;
      doc.text('Please remit payment by the due date above.', 20, yPos);
      yPos += 8;
      doc.text(`Terms: ${invoiceData.terms || 'Net 30'}`, 20, yPos);

      pdfBytes = doc.output('arraybuffer');

      // Create payment link (placeholder)
      const paymentLink = `https://pay.goget.ca/invoice/${invoiceId}`;

      // Generate email template
      const template = emailTemplates.invoice;
      emailSubject = template.subject;
      emailBody = template.body(
        invoiceData.invoice_number,
        clientData.legal_name || clientData.operating_name,
        invoiceData.total_amount,
        invoiceData.due_date,
        includePaymentLink ? paymentLink : ''
      );

      draftData = {
        task_id: '', // Will be linked if created from a task
        client_id: invoiceData.client_id,
        client_name: clientData.legal_name || clientData.operating_name,
        client_email: clientData.primary_email,
        subject_line: emailSubject,
        email_body: emailBody,
        key_points: [
          `Invoice #${invoiceData.invoice_number}`,
          `Amount due: $${invoiceData.total_amount.toFixed(2)}`,
          `Due: ${new Date(invoiceData.due_date).toLocaleDateString()}`,
          'Secure payment link included'
        ],
        status: 'draft',
        due_date: invoiceData.due_date
      };
    } else if (filingId) {
      // Fetch filing data
      const filingData = await base44.asServiceRole.entities.ServiceFiling.read(filingId);
      if (!filingData) {
        return Response.json({ error: 'Filing not found' }, { status: 404 });
      }

      // Fetch client data
      clientData = await base44.asServiceRole.entities.Client.read(filingData.client_id);
      if (!clientData) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }

      // Generate PDF for filing
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('FILING SUMMARY', 20, 20);

      doc.setFontSize(10);
      doc.text(`Service: ${filingData.service_name}`, 20, 35);
      doc.text(`Year: ${filingData.filing_year}`, 20, 45);
      doc.text(`Status: ${filingData.status}`, 20, 55);
      doc.text(`Due Date: ${new Date(filingData.due_date).toLocaleDateString()}`, 20, 65);

      doc.setFontSize(12);
      doc.text('Client Information:', 20, 85);
      doc.setFontSize(10);
      doc.text(`${clientData.legal_name || clientData.operating_name}`, 20, 95);

      doc.setFontSize(12);
      doc.text('Required Documents:', 20, 115);
      doc.setFontSize(10);
      let yPos = 125;
      if (filingData.required_documents && Array.isArray(filingData.required_documents)) {
        filingData.required_documents.forEach((doc_type) => {
          doc.text(`• ${doc_type}`, 25, yPos);
          yPos += 8;
        });
      }

      pdfBytes = doc.output('arraybuffer');

      // Generate email template for filing
      const template = emailTemplates.filing;
      emailSubject = template.subject;
      const details = `Service: ${filingData.service_name}\nYear: ${filingData.filing_year}\nStatus: ${filingData.status}`;
      const instructions = `Please review your filing details and ensure all required documents are submitted by ${new Date(filingData.due_date).toLocaleDateString()}.`;
      emailBody = template.body(
        filingData.service_name,
        clientData.legal_name || clientData.operating_name,
        details,
        instructions
      );

      draftData = {
        filing_id: filingId,
        client_id: filingData.client_id,
        client_name: clientData.legal_name || clientData.operating_name,
        client_email: clientData.primary_email,
        subject_line: emailSubject,
        email_body: emailBody,
        key_points: [
          `Filing: ${filingData.service_name}`,
          `Year: ${filingData.filing_year}`,
          `Status: ${filingData.status}`,
          `Due: ${new Date(filingData.due_date).toLocaleDateString()}`
        ],
        status: 'draft',
        due_date: filingData.due_date
      };
    }

    // Create email draft
    const createdDraft = await base44.asServiceRole.entities.EmailDraft.create(draftData);

    return Response.json({
      success: true,
      message: 'Invoice/Filing PDF generated and email draft created successfully',
      draftId: createdDraft.id,
      draftEmail: createdDraft.client_email,
      pdfGenerated: true,
      readyToSend: true
    });
  } catch (error) {
    console.error('Error in generateInvoicePDFAndDraftEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});