import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define required fields by client type
    const requiredFields = {
      Individual: ['legal_name', 'primary_email', 'primary_phone', 'address', 'postal_code'],
      Business: ['legal_name', 'primary_email', 'business_number', 'fiscal_year_end', 'address']
    };

    // Fetch all active clients
    const allClients = await base44.asServiceRole.entities.Client.list();
    const activeClients = allClients.filter(c => c.status === 'Active' || c.status === 'Onboarding');

    // Fetch all incomplete filings
    const allFilings = await base44.asServiceRole.entities.ServiceFiling.list();
    const incompleteFilings = allFilings.filter(f => 
      f.status !== 'Completed' && f.status !== 'Filed'
    );

    const alertsToCreate = [];

    // Check each active client for missing information
    for (const client of activeClients) {
      const requiredForType = requiredFields[client.client_type] || requiredFields.Business;
      const missingFields = requiredForType.filter(field => !client[field]);

      if (missingFields.length > 0) {
        // Check if alert already exists
        const existingAlert = await base44.asServiceRole.entities.ComplianceAlert.filter({
          client_id: client.id,
          alert_type: 'missing_info',
          status: 'active'
        });

        if (existingAlert.length === 0) {
          alertsToCreate.push({
            client_id: client.id,
            alert_type: 'missing_info',
            severity: 'high',
            title: `Missing Required Information - ${client.legal_name}`,
            description: `Client profile is missing ${missingFields.length} required field(s) for ${client.client_type} clients.`,
            missing_fields: missingFields,
            required_actions: [
              `Update client profile with missing information: ${missingFields.join(', ')}`,
              'Verify information with client before proceeding with filings'
            ],
            created_date: new Date().toISOString()
          });
        }
      }

      // Check for filings with approaching deadlines
      const clientFilings = incompleteFilings.filter(f => f.client_id === client.id);
      
      for (const filing of clientFilings) {
        if (filing.due_date) {
          const dueDate = new Date(filing.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

          // Alert if within 14 days and not started
          if (daysUntilDue <= 14 && daysUntilDue > 0) {
            const existingAlert = await base44.asServiceRole.entities.ComplianceAlert.filter({
              filing_id: filing.id,
              alert_type: 'approaching_deadline',
              status: 'active'
            });

            if (existingAlert.length === 0) {
              // Check document readiness
              const checklist = await base44.asServiceRole.entities.DocumentChecklist.filter({
                service_filing_id: filing.id
              }).then(results => results[0]);

              const completionPercentage = checklist?.completion_percentage || 0;
              const isPrepared = completionPercentage >= 80;
              const alertType = isPrepared ? 'approaching_deadline' : 'unprepared_filing';
              const severity = daysUntilDue <= 7 ? 'critical' : 'high';

              alertsToCreate.push({
                client_id: filing.client_id,
                filing_id: filing.id,
                alert_type: alertType,
                severity,
                title: `${alertType === 'unprepared_filing' ? 'Unprepared' : 'Approaching'} Deadline - ${filing.service_name}`,
                description: `${filing.service_name} filing is due in ${daysUntilDue} day(s). Documents ${isPrepared ? 'are ready' : 'are NOT ready'} (${completionPercentage}% complete).`,
                due_date: filing.due_date,
                days_until_due: daysUntilDue,
                required_actions: isPrepared 
                  ? [
                      `Review ${filing.service_name} filing`,
                      'Submit to CRA',
                      'Confirm submission'
                    ]
                  : [
                      `Urgently collect missing documents for ${filing.service_name}`,
                      `Contact client to complete submission (${100 - completionPercentage}% remaining)`,
                      'Review documents once received',
                      'Schedule filing before deadline'
                    ],
                created_date: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    // Create all alerts in bulk
    if (alertsToCreate.length > 0) {
      await base44.asServiceRole.entities.ComplianceAlert.bulkCreate(alertsToCreate);
    }

    return Response.json({
      success: true,
      alerts_created: alertsToCreate.length,
      clients_checked: activeClients.length,
      filings_checked: incompleteFilings.length,
      details: alertsToCreate
    });
  } catch (error) {
    console.error('Error in checkComplianceRules:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});