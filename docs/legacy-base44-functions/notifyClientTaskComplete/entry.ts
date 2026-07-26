import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    console.log('Task completion notification triggered:', event);

    // Only process update events where status changed to Complete
    if (event.type !== 'update') {
      console.log('Not an update event, skipping');
      return Response.json({ message: 'Not an update event' });
    }

    if (data.status !== 'Complete') {
      console.log('Task not marked as Complete, skipping');
      return Response.json({ message: 'Task not complete' });
    }

    if (old_data?.status === 'Complete') {
      console.log('Task was already complete, skipping duplicate notification');
      return Response.json({ message: 'Already notified' });
    }

    // Only send notifications for tasks associated with clients
    if (!data.client_id) {
      console.log('Task not associated with a client, skipping');
      return Response.json({ message: 'No client association' });
    }

    // Fetch client details
    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
    if (!client || !client.primary_email) {
      console.log('Client not found or no email available');
      return Response.json({ error: 'Client email not available' }, { status: 400 });
    }

    // Fetch service filing if available for more context
    let filingInfo = '';
    if (data.service_filing_id) {
      try {
        const filing = await base44.asServiceRole.entities.ServiceFiling.get(data.service_filing_id);
        filingInfo = `\n**Related Service:** ${filing.service_name} - ${filing.filing_year}`;
      } catch (error) {
        console.log('Could not fetch filing info:', error.message);
      }
    }

    // Fetch assigned team member
    let completedBy = 'Our Team';
    if (data.assigned_to) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const assignedUser = users.find(u => u.email === data.assigned_to);
        completedBy = assignedUser?.full_name || data.assigned_to;
      } catch (error) {
        console.log('Could not fetch user info:', error.message);
      }
    }

    // Generate completion date
    const completionDate = data.completed_date 
      ? new Date(data.completed_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

    // Calculate time to completion if start date available
    let timeInfo = '';
    if (data.start_date && data.completed_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.completed_date);
      const daysTaken = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      timeInfo = `\n**Completion Time:** ${daysTaken} day${daysTaken !== 1 ? 's' : ''}`;
    }

    // Hours spent info
    let hoursInfo = '';
    if (data.actual_hours) {
      hoursInfo = `\n**Time Spent:** ${data.actual_hours} hours`;
    } else if (data.estimated_hours) {
      hoursInfo = `\n**Estimated Time:** ${data.estimated_hours} hours`;
    }

    // Generate email content
    const subject = `Task Complete: ${data.title}`;
    
    const emailBody = `Dear ${client.primary_contact_name || client.legal_name},

Great news! We have successfully completed the following task for your account:

**Task Details:**
- **Title:** ${data.title}
- **Completion Date:** ${completionDate}
- **Completed By:** ${completedBy}${filingInfo}${timeInfo}${hoursInfo}

**Work Summary:**
${data.description || 'Task completed as requested.'}

${data.notes ? `**Additional Notes:**\n${data.notes}\n` : ''}
**What Was Accomplished:**
${data.title} has been completed and is ready for your review. ${data.service_filing_id ? 'This work is part of your ongoing service engagement with us.' : ''}

**Next Steps:**
${data.service_filing_id ? 'Our team will continue with the remaining steps in your service workflow. You will receive updates as we progress.' : 'If you have any questions or need additional assistance, please don\'t hesitate to reach out.'}

Thank you for your business!

Best regards,
${completedBy}
GoGet CRM - Task Management Team

---
If you have any questions about this completed task, please contact us at your convenience.`;

    // Send email to client
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.primary_email,
        subject: subject,
        body: emailBody
      });

      console.log(`Sent task completion email to ${client.primary_email} for task: ${data.title}`);

      // Create email draft record for tracking
      try {
        await base44.asServiceRole.entities.EmailDraft.create({
          task_id: data.id,
          client_id: data.client_id,
          filing_id: data.service_filing_id || null,
          client_name: client.legal_name,
          client_email: client.primary_email,
          subject_line: subject,
          email_body: emailBody,
          key_points: [
            'Task Completed',
            data.title,
            `Completed: ${completionDate}`,
            `By: ${completedBy}`
          ],
          status: 'sent',
          sent_date: new Date().toISOString(),
          sent_by: data.assigned_to || 'system',
          notes: 'Auto-generated task completion notification'
        });
        console.log('Created email draft record for tracking');
      } catch (draftError) {
        console.error('Failed to create draft record:', draftError.message);
      }

      return Response.json({
        success: true,
        message: `Task completion notification sent to ${client.primary_email}`,
        task_id: data.id,
        client: client.legal_name
      });

    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return Response.json({ 
        error: 'Failed to send email',
        details: emailError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in task completion notification:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});