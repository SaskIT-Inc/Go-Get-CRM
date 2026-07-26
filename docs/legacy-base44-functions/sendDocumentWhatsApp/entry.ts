import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientName, clientEmail, message, documentType, documentFileName } = await req.json();

    console.log(`Preparing WhatsApp message for ${clientName}`);

    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create WhatsApp Web URL with pre-filled message
    // Note: This generates a URL that can be opened to start WhatsApp conversation
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedMessage}`;

    console.log(`Prepared WhatsApp URL for ${clientName}`);

    return Response.json({
      success: true,
      message: 'WhatsApp message prepared',
      whatsappUrl,
      instructions: `Open the provided URL and select the contact for ${clientName} (${clientEmail}) to send the message`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error preparing WhatsApp message:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});