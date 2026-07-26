import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();

    if (event.type === 'update' && old_data && data.status !== old_data.status) {
        const notifiableStatuses = ['Filed', 'Completed', 'Review'];
        
        if (notifiableStatuses.includes(data.status)) {
            const client = await base44.asServiceRole.entities.Client.get(data.client_id);
            
            if (!client) {
                return Response.json({ error: 'Client not found' }, { status: 404 });
            }

            const statusMessages = {
                'Filed': 'Your tax filing has been successfully submitted to the CRA.',
                'Completed': 'Your tax filing has been completed and is now finalized.',
                'Review': 'Your tax filing is currently under review by our team.'
            };

            const emailBody = `
Dear ${client.primary_contact_name || client.legal_name},

We wanted to update you on the status of your service filing:

Service: ${data.service_name}
Filing Year: ${data.filing_year}
New Status: ${data.status}

${statusMessages[data.status]}

${data.filed_date ? `Filed Date: ${new Date(data.filed_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${data.due_date ? `Due Date: ${new Date(data.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${data.notes ? `\nNotes: ${data.notes}` : ''}

You can view the full details in your client portal.

Best regards,
GoGet CRM Team
            `.trim();

            await base44.asServiceRole.integrations.Core.SendEmail({
                from_name: 'GoGet CRM',
                to: client.primary_email,
                subject: `Filing Status Update: ${data.service_name} - ${data.status}`,
                body: emailBody
            });

            return Response.json({ 
                success: true, 
                message: 'Filing status notification sent',
                status_change: `${old_data.status} → ${data.status}`,
                client_email: client.primary_email
            });
        }
    }

    return Response.json({ success: true, message: 'No notification required' });
});