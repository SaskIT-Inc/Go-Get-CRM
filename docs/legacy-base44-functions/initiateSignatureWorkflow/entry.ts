import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    console.log(`Processing signature workflow for ${event.entity_name} ${event.entity_id}`);

    // Handle ServiceFiling Signature Request (Tax Returns)
    if (event.entity_name === 'ServiceFiling') {
      const filing = data || await base44.asServiceRole.entities.ServiceFiling.get(event.entity_id);
      
      // Trigger when status changes to "Review" (indicating it's ready for signature)
      if (old_data?.status !== 'Review' && filing.status === 'Review') {
        const client = await base44.asServiceRole.entities.Client.get(filing.client_id);
        
        if (client?.primary_email) {
          // Create signature request record
          const signatureRequest = await base44.asServiceRole.entities.Signature.create({
            document_id: filing.id,
            service_filing_id: filing.id,
            requested_from_email: client.primary_email,
            status: 'pending',
            request_date: new Date().toISOString(),
            message: `Please review and sign the ${filing.service_name} documentation for tax year ${filing.filing_year}`
          });

          // Send notification email with signature instructions
          const emailContent = generateSignatureRequestEmail(client, filing, 'tax_return', signatureRequest);
          
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: client.primary_email,
            subject: emailContent.subject,
            body: emailContent.body,
            from_name: 'GoGet Accounting'
          });

          console.log(`Signature request created and notification sent to ${client.primary_email} for filing ${filing.service_name}`);
        }
      }
    }

    // Handle Retainer Agreement Signature Request
    if (event.entity_name === 'Retainer') {
      const retainer = data || await base44.asServiceRole.entities.Retainer.get(event.entity_id);
      
      // Trigger when status changes to "sent_for_signature"
      if (old_data?.status !== 'sent_for_signature' && retainer.status === 'sent_for_signature') {
        const client = await base44.asServiceRole.entities.Client.get(retainer.client_id);
        
        if (client?.primary_email) {
          // Create signature request record
          const signatureRequest = await base44.asServiceRole.entities.Signature.create({
            document_id: retainer.id,
            service_filing_id: retainer.estimate_id,
            requested_from_email: client.primary_email,
            status: 'pending',
            request_date: new Date().toISOString(),
            message: `Please review and sign the Retainer Agreement ${retainer.retainer_number}`
          });

          // Send notification email with signature instructions
          const emailContent = generateSignatureRequestEmail(client, retainer, 'retainer_agreement', signatureRequest);
          
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: client.primary_email,
            subject: emailContent.subject,
            body: emailContent.body,
            from_name: 'GoGet Accounting'
          });

          console.log(`Signature request created and notification sent to ${client.primary_email} for retainer ${retainer.retainer_number}`);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Signature workflow initiated successfully' 
    });

  } catch (error) {
    console.error('Error initiating signature workflow:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function generateSignatureRequestEmail(client, document, documentType, signatureRequest) {
  const documentTitle = documentType === 'tax_return' 
    ? `${document.service_name} - Tax Year ${document.filing_year}`
    : `Retainer Agreement ${document.retainer_number}`;

  const documentDetails = documentType === 'tax_return'
    ? `
**Filing Details:**
- Service: ${document.service_name}
- Tax Year: ${document.filing_year}
- Filing Status: Ready for Review
- Services Included: ${document.required_documents?.join(', ') || 'Standard tax filing documentation'}`
    : `
**Retainer Details:**
- Retainer Number: ${document.retainer_number}
- Monthly Fee: $${document.total_monthly_fee?.toFixed(2)}
- Annual Fee: $${document.total_annual_fee?.toFixed(2)}
- Services: ${document.services?.map(s => s.service_name).join(', ') || 'Professional accounting services'}
- Start Date: ${document.start_date}`;

  return {
    subject: `Signature Required: ${documentTitle}`,
    body: `Dear ${client.legal_name},

We have prepared ${documentType === 'tax_return' ? 'your tax return documentation' : 'your retainer agreement'} and need your digital signature to finalize the process.

${documentDetails}

**Signature Instructions:**

1. Click the secure signing link below to review the document
2. Carefully review all details and terms
3. Sign electronically using your preferred method
4. Submit the signed document through the portal

**Secure Signing Link:**
[Signature Portal - ${signatureRequest.id}]

**Timeline:**
- Signature Request Sent: ${new Date(signatureRequest.request_date).toLocaleDateString()}
- Signature Link Expires: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()} (14 days)

**What Happens Next:**
Once you sign, we will:
1. Receive and verify your signature
2. File the necessary documents with CRA (if applicable)
3. Send you a confirmation email with copies for your records

**Questions?**
If you have any questions about the ${documentType === 'tax_return' ? 'tax filing' : 'retainer agreement'} or need clarification on any terms, please reply to this email or contact us directly.

Thank you for your prompt attention to this matter.

Best regards,
GoGet Accounting Team
Phone: [Phone Number]
Email: [Support Email]

---
Message Reference: ${signatureRequest.id}`
  };
}