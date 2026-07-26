import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    // Only trigger when status changes to "Documents Pending"
    if (data.status !== 'Documents Pending') {
      return Response.json({ 
        message: 'Status is not Documents Pending, skipping workflow',
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
    
    // Send email to client
    const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'GoGet Accounting',
      to: client.primary_email,
      subject: `Action Required: Documents Needed for ${data.service_name}`,
      body: `Dear ${client.primary_contact_name || client.legal_name},

We need additional documents to proceed with your ${data.service_name} filing for ${data.filing_year}.

Please upload the required documents at your earliest convenience to avoid delays.

Required documents:
${data.required_documents ? data.required_documents.join('\n- ') : 'Please contact us for details'}

Due Date: ${data.due_date ? new Date(data.due_date).toLocaleDateString() : 'TBD'}

You can upload documents through your client portal or reply to this email.

Thank you,
GoGet Accounting Team`
    });
    
    return Response.json({ 
      success: true,
      message: 'Document request email sent to client',
      client_email: client.primary_email,
      filing: data.service_name,
      email_result: emailResult
    });
    
  } catch (error) {
    console.error('Workflow error:', error);
    return Response.json({ 
      error: error.message,
      status: 'error' 
    }, { status: 500 });
  }
});