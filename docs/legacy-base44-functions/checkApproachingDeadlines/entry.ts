import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active tasks with upcoming due dates
    const allTasks = await base44.asServiceRole.entities.Task.list('-due_date', 1000);
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const taskNotifications = [];

    for (const task of allTasks) {
      if (!task.due_date || task.status === 'Complete') continue;

      const dueDate = new Date(task.due_date);
      if (dueDate <= sevenDaysFromNow && dueDate > today) {
        const daysLeft = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        const assignedTo = task.assigned_to;

        if (assignedTo) {
          const subject = `Task Deadline Reminder: ${task.title}`;
          const body = `
Hi,

This is a reminder that a task is due soon.

Task: ${task.title}
Due Date: ${task.due_date}
Days Remaining: ${daysLeft}
Priority: ${task.priority || 'Medium'}

Please log in to the system to update the task status.

Best regards,
GoGet CRM System
          `;

          try {
            await base44.integrations.Core.SendEmail({
              to: assignedTo,
              subject,
              body,
              from_name: 'GoGet CRM'
            });
            taskNotifications.push({ task: task.title, recipient: assignedTo, type: 'task' });
          } catch (e) {
            console.error(`Failed to send task reminder to ${assignedTo}:`, e);
          }
        }
      }
    }

    // Get all service filings with upcoming due dates
    const allFilings = await base44.asServiceRole.entities.ServiceFiling.list('-due_date', 1000);
    const filingNotifications = [];

    for (const filing of allFilings) {
      if (!filing.due_date || filing.status === 'Completed' || filing.status === 'Filed') continue;

      const dueDate = new Date(filing.due_date);
      if (dueDate <= sevenDaysFromNow && dueDate > today) {
        const daysLeft = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        const assignedTo = filing.assigned_to;

        if (assignedTo) {
          const subject = `Filing Deadline Reminder: ${filing.service_name}`;
          const body = `
Hi,

This is a reminder that a filing deadline is approaching.

Service: ${filing.service_name}
Filing Year: ${filing.filing_year}
Due Date: ${filing.due_date}
Days Remaining: ${daysLeft}
Current Status: ${filing.status}

Please log in to the system to check the filing progress.

Best regards,
GoGet CRM System
          `;

          try {
            await base44.integrations.Core.SendEmail({
              to: assignedTo,
              subject,
              body,
              from_name: 'GoGet CRM'
            });
            filingNotifications.push({ filing: filing.service_name, recipient: assignedTo, type: 'filing' });
          } catch (e) {
            console.error(`Failed to send filing reminder to ${assignedTo}:`, e);
          }
        }
      }
    }

    return Response.json({
      success: true,
      taskNotifications,
      filingNotifications,
      total: taskNotifications.length + filingNotifications.length
    });
  } catch (error) {
    console.error('Error in checkApproachingDeadlines:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});