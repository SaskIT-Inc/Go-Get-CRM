import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only trigger on ServiceFiling creation for T2, T4, GST/PST
    if (event.type !== 'create' || event.entity_name !== 'ServiceFiling') {
      return Response.json({ success: true, message: 'Not applicable' });
    }

    const filing = data;
    const filingTypes = ['T2 Corporate Tax', 'T4 Slips', 'GST/HST Filing', 'PST Filing'];

    // Check if this is a filing type that needs pipeline
    let filingType = null;
    if (filing.service_name?.includes('T2') || filing.service_name?.includes('Corporate Tax')) {
      filingType = 'T2 Corporate Tax';
    } else if (filing.service_name?.includes('T4')) {
      filingType = 'T4 Slips';
    } else if (filing.service_name?.includes('GST') || filing.service_name?.includes('HST')) {
      filingType = 'GST/HST Filing';
    } else if (filing.service_name?.includes('PST')) {
      filingType = 'PST Filing';
    }

    if (!filingType) {
      return Response.json({ success: true, message: 'Filing type does not require pipeline' });
    }

    // Create pipeline record
    const pipeline = await base44.asServiceRole.entities.FilingPipeline.create({
      service_filing_id: filing.id,
      client_id: filing.client_id,
      filing_type: filingType,
      current_stage: 'Client Data Collection',
      stage_history: [{
        stage: 'Client Data Collection',
        entered_date: new Date().toISOString(),
        completed_by: 'System',
        notes: 'Pipeline automatically created'
      }],
      data_collection_complete: false,
      internal_review_complete: false,
      manager_approved: false
    });

    // Send initial client notification
    const client = await base44.asServiceRole.entities.Client.filter({ id: filing.client_id });
    const clientData = client[0];

    if (clientData) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: clientData.primary_email,
        subject: `${filingType} - Data Collection Started`,
        body: `
          <h2>Filing Process Started</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>We have started processing your <strong>${filingType}</strong> for ${filing.filing_year}.</p>
          <p><strong>Current Stage:</strong> Client Data Collection</p>
          <p>Please ensure all required documents are uploaded to your client portal.</p>
          <p>You will receive email updates as your filing progresses through our review process.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      });
    }

    return Response.json({
      success: true,
      message: 'Filing pipeline created',
      pipelineId: pipeline.id
    });
  } catch (error) {
    console.error('Error creating filing pipeline:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});