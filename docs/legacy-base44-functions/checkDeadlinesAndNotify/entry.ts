import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all in-progress service filings
    const inProgressFilings = await base44.asServiceRole.entities.ServiceFiling.filter({
      status: 'In Progress'
    });

    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const notifications = [];

    for (const filing of inProgressFilings) {
      if (!filing.due_date) continue;

      const dueDate = new Date(filing.due_date);
      const isOverdue = dueDate < now;
      const isDueSoon = dueDate <= fortyEightHoursFromNow && dueDate >= now;

      if (isOverdue || isDueSoon) {
        notifications.push({
          filing,
          isOverdue,
          isDueSoon,
          daysRemaining: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
        });
      }
    }

    // Send notifications
    for (const notification of notifications) {
      const { filing, isOverdue, daysRemaining } = notification;
      
      // Get assigned user for email
      let assignedEmail = filing.assigned_to;
      if (!assignedEmail) {
        console.log(`No assigned user for filing ${filing.id}, skipping email`);
        continue;
      }

      // Prepare email content
      const subject = isOverdue 
        ? `⚠️ OVERDUE: ${filing.service_name} (Client: ${filing.client_id})`
        : `📅 URGENT: ${filing.service_name} due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;

      const body = `
Service Filing Alert
${'-'.repeat(50)}

Service: ${filing.service_name}
Client: ${filing.client_id}
Filing Year: ${filing.filing_year}
Due Date: ${filing.due_date}

Status: ${isOverdue ? 'OVERDUE' : `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}

Action Required: Please review and complete this service filing immediately.

${'-'.repeat(50)}
This is an automated notification. Please do not reply to this email.
      `.trim();

      // Send email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: assignedEmail,
          subject,
          body,
          from_name: 'GoGet CRM - Deadline Alert'
        });
        console.log(`Email sent to ${assignedEmail} for filing ${filing.id}`);
      } catch (emailError) {
        console.error(`Failed to send email for filing ${filing.id}:`, emailError.message);
      }

      // Post alert to task comment section
      try {
        // Get related tasks for this service filing
        const relatedTasks = await base44.asServiceRole.entities.Task.filter({
          service_filing_id: filing.id
        });

        for (const task of relatedTasks) {
          // Create a system alert comment
          const alertComment = {
            task_id: task.id,
            commenter_email: 'system@goget.crm',
            commenter_name: 'GoGet System',
            comment_text: isOverdue
              ? `🚨 **SYSTEM ALERT**: This task's service filing is OVERDUE (due ${filing.due_date}). Immediate action required.`
              : `📌 **SYSTEM ALERT**: Service filing due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${filing.due_date}). Please prioritize.`,
            mentioned_emails: [assignedEmail]
          };

          await base44.asServiceRole.entities.TaskComment.create(alertComment);
          console.log(`Alert posted to task ${task.id} for filing ${filing.id}`);
        }
      } catch (commentError) {
        console.error(`Failed to post comment for filing ${filing.id}:`, commentError.message);
      }
    }

    return Response.json({
      success: true,
      notificationsProcessed: notifications.length,
      filingCount: inProgressFilings.length,
      message: `Processed ${notifications.length} upcoming/overdue deadline(s) from ${inProgressFilings.length} in-progress filing(s)`
    });
  } catch (error) {
    console.error('Deadline check failed:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});