import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, calendarProvider, shareWithClient } = await req.json();

    // Get client data
    const clients = await base44.entities.Client.filter({ id: clientId });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    const client = clients[0];

    // Get service filings for this client
    const serviceFilings = await base44.entities.ServiceFiling.filter({ client_id: clientId });

    const events = [];

    // Process each filing
    for (const filing of serviceFilings) {
      if (filing.due_date) {
        const filingEvent = {
          summary: `${filing.service_name} - ${client.legal_name}`,
          description: `Filing: ${filing.service_name}\nYear: ${filing.filing_year}\nClient: ${client.legal_name}\nStatus: ${filing.status}`,
          start: filing.due_date,
          end: filing.due_date,
          allDay: true
        };
        events.push(filingEvent);

        // Add reminder 7 days before
        const reminderDate = new Date(filing.due_date);
        reminderDate.setDate(reminderDate.getDate() - 7);
        events.push({
          summary: `Reminder: ${filing.service_name} Due in 7 Days - ${client.legal_name}`,
          description: `Upcoming deadline for ${filing.service_name}\nDue: ${filing.due_date}`,
          start: reminderDate.toISOString().split('T')[0],
          end: reminderDate.toISOString().split('T')[0],
          allDay: true
        });
      }
    }

    // Calculate recurring deadlines based on client tax cycle
    if (client.fiscal_year_end) {
      const [month, day] = client.fiscal_year_end.split('-');
      const currentYear = new Date().getFullYear();
      
      // T2 Corporate Tax - 6 months after fiscal year end
      if (client.client_type === 'Business') {
        const fiscalYearEnd = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        const t2Deadline = new Date(fiscalYearEnd);
        t2Deadline.setMonth(t2Deadline.getMonth() + 6);
        
        events.push({
          summary: `T2 Corporate Tax Deadline - ${client.legal_name}`,
          description: `Annual T2 filing deadline (6 months after fiscal year end: ${client.fiscal_year_end})`,
          start: t2Deadline.toISOString().split('T')[0],
          end: t2Deadline.toISOString().split('T')[0],
          allDay: true
        });
      }
    }

    // GST/HST Filing deadlines based on frequency
    const gstFiling = serviceFilings.find(f => f.service_name?.includes('GST') || f.service_name?.includes('HST'));
    if (gstFiling) {
      const gstFrequency = client.services_needed?.find(s => s.includes('GST') || s.includes('HST'));
      let gstDates = [];
      
      // Quarterly GST
      if (gstFrequency?.includes('Quarterly')) {
        const quarters = [
          { month: 3, day: 31, name: 'Q1' },
          { month: 6, day: 30, name: 'Q2' },
          { month: 9, day: 30, name: 'Q3' },
          { month: 12, day: 31, name: 'Q4' }
        ];
        gstDates = quarters.map(q => ({
          date: new Date(new Date().getFullYear(), q.month, 0).toISOString().split('T')[0],
          name: `GST/HST ${q.name} Filing`
        }));
      }
      // Monthly GST
      else if (gstFrequency?.includes('Monthly')) {
        for (let m = 0; m < 12; m++) {
          const lastDay = new Date(new Date().getFullYear(), m + 1, 0);
          gstDates.push({
            date: lastDay.toISOString().split('T')[0],
            name: `GST/HST Monthly Filing - ${lastDay.toLocaleDateString('en-US', { month: 'long' })}`
          });
        }
      }
      // Annual GST
      else {
        gstDates = [{
          date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
          name: 'GST/HST Annual Filing'
        }];
      }

      gstDates.forEach(gst => {
        events.push({
          summary: `${gst.name} - ${client.legal_name}`,
          description: `GST/HST filing deadline for ${client.legal_name}`,
          start: gst.date,
          end: gst.date,
          allDay: true
        });
      });
    }

    // PST Filing deadlines
    const pstFiling = serviceFilings.find(f => f.service_name?.includes('PST'));
    if (pstFiling && client.province === 'Saskatchewan') {
      // PST typically monthly, due by last day of following month
      for (let m = 0; m < 12; m++) {
        const deadline = new Date(new Date().getFullYear(), m + 1, 0);
        events.push({
          summary: `PST Filing Deadline - ${client.legal_name}`,
          description: `Saskatchewan PST filing for ${new Date(new Date().getFullYear(), m, 1).toLocaleDateString('en-US', { month: 'long' })}`,
          start: deadline.toISOString().split('T')[0],
          end: deadline.toISOString().split('T')[0],
          allDay: true
        });
      }
    }

    // Payroll remittance deadlines
    const payrollFiling = serviceFilings.find(f => f.service_name?.includes('Payroll'));
    if (payrollFiling && client.number_of_employees > 0) {
      // Monthly remittance (15th of following month)
      for (let m = 0; m < 12; m++) {
        const remittanceDate = new Date(new Date().getFullYear(), m + 1, 15);
        events.push({
          summary: `Payroll Remittance - ${client.legal_name}`,
          description: `CRA payroll source deductions remittance for ${new Date(new Date().getFullYear(), m, 1).toLocaleDateString('en-US', { month: 'long' })}`,
          start: remittanceDate.toISOString().split('T')[0],
          end: remittanceDate.toISOString().split('T')[0],
          allDay: true
        });
      }
    }

    // T4 Filing deadline (Last day of February)
    if (client.number_of_employees > 0) {
      const t4Deadline = new Date(new Date().getFullYear(), 1, 28); // Feb 28
      events.push({
        summary: `T4 Filing Deadline - ${client.legal_name}`,
        description: 'Annual T4 slips and summary filing deadline',
        start: t4Deadline.toISOString().split('T')[0],
        end: t4Deadline.toISOString().split('T')[0],
        allDay: true
      });
    }

    // Sync to Google Calendar if selected
    if (calendarProvider === 'google') {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      
      const syncedEvents = [];
      for (const event of events) {
        const calendarEvent = {
          summary: event.summary,
          description: event.description,
          start: { date: event.start },
          end: { date: event.end },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 60 }
            ]
          }
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(calendarEvent)
          }
        );

        if (response.ok) {
          const created = await response.json();
          syncedEvents.push(created);
        }
      }

      return Response.json({
        success: true,
        message: `Synced ${syncedEvents.length} events to Google Calendar`,
        events: syncedEvents
      });
    }

    // Return events for manual sync or other providers
    return Response.json({
      success: true,
      message: `Generated ${events.length} calendar events`,
      events: events
    });

  } catch (error) {
    console.error('Error syncing calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});