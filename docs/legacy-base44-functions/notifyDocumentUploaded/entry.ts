import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();

    if (event.type === 'create') {
        const client = await base44.asServiceRole.entities.Client.get(data.client_id);
        
        if (!client || !client.assigned_to) {
            return Response.json({ success: true, message: 'No assigned team member' });
        }

        const emailBody = `
Hello,

A new document has been uploaded by the client:

Client: ${client.legal_name}
Document: ${data.document_name}
Type: ${data.document_type}
${data.folder ? `Folder: ${data.folder}` : ''}
${data.tax_year ? `Tax Year: ${data.tax_year}` : ''}
Status: ${data.status}

Please review the document in the client portal.

Best regards,
GoGet CRM System
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'GoGet CRM',
            to: client.assigned_to,
            subject: `New Document Upload: ${client.legal_name}`,
            body: emailBody
        });

        return Response.json({ 
            success: true, 
            message: 'Team notification sent',
            team_member: client.assigned_to
        });
    }

    return Response.json({ success: true, message: 'No notification required' });
});