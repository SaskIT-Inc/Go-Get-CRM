import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, body, documentType, documentFileName } = await req.json();

    console.log(`Sending ${documentType} document email to ${to}`);

    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send email via Base44 integration
    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: 'GoGet Accounting'
    });

    // Optional: Create activity log
    try {
      await base44.asServiceRole.entities.EmailDraft?.create({
        task_id: 'system-send',
        client_id: 'na',
        client_name: to,
        client_email: to,
        subject_line: subject,
        email_body: body,
        status: 'sent',
        sent_date: new Date().toISOString(),
        sent_by: user.email,
        notes: `Auto-sent ${documentType} document: ${documentFileName || 'document'}`
      });
    } catch (logError) {
      console.log('Note: Could not log email draft:', logError.message);
    }

    console.log(`Successfully sent ${documentType} document email to ${to}`);

    return Response.json({
      success: true,
      message: `${documentType} sent successfully to ${to}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending document email:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});