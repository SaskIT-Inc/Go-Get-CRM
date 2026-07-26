import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Handle new task creation with assignment
    if (event.type === 'create' && data.assigned_to) {
      const task = data;
      
      // Check if task has dependencies
      const isBlocked = task.depends_on && task.depends_on.length > 0;
      
      let dependencyInfo = '';
      if (isBlocked) {
        const allTasks = await base44.asServiceRole.entities.Task.list();
        const dependencies = task.depends_on
          .map(depId => allTasks.find(t => t.id === depId))
          .filter(Boolean);
        
        const allComplete = dependencies.every(dep => dep.status === 'Complete');
        
        if (!allComplete) {
          dependencyInfo = `
            <p><strong>⚠️ Note:</strong> This task has dependencies that must be completed first.</p>
            <h3>Dependencies:</h3>
            <ul>
              ${dependencies.map(dep => 
                `<li><strong>${dep.title}</strong> - Status: ${dep.status}</li>`
              ).join('')}
            </ul>
          `;
        }
      }

      const subject = `📋 New Task Assigned: ${task.title}`;
      const body = `
        <h2>You've Been Assigned a New Task</h2>
        <p>A new task has been assigned to you in the GoGet CRM system.</p>
        
        <h3>Task Details:</h3>
        <ul>
          <li><strong>Title:</strong> ${task.title}</li>
          <li><strong>Priority:</strong> ${task.priority}</li>
          <li><strong>Status:</strong> ${task.status}</li>
          <li><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</li>
          <li><strong>Estimated Hours:</strong> ${task.estimated_hours || 'Not specified'}</li>
        </ul>

        ${task.description ? `<h3>Description:</h3><p>${task.description}</p>` : ''}
        
        ${dependencyInfo}
        
        <p style="margin-top: 20px; color: #666;">
          This is an automated notification from GoGet CRM Task Management System.
        </p>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: task.assigned_to,
        subject: subject,
        body: body,
        from_name: 'GoGet CRM - Task Management'
      });

      return Response.json({ success: true, message: 'Assignment notification sent' });
    }

    // Handle task reassignment
    if (event.type === 'update' && data.assigned_to && data.assigned_to !== old_data?.assigned_to) {
      const task = data;
      const previousAssignee = old_data?.assigned_to;

      // Notify new assignee
      if (data.assigned_to) {
        const subject = `📋 Task Assigned to You: ${task.title}`;
        const body = `
          <h2>You've Been Assigned a Task</h2>
          <p>A task has been assigned to you in the GoGet CRM system.</p>
          
          <h3>Task Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${task.title}</li>
            <li><strong>Priority:</strong> ${task.priority}</li>
            <li><strong>Status:</strong> ${task.status}</li>
            <li><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</li>
          </ul>

          ${previousAssignee ? `<p><em>Previously assigned to: ${previousAssignee}</em></p>` : ''}
          
          <p style="margin-top: 20px; color: #666;">
            This is an automated notification from GoGet CRM Task Management System.
          </p>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: data.assigned_to,
          subject: subject,
          body: body,
          from_name: 'GoGet CRM - Task Management'
        });
      }

      // Notify previous assignee
      if (previousAssignee) {
        const subject = `📋 Task Reassigned: ${task.title}`;
        const body = `
          <h2>Task Reassignment Notice</h2>
          <p>A task that was assigned to you has been reassigned to another team member.</p>
          
          <h3>Task Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${task.title}</li>
            <li><strong>New Assignee:</strong> ${data.assigned_to || 'Unassigned'}</li>
          </ul>
          
          <p style="margin-top: 20px; color: #666;">
            This is an automated notification from GoGet CRM Task Management System.
          </p>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: previousAssignee,
          subject: subject,
          body: body,
          from_name: 'GoGet CRM - Task Management'
        });
      }

      return Response.json({ success: true, message: 'Reassignment notifications sent' });
    }

    return Response.json({ message: 'No action needed' });

  } catch (error) {
    console.error('Error in notifyTaskAssignment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});