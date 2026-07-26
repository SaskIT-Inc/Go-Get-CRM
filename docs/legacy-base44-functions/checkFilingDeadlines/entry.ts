import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active service filings
    const filings = await base44.asServiceRole.entities.ServiceFiling.filter({
      status: { $in: ['Not Started', 'Documents Pending', 'In Progress'] }
    });
    
    const today = new Date();
    const remindersSent = [];
    
    for (const filing of filings) {
      if (!filing.due_date) continue;
      
      const dueDate = new Date(filing.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      // Send reminder 30 days before deadline
      if (daysUntilDue === 30) {
        const client = await base44.asServiceRole.entities.Client.get(filing.client_id);
        
        if (client && client.primary_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'GoGet Accounting',
            to: client.primary_email,
            subject: `⏰ Reminder: ${filing.service_name} Due in 30 Days`,
            body: `Dear ${client.primary_contact_name || client.legal_name},

This is a friendly reminder that your ${filing.service_name} filing for ${filing.filing_year} is due in 30 days.

Filing Details:
- Service: ${filing.service_name}
- Tax Year: ${filing.filing_year}
- Due Date: ${new Date(filing.due_date).toLocaleDateString()}
- Current Status: ${filing.status}

${filing.status === 'Documents Pending' ? `\nRequired Documents:\n${filing.required_documents?.join('\n- ') || 'Please contact us for details'}\n\nPlease upload these documents as soon as possible to ensure timely filing.` : ''}

${filing.status === 'Not Started' ? '\nWe will be reaching out soon to begin the filing process. Please ensure you have all necessary documents ready.' : ''}

You can check your filing status anytime through your client portal.

Thank you,
GoGet Accounting Team`
          });
          
          remindersSent.push({
            client: client.legal_name,
            filing: filing.service_name,
            due_date: filing.due_date,
            days_until_due: daysUntilDue
          });
        }
      }
    }
    
    return Response.json({ 
      success: true,
      message: `Processed ${filings.length} filings, sent ${remindersSent.length} reminders`,
      reminders_sent: remindersSent
    });
    
  } catch (error) {
    console.error('Deadline check error:', error);
    return Response.json({ 
      error: error.message,
      status: 'error' 
    }, { status: 500 });
  }
});