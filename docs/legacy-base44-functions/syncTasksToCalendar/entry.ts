import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskIds, calendarProvider, userEmail } = await req.json();

    // Get tasks
    let tasks = [];
    if (taskIds && taskIds.length > 0) {
      for (const taskId of taskIds) {
        const task = await base44.entities.Task.filter({ id: taskId });
        if (task && task.length > 0) tasks.push(task[0]);
      }
    } else {
      // Sync all tasks assigned to user
      tasks = await base44.entities.Task.filter({ assigned_to: userEmail || user.email });
    }

    const events = [];

    for (const task of tasks) {
      if (task.due_date) {
        const startDate = task.start_date || task.due_date;
        
        const taskEvent = {
          summary: task.title,
          description: `${task.description || ''}\n\nPriority: ${task.priority}\nStatus: ${task.status}\nEstimated Hours: ${task.estimated_hours || 'N/A'}`,
          start: task.start_date ? { dateTime: new Date(task.start_date + 'T09:00:00').toISOString() } : { date: startDate },
          end: task.due_date ? { dateTime: new Date(task.due_date + 'T17:00:00').toISOString() } : { date: task.due_date },
          colorId: task.priority === 'Critical' ? '11' : task.priority === 'High' ? '9' : '1'
        };
        events.push(taskEvent);
      }
    }

    // Sync to Google Calendar if selected
    if (calendarProvider === 'google') {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      
      const syncedEvents = [];
      for (const event of events) {
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          }
        );

        if (response.ok) {
          const created = await response.json();
          syncedEvents.push(created);
        }
      }

      return Response.json({
        success: true,
        message: `Synced ${syncedEvents.length} tasks to Google Calendar`,
        events: syncedEvents
      });
    }

    return Response.json({
      success: true,
      message: `Generated ${events.length} task events`,
      events: events
    });

  } catch (error) {
    console.error('Error syncing tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});