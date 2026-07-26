import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process when task is marked as Complete
    if (event.type !== 'update' || data.status !== 'Complete') {
      return Response.json({ message: 'No action needed' });
    }

    const completedTask = data;

    // Find all tasks that depend on this completed task
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const dependentTasks = allTasks.filter(task => 
      task.depends_on && 
      task.depends_on.includes(completedTask.id) &&
      task.status !== 'Complete'
    );

    if (dependentTasks.length === 0) {
      return Response.json({ message: 'No dependent tasks found' });
    }

    // Check which tasks are now unblocked
    const notifications = [];
    
    for (const task of dependentTasks) {
      // Check if all dependencies are complete
      const allDepsComplete = task.depends_on.every(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        return depTask && depTask.status === 'Complete';
      });

      if (allDepsComplete && task.assigned_to) {
        // Task is now unblocked - send notification
        notifications.push({
          to: task.assigned_to,
          task: task,
          completedTask: completedTask,
          unblocked: true
        });

        // Update task status from Blocked to Not Started if it was blocked
        if (task.status === 'Blocked') {
          await base44.asServiceRole.entities.Task.update(task.id, {
            status: 'Not Started'
          });
        }
      } else if (task.assigned_to) {
        // Dependency completed but task still has other blocking dependencies
        notifications.push({
          to: task.assigned_to,
          task: task,
          completedTask: completedTask,
          unblocked: false
        });
      }
    }

    // Send email notifications
    for (const notif of notifications) {
      const subject = notif.unblocked 
        ? `✅ Task Unblocked: ${notif.task.title}`
        : `📢 Dependency Update: ${notif.completedTask.title} Complete`;

      const body = notif.unblocked
        ? `
          <h2>Your Task is Ready to Start!</h2>
          <p>Good news! Your task <strong>${notif.task.title}</strong> is now unblocked and ready to begin.</p>
          
          <h3>Task Details:</h3>
          <ul>
            <li><strong>Priority:</strong> ${notif.task.priority}</li>
            <li><strong>Due Date:</strong> ${notif.task.due_date ? new Date(notif.task.due_date).toLocaleDateString() : 'Not set'}</li>
            <li><strong>Estimated Hours:</strong> ${notif.task.estimated_hours || 'Not specified'}</li>
          </ul>

          <h3>Completed Dependency:</h3>
          <p><strong>${notif.completedTask.title}</strong> has been marked as complete.</p>

          <p>All dependencies for your task are now satisfied. You can begin work immediately.</p>
          
          <p style="margin-top: 20px; color: #666;">
            This is an automated notification from GoGet CRM Task Management System.
          </p>
        `
        : `
          <h2>Task Dependency Update</h2>
          <p>A task you depend on has been completed.</p>
          
          <h3>Your Task:</h3>
          <p><strong>${notif.task.title}</strong></p>
          
          <h3>Completed Dependency:</h3>
          <p><strong>${notif.completedTask.title}</strong> has been marked as complete.</p>

          <p><strong>Note:</strong> Your task still has other incomplete dependencies and remains blocked.</p>

          <h3>Remaining Dependencies:</h3>
          <ul>
            ${notif.task.depends_on
              .filter(depId => {
                const dt = allTasks.find(t => t.id === depId);
                return dt && dt.status !== 'Complete';
              })
              .map(depId => {
                const dt = allTasks.find(t => t.id === depId);
                return `<li>${dt ? dt.title : 'Unknown'} - ${dt ? dt.status : 'Unknown'}</li>`;
              })
              .join('')}
          </ul>
          
          <p style="margin-top: 20px; color: #666;">
            This is an automated notification from GoGet CRM Task Management System.
          </p>
        `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: notif.to,
        subject: subject,
        body: body,
        from_name: 'GoGet CRM - Task Management'
      });
    }

    return Response.json({ 
      success: true,
      notificationsSent: notifications.length,
      unblockedTasks: notifications.filter(n => n.unblocked).length
    });

  } catch (error) {
    console.error('Error in notifyTaskDependencyComplete:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});