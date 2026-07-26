import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('Starting task deadline reminder workflow');

    // Get all tasks
    const allTasks = await base44.asServiceRole.entities.Task.list();

    // Calculate date 3 days from now
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 3);
    const reminderDateStart = new Date(reminderDate);
    reminderDateStart.setHours(0, 0, 0, 0);
    const reminderDateEnd = new Date(reminderDate);
    reminderDateEnd.setHours(23, 59, 59, 999);

    // Filter tasks due in 3 days that aren't completed
    const tasksDueInThreeDays = allTasks.filter(task => {
      if (!task.due_date || task.status === 'Complete') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= reminderDateStart && dueDate <= reminderDateEnd;
    });

    console.log(`Found ${tasksDueInThreeDays.length} tasks due in 3 days`);

    // Get all clients and users for lookup
    const clients = await base44.asServiceRole.entities.Client.list();
    const users = await base44.asServiceRole.entities.User.list();

    // Send reminder for each task
    for (const task of tasksDueInThreeDays) {
      try {
        // Get client info
        const client = clients.find(c => c.id === task.client_id);
        if (!client || !client.primary_email) {
          console.log(`Skipping task ${task.id} - no client email found`);
          continue;
        }

        // Get assigned user name if applicable
        const assignedUser = users.find(u => u.email === task.assigned_to);
        const assignedByName = assignedUser?.full_name || task.assigned_to || 'Team';

        // Generate personalized reminder email
        const emailContent = generateReminderEmail(
          client.legal_name,
          task,
          assignedByName
        );

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: client.primary_email,
          subject: emailContent.subject,
          body: emailContent.body,
          from_name: 'GoGet Accounting'
        });

        console.log(`Reminder sent to ${client.primary_email} for task: ${task.title}`);

        // Create activity log
        await base44.asServiceRole.entities.EmailDraft?.create({
          task_id: task.id,
          client_id: client.id,
          client_name: client.legal_name,
          client_email: client.primary_email,
          subject_line: emailContent.subject,
          email_body: emailContent.body,
          status: 'sent',
          sent_date: new Date().toISOString(),
          sent_by: 'system-automation',
          notes: `Auto-sent 3-day deadline reminder for task: ${task.title}`
        }).catch(err => console.log('Note: Could not log email draft'));

      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError.message);
        continue;
      }
    }

    console.log('Task deadline reminder workflow completed');

    return Response.json({
      success: true,
      tasksProcessed: tasksDueInThreeDays.length,
      message: `Reminder emails sent for ${tasksDueInThreeDays.length} upcoming tasks`
    });

  } catch (error) {
    console.error('Error in task deadline reminder workflow:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

function generateReminderEmail(clientName, task, assignedByName) {
  const dueDate = new Date(task.due_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const priorityBadge = {
    'Critical': '🔴 CRITICAL',
    'High': '🟠 HIGH',
    'Medium': '🟡 MEDIUM',
    'Low': '🟢 LOW'
  }[task.priority] || task.priority;

  const statusContext = {
    'Not Started': 'This task has not yet been started.',
    'In Progress': 'This task is currently in progress.',
    'Blocked': 'This task is currently blocked and requires attention.',
    'Complete': 'This task is complete.'
  }[task.status] || task.status;

  return {
    subject: `⏰ Reminder: ${task.title} - Due ${dueDate}`,
    body: `Dear ${clientName},

We wanted to remind you about an upcoming deadline for your account:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK: ${task.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 DUE DATE: ${dueDate} (in 3 days)
⚡ PRIORITY: ${priorityBadge}
📊 STATUS: ${statusContext}

${task.description ? `📝 DETAILS:\n${task.description}\n` : ''}

${task.estimated_hours ? `⏱️ ESTIMATED TIME: ${task.estimated_hours} hours\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**WHAT YOU NEED TO DO:**
This task requires your attention. Please ensure you complete any required actions or provide the necessary information by the due date.

**QUESTIONS?**
If you need clarification on what's required or have any questions, please reach out to ${assignedByName} or reply to this email.

Thank you for your prompt attention to this matter!

Best regards,
GoGet Accounting Team

---
This is an automated reminder. Please do not reply directly to this email.`
  };
}