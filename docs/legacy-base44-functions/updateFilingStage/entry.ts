import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pipelineId, newStage, notes } = await req.json();

    // Get pipeline record
    const pipeline = await base44.entities.FilingPipeline.filter({ id: pipelineId });
    if (!pipeline || pipeline.length === 0) {
      return Response.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const pipelineData = pipeline[0];

    // Get client and service filing
    const client = await base44.entities.Client.filter({ id: pipelineData.client_id });
    const serviceFiling = await base44.entities.ServiceFiling.filter({ id: pipelineData.service_filing_id });

    const clientData = client[0];
    const filingData = serviceFiling[0];

    // Update stage history
    const stageHistory = pipelineData.stage_history || [];
    stageHistory.push({
      stage: newStage,
      entered_date: new Date().toISOString(),
      completed_by: user.email,
      notes: notes || ''
    });

    // Prepare update data
    const updateData = {
      current_stage: newStage,
      stage_history: stageHistory,
      stage_notes: notes || ''
    };

    // Stage-specific updates
    if (newStage === 'Internal Review') {
      updateData.data_collection_complete = true;
    } else if (newStage === 'Manager Approval') {
      updateData.internal_review_complete = true;
    } else if (newStage === 'CRA Submission') {
      updateData.manager_approved = true;
      updateData.manager_approved_by = user.email;
      updateData.manager_approval_date = new Date().toISOString();
    } else if (newStage === 'Final Filing Confirmation') {
      updateData.cra_submission_date = new Date().toISOString();
    } else if (newStage === 'Completed') {
      updateData.final_confirmation_date = new Date().toISOString();
    }

    // Update pipeline
    await base44.entities.FilingPipeline.update(pipelineId, updateData);

    // Update service filing status
    const filingStatusMap = {
      'Client Data Collection': 'Documents Pending',
      'Internal Review': 'In Progress',
      'Manager Approval': 'Review',
      'CRA Submission': 'Review',
      'Final Filing Confirmation': 'Filed',
      'Completed': 'Completed'
    };
    
    await base44.entities.ServiceFiling.update(pipelineData.service_filing_id, {
      status: filingStatusMap[newStage]
    });

    // Send client notification email
    const stageMessages = {
      'Client Data Collection': {
        subject: `${pipelineData.filing_type} - Data Collection Started`,
        body: `
          <h2>Filing Process Started</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>We have started processing your <strong>${pipelineData.filing_type}</strong> for ${filingData.filing_year}.</p>
          <p><strong>Current Stage:</strong> Client Data Collection</p>
          <p>Please ensure all required documents are uploaded to your client portal.</p>
          <p>If you have any questions, please contact us.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      },
      'Internal Review': {
        subject: `${pipelineData.filing_type} - Under Internal Review`,
        body: `
          <h2>Filing Under Review</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>We have received all required documents for your <strong>${pipelineData.filing_type}</strong>.</p>
          <p><strong>Current Stage:</strong> Internal Review</p>
          <p>Our team is now reviewing your filing for accuracy and completeness.</p>
          <p>We will notify you once the review is complete.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      },
      'Manager Approval': {
        subject: `${pipelineData.filing_type} - Manager Approval Stage`,
        body: `
          <h2>Filing Awaiting Final Approval</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>Your <strong>${pipelineData.filing_type}</strong> has completed internal review.</p>
          <p><strong>Current Stage:</strong> Manager Approval</p>
          <p>We are conducting a final review before submission to CRA.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      },
      'CRA Submission': {
        subject: `${pipelineData.filing_type} - Submitted to CRA`,
        body: `
          <h2>Filing Submitted to CRA</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>Great news! Your <strong>${pipelineData.filing_type}</strong> has been approved and submitted to CRA.</p>
          <p><strong>Current Stage:</strong> CRA Submission</p>
          <p>We are awaiting confirmation from CRA.</p>
          <p>You will be notified once we receive the confirmation.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      },
      'Final Filing Confirmation': {
        subject: `${pipelineData.filing_type} - CRA Confirmation Received`,
        body: `
          <h2>CRA Confirmation Received</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>We have received confirmation from CRA for your <strong>${pipelineData.filing_type}</strong>.</p>
          <p><strong>Current Stage:</strong> Final Filing Confirmation</p>
          ${updateData.cra_confirmation_number ? `<p><strong>CRA Confirmation Number:</strong> ${updateData.cra_confirmation_number}</p>` : ''}
          <p>We are preparing your final documentation.</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      },
      'Completed': {
        subject: `${pipelineData.filing_type} - Filing Complete`,
        body: `
          <h2>Filing Process Complete</h2>
          <p>Dear ${clientData.legal_name},</p>
          <p>Your <strong>${pipelineData.filing_type}</strong> for ${filingData.filing_year} has been successfully completed!</p>
          <p><strong>Status:</strong> Completed</p>
          ${updateData.cra_confirmation_number ? `<p><strong>CRA Confirmation Number:</strong> ${updateData.cra_confirmation_number}</p>` : ''}
          <p>All documentation is available in your client portal.</p>
          <p>Thank you for choosing GoGet CRM!</p>
          <p>Best regards,<br>GoGet CRM Team</p>
        `
      }
    };

    if (stageMessages[newStage]) {
      await base44.integrations.Core.SendEmail({
        to: clientData.primary_email,
        subject: stageMessages[newStage].subject,
        body: stageMessages[newStage].body
      });
    }

    return Response.json({
      success: true,
      message: `Pipeline updated to ${newStage}`,
      emailSent: !!stageMessages[newStage]
    });
  } catch (error) {
    console.error('Error updating filing stage:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});