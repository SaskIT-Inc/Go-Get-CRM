import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin/manager roles to trigger this
    if (!user || !['admin', 'director', 'manager'].includes(user.role?.toLowerCase())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting task deadline scan...');

    // Fetch all active tasks
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const activeTasks = allTasks.filter(task => 
      task.status !== 'Complete' && task.due_date && task.assigned_to
    );

    console.log(`Found ${activeTasks.length} active tasks with due dates`);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const urgentTasks = activeTasks.filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate <= tomorrow; // Due within 24 hours or overdue
    });

    console.log(`Found ${urgentTasks.length} tasks due within 24 hours or overdue`);

    const results = {
      scanned: activeTasks.length,
      urgent: urgentTasks.length,
      drafts_created: 0,
      emails_sent: 0,
      errors: []
    };

    // Fetch clients and team members for reference
    const clients = await base44.asServiceRole.entities.Client.list();
    const users = await base44.asServiceRole.entities.User.list();

    for (const task of urgentTasks) {
      try {
        const dueDate = new Date(task.due_date);
        const isOverdue = dueDate < now;
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        // Get client name if available
        const client = clients.find(c => c.id === task.client_id);
        const clientName = client?.legal_name || 'N/A';

        // Get assigned team member
        const assignedUser = users.find(u => u.email === task.assigned_to);
        const assignedName = assignedUser?.full_name || task.assigned_to;

        // Generate email subject and body using the template
        const subject = `URGENT: Deadline Reminder - ${task.title} Due ${isOverdue ? 'OVERDUE' : 'Tomorrow'}`;
        
        const emailBody = `Hi ${assignedName},

This is a reminder that the following task deadline is ${isOverdue ? 'OVERDUE' : 'approaching'}:

**Deadline Alert:**
- Task: ${task.title}
- Client: ${clientName}
- Due Date: ${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} ${isOverdue ? '(OVERDUE)' : `(${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining)`}
- Status: ${task.status}
- Priority: ${task.priority || 'Medium'}

**Task Description:**
${task.description || 'No description provided'}

**Action Required:**
${isOverdue ? '⚠️ This task is overdue. Please complete as soon as possible.' : '⏰ This task is due within 24 hours. Please ensure timely completion.'}

${task.notes ? `**Additional Notes:**\n${task.notes}` : ''}

Please update the task status or reach out if you need assistance.

Best regards,
Task Management System`;

        // Create email draft
        const draft = await base44.asServiceRole.entities.EmailDraft.create({
          task_id: task.id,
          client_id: task.client_id || null,
          filing_id: task.service_filing_id || null,
          client_name: clientName,
          client_email: task.assigned_to,
          subject_line: subject,
          email_body: emailBody,
          key_points: [
            isOverdue ? 'OVERDUE TASK' : 'DUE WITHIN 24 HOURS',
            `Task: ${task.title}`,
            `Due: ${dueDate.toLocaleDateString()}`,
            `Status: ${task.status}`
          ],
          status: 'draft',
          due_date: task.due_date,
          notes: `Auto-generated deadline alert for ${isOverdue ? 'overdue' : 'upcoming'} task`
        });

        results.drafts_created++;
        console.log(`Created draft for task: ${task.title} (${task.id})`);

        // Send notification email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: task.assigned_to,
            subject: subject,
            body: emailBody
          });
          results.emails_sent++;
          console.log(`Sent notification email to: ${task.assigned_to}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${task.assigned_to}:`, emailError.message);
          results.errors.push(`Email failed for ${task.title}: ${emailError.message}`);
        }

      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError.message);
        results.errors.push(`Task ${task.id}: ${taskError.message}`);
      }
    }

    console.log('Task deadline scan complete:', results);

    return Response.json({
      success: true,
      message: `Scanned ${results.scanned} tasks, found ${results.urgent} urgent tasks`,
      results
    });

  } catch (error) {
    console.error('Error in task deadline scanner:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});