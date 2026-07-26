import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const filing = data;
    const assignedTo = filing.assigned_to;
    const clientId = filing.client_id;

    if (!assignedTo) {
      return Response.json({ success: true, message: 'No assignee' });
    }

    // Fetch client details
    let clientName = 'N/A';
    try {
      const client = await base44.entities.Client.filter({ id: clientId });
      if (client.length > 0) {
        clientName = client[0].legal_name || client[0].operating_name || 'Unknown Client';
      }
    } catch (e) {
      console.log('Could not fetch client details');
    }

    const subject = `New Filing Assignment: ${filing.service_name}`;
    const body = `
Hi,

A new filing has been assigned to you.

Service: ${filing.service_name}
Client: ${clientName}
Filing Year: ${filing.filing_year}
Due Date: ${filing.due_date || 'Not specified'}
Status: ${filing.status}

Please log in to the system to view the filing details and required documents.

Best regards,
GoGet CRM System
    `;

    await base44.integrations.Core.SendEmail({
      to: assignedTo,
      subject,
      body,
      from_name: 'GoGet CRM'
    });

    return Response.json({ success: true, message: 'Filing assignment email sent' });
  } catch (error) {
    console.error('Error in notifyFilingAssignment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});