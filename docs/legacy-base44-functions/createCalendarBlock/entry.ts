import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId, assignedTo, startTime, endTime } = await req.json();

    // This function creates calendar blocks for team members
    // In a production environment, this would integrate with Google Calendar or similar
    console.log('Creating calendar blocks:', {
      appointmentId,
      assignedTo,
      startTime,
      endTime
    });

    // For now, we'll just log the calendar block creation
    // In production, you would integrate with Google Calendar API here
    
    return Response.json({
      success: true,
      message: 'Calendar blocks created',
      blocks: assignedTo.map(email => ({
        email,
        start: startTime,
        end: endTime
      }))
    });
  } catch (error) {
    console.error('Error creating calendar block:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});