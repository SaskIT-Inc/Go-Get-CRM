import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();

    if (event.type === 'create' && data.status === 'Pending Review') {
        const client = await base44.asServiceRole.entities.Client.get(data.client_id);
        
        if (!client) {
            return Response.json({ error: 'Client not found' }, { status: 404 });
        }

        const emailBody = `
Dear ${client.primary_contact_name || client.legal_name},

This is to notify you that we require the following document for your service filing:

Document Type: ${data.document_type}
${data.folder ? `Folder: ${data.folder}` : ''}
${data.tax_year ? `Tax Year: ${data.tax_year}` : ''}
${data.description ? `\nDetails: ${data.description}` : ''}

Please upload this document at your earliest convenience through our client portal.

If you have any questions, please don't hesitate to reach out.

Best regards,
GoGet CRM Team
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'GoGet CRM',
            to: client.primary_email,
            subject: `Document Request: ${data.document_type}`,
            body: emailBody
        });

        return Response.json({ 
            success: true, 
            message: 'Document request notification sent',
            client_email: client.primary_email 
        });
    }

    return Response.json({ success: true, message: 'No notification required' });
});