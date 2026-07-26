/**
 * Intelligent Urgency Score Calculator
 * Calculates task urgency based on multiple factors:
 * - Deadline proximity (40%)
 * - Client priority level (30%)
 * - Document availability (20%)
 * - Task dependencies (10%)
 */

export function calculateUrgencyScore(task, client, checklist, filings) {
  let score = 0;
  const weights = {
    deadline: 40,
    clientPriority: 30,
    documents: 20,
    dependencies: 10
  };

  // Factor 1: Deadline Proximity (40 points max)
  if (task.due_date) {
    const today = new Date();
    const dueDate = new Date(task.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      score += weights.deadline; // Overdue - max urgency
    } else if (daysUntilDue === 0) {
      score += weights.deadline * 0.95; // Due today
    } else if (daysUntilDue <= 2) {
      score += weights.deadline * 0.85; // Due within 2 days
    } else if (daysUntilDue <= 5) {
      score += weights.deadline * 0.7; // Due within 5 days
    } else if (daysUntilDue <= 10) {
      score += weights.deadline * 0.5; // Due within 10 days
    } else if (daysUntilDue <= 30) {
      score += weights.deadline * 0.3; // Due within 30 days
    } else {
      score += weights.deadline * 0.1; // Beyond 30 days
    }
  }

  // Factor 2: Client Priority Level (30 points max)
  if (client) {
    const clientTier = client.client_value_tier || 'Standard';
    switch (clientTier) {
      case 'High Value':
        score += weights.clientPriority;
        break;
      case 'Medium Value':
        score += weights.clientPriority * 0.7;
        break;
      case 'Standard':
        score += weights.clientPriority * 0.4;
        break;
      case 'New':
        score += weights.clientPriority * 0.5;
        break;
      default:
        score += weights.clientPriority * 0.3;
    }
  }

  // Factor 3: Document Availability (20 points max)
  if (checklist && task.service_filing_id) {
    const completeness = checklist.completion_percentage || 0;
    
    if (completeness < 30) {
      score += weights.documents * 0.3; // Low urgency - missing docs
    } else if (completeness < 60) {
      score += weights.documents * 0.5; // Medium urgency
    } else if (completeness < 90) {
      score += weights.documents * 0.8; // High urgency - almost ready
    } else {
      score += weights.documents; // Max urgency - all docs ready
    }
  } else if (task.service_filing_id) {
    // Filing exists but no checklist - assume medium urgency
    score += weights.documents * 0.5;
  }

  // Factor 4: Task Dependencies (10 points max)
  const dependencyCount = task.depends_on?.length || 0;
  const blocksCount = task.blocks?.length || 0;

  if (blocksCount > 2) {
    score += weights.dependencies; // Blocking multiple tasks
  } else if (blocksCount > 0) {
    score += weights.dependencies * 0.7; // Blocking some tasks
  } else if (dependencyCount === 0) {
    score += weights.dependencies * 0.5; // No dependencies - can start now
  } else {
    score += weights.dependencies * 0.2; // Has dependencies
  }

  // Round to nearest integer
  return Math.round(score);
}

export function getUrgencyLevel(score) {
  if (score >= 85) return { level: 'critical', label: 'CRITICAL', color: 'bg-red-600 text-white' };
  if (score >= 70) return { level: 'high', label: 'HIGH', color: 'bg-orange-600 text-white' };
  if (score >= 50) return { level: 'medium', label: 'MEDIUM', color: 'bg-yellow-600 text-white' };
  if (score >= 30) return { level: 'low', label: 'LOW', color: 'bg-blue-600 text-white' };
  return { level: 'minimal', label: 'MINIMAL', color: 'bg-gray-500 text-white' };
}

export function getUrgencyIcon(level) {
  switch (level) {
    case 'critical':
      return '🔥';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⏰';
    case 'low':
      return '📌';
    default:
      return '📋';
  }
}

export function getUrgencyExplanation(task, client, checklist, score) {
  const explanations = [];
  const today = new Date();
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      explanations.push(`⏰ OVERDUE by ${Math.abs(daysUntilDue)} days`);
    } else if (daysUntilDue <= 2) {
      explanations.push(`⏰ Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`);
    }
  }

  if (client?.client_value_tier === 'High Value') {
    explanations.push('⭐ High-value client');
  }

  if (checklist) {
    const completeness = checklist.completion_percentage || 0;
    if (completeness >= 90) {
      explanations.push('✅ All documents ready');
    } else if (completeness < 30) {
      explanations.push('📄 Missing critical documents');
    }
  }

  const blocksCount = task.blocks?.length || 0;
  if (blocksCount > 0) {
    explanations.push(`🔗 Blocking ${blocksCount} task${blocksCount !== 1 ? 's' : ''}`);
  }

  return explanations;
}