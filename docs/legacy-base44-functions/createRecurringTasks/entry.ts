import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active process templates with recurring frequency
    const processTemplates = await base44.asServiceRole.entities.ProcessTemplate.list();
    const recurringProcesses = processTemplates.filter(p => 
      p.is_active && ['Monthly', 'Quarterly', 'Annual', 'As Needed'].includes(p.frequency)
    );

    // Get all active users
    const users = await base44.asServiceRole.entities.User.list();
    const activeUsers = users.filter(u => u.role && u.role !== 'admin');

    // Get current date and month
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const tasksToCreate = [];

    for (const process of recurringProcesses) {
      // Determine if task should be created this month
      let shouldCreate = false;
      let dueOffset = process.deadline_offset_days || 30;

      if (process.frequency === 'Monthly') {
        shouldCreate = true;
      } else if (process.frequency === 'Quarterly' && now.getMonth() % 3 === 0) {
        shouldCreate = true;
      } else if (process.frequency === 'Annual' && now.getMonth() === 0) {
        shouldCreate = true;
      }

      if (shouldCreate && process.required_roles && process.required_roles.length > 0) {
        // Find users with matching roles
        const assignedUsers = activeUsers.filter(u => 
          process.required_roles.some(role => 
            u.full_name?.toLowerCase().includes(role.toLowerCase()) || 
            u.email?.toLowerCase().includes(role.toLowerCase())
          )
        );

        // If no specific role match, assign to all team members
        const usersToAssign = assignedUsers.length > 0 ? assignedUsers : activeUsers;

        // Create task for each applicable user
        for (const user of usersToAssign) {
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + dueOffset);

          const taskName = `${process.process_name} - ${currentMonth}`;
          
          tasksToCreate.push({
            title: taskName,
            description: process.process_steps
              ? `Process: ${process.process_name}\n\nSteps:\n${process.process_steps.map((step, i) => 
                  `${i + 1}. ${step.step_title}: ${step.instructions}`
                ).join('\n')}`
              : `Recurring process: ${process.process_name}`,
            status: 'Not Started',
            priority: 'High',
            assigned_to: user.email,
            due_date: dueDate.toISOString().split('T')[0],
            start_date: now.toISOString().split('T')[0],
            estimated_hours: process.total_estimated_time || 0,
            tags: [process.service_type],
            notes: `Automatically created from process template: ${process.process_name}`
          });
        }
      }
    }

    // Bulk create tasks if any were generated
    let createdCount = 0;
    if (tasksToCreate.length > 0) {
      await base44.asServiceRole.entities.Task.bulkCreate(tasksToCreate);
      createdCount = tasksToCreate.length;
    }

    return Response.json({
      success: true,
      message: `Recurring tasks creation job completed`,
      processedTemplates: recurringProcesses.length,
      tasksCreated: createdCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in createRecurringTasks:', error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});