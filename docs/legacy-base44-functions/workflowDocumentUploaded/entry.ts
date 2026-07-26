import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    // Get client information
    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
    
    if (!client) {
      return Response.json({ 
        error: 'Client not found',
        status: 'error' 
      });
    }
    
    // Get assigned staff member from client or service filing
    let assignedStaff = client.assigned_to;
    
    // If no staff assigned to client, try to find from service filing
    if (!assignedStaff && data.service_filing_id) {
      const filing = await base44.asServiceRole.entities.ServiceFiling.get(data.service_filing_id);
      assignedStaff = filing?.assigned_to;
    }
    
    // Default to admin if no assignment found
    if (!assignedStaff) {
      const users = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      assignedStaff = users[0]?.email;
    }
    
    // Create a task/notification for the assigned staff
    const taskMessage = `New document uploaded by ${client.legal_name}`;
    const taskDetails = `Document: ${data.document_name}
Type: ${data.document_type}
Folder: ${data.folder || 'N/A'}
Tax Year: ${data.tax_year || 'N/A'}
Status: ${data.status}

Please review and process this document.`;
    
    // Send email notification to staff
    if (assignedStaff) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'GoGet CRM System',
        to: assignedStaff,
        subject: `📄 Task: Review Document - ${data.document_name}`,
        body: `${taskMessage}

Client: ${client.legal_name}

${taskDetails}

Action Required: Please review and update the document status in the system.

View Document: ${data.file_url}

This is an automated notification from the GoGet CRM workflow engine.`
      });
    }
    
    return Response.json({ 
      success: true,
      message: 'Task created for staff member',
      assigned_to: assignedStaff,
      client: client.legal_name,
      document: data.document_name
    });
    
  } catch (error) {
    console.error('Workflow error:', error);
    return Response.json({ 
      error: error.message,
      status: 'error' 
    }, { status: 500 });
  }
});