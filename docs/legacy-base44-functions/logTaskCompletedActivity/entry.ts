import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Entity automation: triggered when a Task is updated
// Logs an activity to the lead if the task status changed to "Complete"
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only care about task updates where status changed to Complete
    if (event?.type !== 'update') return Response.json({ ok: true });
    if (data?.status !== 'Complete') return Response.json({ ok: true });
    if (old_data?.status === 'Complete') return Response.json({ ok: true }); // already was complete

    // Find leads linked to this task (by client_id or service_filing_id)
    // We look for leads that share the same client_id as the task
    let leadId = null;

    if (data.client_id) {
      const leads = await base44.asServiceRole.entities.Lead.filter({ converted_to_client_id: data.client_id });
      // Also try filtering by client_id directly on leads if any
      const leadsAlt = await base44.asServiceRole.entities.Lead.filter({});
      const match = leadsAlt.find(l => l.notes?.includes(data.client_id) || l.converted_to_client_id === data.client_id);
      if (leads.length > 0) leadId = leads[0].id;
      else if (match) leadId = match.id;
    }

    // If no lead linked, skip silently
    if (!leadId) return Response.json({ ok: true, skipped: 'no_linked_lead' });

    await base44.asServiceRole.entities.Activity.create({
      lead_id: leadId,
      activity_type: 'task_completed',
      title: `Task completed: "${data.title}"`,
      details: data.description || '',
      performed_by: data.assigned_to || '',
      activity_date: new Date().toISOString()
    });

    console.log(`Logged task_completed activity for lead ${leadId}, task: ${data.title}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('logTaskCompletedActivity error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});