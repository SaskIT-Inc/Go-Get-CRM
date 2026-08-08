import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  FileCheck,
  AlertCircle
} from 'lucide-react';

const statusConfig = {
  'Not Started': {
    progress: 0,
    color: 'bg-gray-400',
    icon: Clock,
    badge: 'secondary',
    description: 'Filing not yet initiated'
  },
  'Documents Pending': {
    progress: 20,
    color: 'bg-yellow-500',
    icon: FileText,
    badge: 'default',
    description: 'Waiting for required documents'
  },
  'In Progress': {
    progress: 50,
    color: 'bg-blue-500',
    icon: Loader2,
    badge: 'default',
    description: 'Filing is being prepared',
    animate: true
  },
  'Review': {
    progress: 75,
    color: 'bg-purple-500',
    icon: FileCheck,
    badge: 'default',
    description: 'Under internal review'
  },
  'Filed': {
    progress: 90,
    color: 'bg-green-500',
    icon: CheckCircle2,
    badge: 'default',
    description: 'Filed with CRA'
  },
  'Completed': {
    progress: 100,
    color: 'bg-green-600',
    icon: CheckCircle2,
    badge: 'default',
    description: 'All complete'
  }
};

export default function FilingProgressBar({ filing, showDetails = true }) {
  const config = statusConfig[filing.status] || statusConfig['Not Started'];
  const Icon = config.icon;
  
  // Calculate days until due
  const daysUntilDue = filing.due_date 
    ? Math.ceil((new Date(filing.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon 
            className={`w-5 h-5 ${config.animate ? 'animate-spin' : ''}`}
            style={{ color: config.color.replace('bg-', '#').replace('-500', '').replace('-400', '').replace('-600', '') }}
          />
          <span className="font-semibold text-sm">{filing.status}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          )}
          {isDueSoon && !isOverdue && (
            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
              <Clock className="w-3 h-3 mr-1" />
              Due Soon
            </Badge>
          )}
          <span className="text-sm font-bold text-navy">{config.progress}%</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <Progress 
        value={config.progress} 
        className="h-3"
      />
      
      {/* Details */}
      {showDetails && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{config.description}</p>
          
          {filing.due_date && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className={isOverdue ? 'text-red-600 font-semibold' : isDueSoon ? 'text-yellow-700 font-semibold' : 'text-muted-foreground'}>
                Due: {new Date(filing.due_date).toLocaleDateString()}
                {daysUntilDue !== null && (
                  <span className="ml-1">
                    ({isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days remaining`})
                  </span>
                )}
              </span>
            </div>
          )}
          
          {filing.assigned_to && (
            <div className="text-xs text-muted-foreground">
              Assigned to: {filing.assigned_to}
            </div>
          )}
        </div>
      )}
    </div>
  );
}