import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Fetch all incomplete tasks with approaching deadlines
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const approachingTasks = allTasks.filter(task => {
      if (task.status === 'Complete' || task.status === 'Blocked') return false;
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate >= today && dueDate <= sevenDaysFromNow;
    });

    // Check for service filings with approaching deadlines
    const allFilings = await base44.asServiceRole.entities.ServiceFiling.list();
    const approachingFilings = allFilings.filter(filing => {
      if (filing.status === 'Completed' || filing.status === 'Filed') return false;
      if (!filing.due_date) return false;
      
      const dueDate = new Date(filing.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return dueDate >= today && dueDate <= sevenDaysFromNow;
    });

    // Process tasks and generate email drafts
    const processedDrafts = [];
    
    for (const task of approachingTasks) {
      if (!task.client_id) continue;
      
      try {
        const daysUntilDue = Math.ceil((new Date(task.due_date) - today) / (1000 * 60 * 60 * 24));
        
        // Check if draft already exists
        const existingDraft = await base44.asServiceRole.entities.EmailDraft.filter({
          task_id: task.id
        });

        if (existingDraft.length === 0) {
          const response = await base44.asServiceRole.functions.invoke('generateDeadlineEmailDraft', {
            task_id: task.id,
            client_id: task.client_id,
            task_title: task.title,
            due_date: task.due_date,
            filing_type: 'Task',
            days_until_due: daysUntilDue
          });

          if (response?.data?.draft_id) {
            processedDrafts.push({
              type: 'task',
              draft_id: response.data.draft_id,
              task_id: task.id
            });
          }
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error.message);
      }
    }

    // Process service filings and generate email drafts
    for (const filing of approachingFilings) {
      try {
        const daysUntilDue = Math.ceil((new Date(filing.due_date) - today) / (1000 * 60 * 60 * 24));
        
        // Check if draft already exists
        const existingDraft = await base44.asServiceRole.entities.EmailDraft.filter({
          filing_id: filing.id
        });

        if (existingDraft.length === 0) {
          const response = await base44.asServiceRole.functions.invoke('generateDeadlineEmailDraft', {
            task_id: filing.id,
            client_id: filing.client_id,
            task_title: filing.service_name,
            due_date: filing.due_date,
            filing_type: filing.service_name,
            days_until_due: daysUntilDue
          });

          if (response?.data?.draft_id) {
            processedDrafts.push({
              type: 'filing',
              draft_id: response.data.draft_id,
              filing_id: filing.id
            });
          }
        }
      } catch (error) {
        console.error(`Error processing filing ${filing.id}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${processedDrafts.length} deadline email drafts`,
      drafts_generated: processedDrafts.length,
      details: processedDrafts
    });
  } catch (error) {
    console.error('Error in monitorDeadlinesAndGenerateDrafts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});