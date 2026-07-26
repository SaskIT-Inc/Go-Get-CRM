import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only notify if status actually changed
    if (!data || old_data?.status === data.status) {
      return Response.json({ success: true, message: 'No status change' });
    }

    const task = data;
    const assignedTo = task.assigned_to;

    if (!assignedTo) {
      return Response.json({ success: true, message: 'No assignee' });
    }

    const statusMap = {
      'Not Started': '📋',
      'In Progress': '⚙️',
      'Blocked': '🚫',
      'Complete': '✅'
    };

    const emoji = statusMap[task.status] || '📝';

    const subject = `Task Status Updated: ${task.title}`;
    const body = `
Hi,

Your task has been updated.

Task: ${task.title}
New Status: ${emoji} ${task.status}
${task.due_date ? `Due Date: ${task.due_date}` : ''}
${task.priority ? `Priority: ${task.priority}` : ''}

${task.description ? `Description: ${task.description}` : ''}

Please log in to the system to view more details.

Best regards,
GoGet CRM System
    `;

    await base44.integrations.Core.SendEmail({
      to: assignedTo,
      subject,
      body,
      from_name: 'GoGet CRM'
    });

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Error in notifyTaskStatusChange:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});