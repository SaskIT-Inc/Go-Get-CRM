import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all relevant data
    const [filings, tasks, checklists, clients] = await Promise.all([
      base44.entities.ServiceFiling.list(),
      base44.entities.Task.list(),
      base44.entities.DocumentChecklist.list(),
      base44.entities.Client.list()
    ]);

    // Filter active filings (not completed)
    const activeFilings = filings.filter(f => 
      f.status !== 'Completed' && f.status !== 'Filed' && f.due_date
    );

    const predictions = [];

    for (const filing of activeFilings) {
      const client = clients.find(c => c.id === filing.client_id);
      const filingTasks = tasks.filter(t => t.service_filing_id === filing.id);
      const checklist = checklists.find(c => c.service_filing_id === filing.id);

      // Calculate days until deadline
      const today = new Date();
      const dueDate = new Date(filing.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      // Skip if already overdue (different handling)
      if (daysUntilDue < 0) continue;

      // Calculate task completion velocity
      const totalTasks = filingTasks.length;
      const completedTasks = filingTasks.filter(t => t.status === 'Complete').length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate document completeness
      const documentCompleteness = checklist?.completion_percentage || 0;
      const missingDocs = checklist?.checklist_items?.filter(item => 
        item.is_required && item.status === 'Missing'
      ).length || 0;

      // Calculate average task velocity (tasks completed per day)
      const completedTasksWithDates = filingTasks.filter(t => 
        t.status === 'Complete' && t.completed_date && t.created_date
      );
      
      let avgTaskCompletionDays = 0;
      if (completedTasksWithDates.length > 0) {
        const totalDays = completedTasksWithDates.reduce((sum, task) => {
          const created = new Date(task.created_date);
          const completed = new Date(task.completed_date);
          return sum + Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        }, 0);
        avgTaskCompletionDays = totalDays / completedTasksWithDates.length;
      }

      // Predict days needed to complete remaining tasks
      const remainingTasks = totalTasks - completedTasks;
      const estimatedDaysNeeded = remainingTasks * (avgTaskCompletionDays || 3); // Default 3 days per task

      // Calculate risk score using ML-like weighted factors
      let riskScore = 0;

      // Factor 1: Task velocity (40% weight)
      if (taskCompletionRate < 30) riskScore += 40;
      else if (taskCompletionRate < 50) riskScore += 30;
      else if (taskCompletionRate < 70) riskScore += 20;
      else if (taskCompletionRate < 90) riskScore += 10;

      // Factor 2: Document completeness (30% weight)
      if (documentCompleteness < 30) riskScore += 30;
      else if (documentCompleteness < 50) riskScore += 20;
      else if (documentCompleteness < 75) riskScore += 15;
      else if (documentCompleteness < 90) riskScore += 10;

      // Factor 3: Time pressure (20% weight)
      if (estimatedDaysNeeded > daysUntilDue) riskScore += 20;
      else if (estimatedDaysNeeded > daysUntilDue * 0.8) riskScore += 15;
      else if (estimatedDaysNeeded > daysUntilDue * 0.6) riskScore += 10;

      // Factor 4: Missing critical documents (10% weight)
      if (missingDocs > 3) riskScore += 10;
      else if (missingDocs > 1) riskScore += 5;

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 70) riskLevel = 'critical';
      else if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 30) riskLevel = 'medium';

      // Only include medium and above risks
      if (riskScore >= 30) {
        predictions.push({
          filing_id: filing.id,
          client_id: filing.client_id,
          client_name: client?.legal_name || 'Unknown',
          service_name: filing.service_name,
          filing_year: filing.filing_year,
          due_date: filing.due_date,
          days_until_due: daysUntilDue,
          risk_score: riskScore,
          risk_level: riskLevel,
          task_completion_rate: Math.round(taskCompletionRate),
          document_completeness: Math.round(documentCompleteness),
          missing_documents: missingDocs,
          remaining_tasks: remainingTasks,
          estimated_days_needed: Math.ceil(estimatedDaysNeeded),
          predicted_delay: estimatedDaysNeeded > daysUntilDue,
          delay_days: Math.max(0, Math.ceil(estimatedDaysNeeded - daysUntilDue)),
          recommendations: generateRecommendations(
            taskCompletionRate,
            documentCompleteness,
            missingDocs,
            daysUntilDue,
            estimatedDaysNeeded
          )
        });
      }
    }

    // Sort by risk score (highest first)
    predictions.sort((a, b) => b.risk_score - a.risk_score);

    return Response.json({
      success: true,
      total_active_filings: activeFilings.length,
      high_risk_count: predictions.filter(p => p.risk_level === 'critical' || p.risk_level === 'high').length,
      predictions: predictions
    });

  } catch (error) {
    console.error('❌ Error predicting filing delays:', error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});

function generateRecommendations(taskRate, docRate, missingDocs, daysLeft, daysNeeded) {
  const recommendations = [];

  if (taskRate < 50) {
    recommendations.push('🚨 Urgent: Assign more team members to accelerate task completion');
  }

  if (docRate < 50) {
    recommendations.push('📄 Priority: Contact client immediately for missing documents');
  }

  if (missingDocs > 2) {
    recommendations.push(`📋 Critical: ${missingDocs} required documents still missing`);
  }

  if (daysNeeded > daysLeft) {
    recommendations.push(`⏰ Timeline Risk: Need ${Math.ceil(daysNeeded - daysLeft)} extra days at current pace`);
  }

  if (daysLeft <= 7 && taskRate < 80) {
    recommendations.push('⚡ Immediate Action: Less than 1 week until deadline');
  }

  return recommendations;
}