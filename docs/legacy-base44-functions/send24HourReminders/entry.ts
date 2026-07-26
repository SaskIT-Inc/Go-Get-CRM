import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all appointments and tasks in the next 24-25 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await base44.asServiceRole.entities.Appointment.filter({
      reminder_sent: false,
      status: 'Scheduled'
    });

    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $in: ['Not Started', 'In Progress'] }
    });

    let remindersSent = 0;

    // Send appointment reminders
    for (const apt of appointments) {
      const aptTime = new Date(apt.start_time);
      
      if (aptTime > dayAfter && aptTime < tomorrow) {
        // Send email to each assigned person
        if (apt.assigned_to && apt.assigned_to.length > 0) {
          for (const email of apt.assigned_to) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: `Reminder: ${apt.title} in 24 hours`,
              body: `
                <h2>Appointment Reminder</h2>
                <p>You have an upcoming appointment:</p>
                <p><strong>${apt.title}</strong></p>
                <p>When: ${new Date(apt.start_time).toLocaleString()}</p>
                <p>Type: ${apt.appointment_type}</p>
                ${apt.location ? `<p>Location: ${apt.location}</p>` : ''}
                ${apt.description ? `<p>Description: ${apt.description}</p>` : ''}
              `
            });
          }
        }

        // Mark reminder as sent
        await base44.asServiceRole.entities.Appointment.update(apt.id, {
          reminder_sent: true
        });

        remindersSent++;
      }
    }

    // Send task deadline reminders
    for (const task of tasks) {
      if (!task.due_date || !task.assigned_to) continue;
      
      const dueDate = new Date(task.due_date);
      
      if (dueDate > dayAfter && dueDate < tomorrow) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: task.assigned_to,
          subject: `Reminder: Task "${task.title}" due in 24 hours`,
          body: `
            <h2>Task Deadline Reminder</h2>
            <p>Your task is due in 24 hours:</p>
            <p><strong>${task.title}</strong></p>
            <p>Due: ${new Date(task.due_date).toLocaleDateString()}</p>
            <p>Priority: ${task.priority}</p>
            ${task.description ? `<p>Description: ${task.description}</p>` : ''}
          `
        });

        remindersSent++;
      }
    }

    return Response.json({
      success: true,
      remindersSent
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});