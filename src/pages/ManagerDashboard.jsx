import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Users, CheckCircle, Filter } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Team-oversight roles — deliberately excludes bookkeeper (individual-
// contributor tier) even though bookkeepers can view the 'tasks' module.
const OVERSIGHT_ROLES = ['director', 'admin', 'manager'];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['managerTasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statusStages'],
    queryFn: () => api.entities.StatusStageMaster.list()
  });

  const { data: automationRules = [] } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => api.entities.AutomationRulesMaster.list()
  });

  // Check access
  const hasAccess = user && OVERSIGHT_ROLES.includes(user.role);
  
  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Access Restricted</h3>
                <p className="text-red-700">
                  This dashboard is only available to Directors, CEMs, and Accountants.
                  Your current role: <span className="font-semibold">{user.role}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Identify problematic tasks
  const now = new Date();
  const flaggedTasks = tasks.filter((task) => {
    const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'Complete';
    
    const isWaitingOnClient = task.status === 'Blocked';
    const daysSinceStatusChange = task.updated_date 
      ? differenceInDays(now, new Date(task.updated_date))
      : 0;
    const isStalled = isWaitingOnClient && daysSinceStatusChange > 3;

    return isOverdue || isStalled;
  });

  const overdueCount = flaggedTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'Complete'
  ).length;

  const stalledCount = flaggedTasks.filter(
    (t) => t.status === 'Blocked' && 
            differenceInDays(now, new Date(t.updated_date)) > 3
  ).length;

  // Filter tasks
  const displayedTasks = filterStatus === 'all' 
    ? flaggedTasks
    : filterStatus === 'overdue'
    ? flaggedTasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== 'Complete')
    : flaggedTasks.filter((t) => t.status === 'Blocked' && 
                            differenceInDays(now, new Date(t.updated_date)) > 3);

  const getSeverityColor = (task) => {
    const isOverdue = task.due_date && new Date(task.due_date) < now;
    const isStalled = task.status === 'Blocked' && 
                      differenceInDays(now, new Date(task.updated_date)) > 3;

    if (isOverdue) return 'border-l-4 border-l-red-600 bg-red-50';
    if (isStalled) return 'border-l-4 border-l-orange-600 bg-orange-50';
    return 'border-l-4 border-l-yellow-600 bg-yellow-50';
  };

  const getStatusBadgeColor = (task) => {
    const isOverdue = task.due_date && new Date(task.due_date) < now;
    if (isOverdue) return 'bg-red-100 text-red-800';
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Task oversight: Overdue and stalled client items requiring immediate attention
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 mb-2">Overdue Tasks</p>
                <p className="text-4xl font-bold text-red-900">{overdueCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-200">
                <AlertCircle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-2">Stalled (3+ days)</p>
                <p className="text-4xl font-bold text-orange-900">{stalledCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-200">
                <Clock className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Total Flagged</p>
                <p className="text-4xl font-bold text-blue-900">{flaggedTasks.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-200">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterStatus === 'all'
              ? 'bg-navy text-white shadow-md'
              : 'bg-slate-200 text-navy hover:bg-slate-300'
          }`}
        >
          All Flagged ({flaggedTasks.length})
        </button>
        <button
          onClick={() => setFilterStatus('overdue')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterStatus === 'overdue'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-slate-200 text-navy hover:bg-slate-300'
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilterStatus('stalled')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filterStatus === 'stalled'
              ? 'bg-orange-600 text-white shadow-md'
              : 'bg-slate-200 text-navy hover:bg-slate-300'
          }`}
        >
          Stalled ({stalledCount})
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {displayedTasks.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-navy mb-2">All Clear!</p>
              <p className="text-muted-foreground">
                No overdue or stalled tasks at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          displayedTasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < now;
            const daysOverdue = isOverdue ? differenceInDays(now, new Date(task.due_date)) : 0;
            const daysSinceUpdated = task.updated_date 
              ? differenceInDays(now, new Date(task.updated_date))
              : 0;

            return (
              <Card key={task.id} className={`border-none shadow-md ${getSeverityColor(task)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-navy">{task.title}</h3>
                        {isOverdue && (
                          <Badge className="bg-red-600 text-white">
                            {daysOverdue}d Overdue
                          </Badge>
                        )}
                        {task.status === 'Blocked' && daysSinceUpdated > 3 && (
                          <Badge className="bg-orange-600 text-white">
                            {daysSinceUpdated}d Waiting
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-navy/70 mb-3">{task.description}</p>
                    </div>
                  </div>

                  {/* Task Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Status</p>
                      <Badge className={getStatusBadgeColor(task)}>
                        {task.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Priority</p>
                      <Badge 
                        className={
                          task.priority === 'Critical' ? 'bg-red-200 text-red-800' :
                          task.priority === 'High' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Assigned To</p>
                      <p className="text-sm text-navy font-medium">{task.assigned_to || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Due Date</p>
                      <p className="text-sm text-navy font-medium">
                        {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                      </p>
                    </div>
                  </div>

                  {/* Action Note */}
                  <div className="text-xs text-slate-600">
                    <p>
                      {isOverdue 
                        ? `⚠️ This task has been overdue for ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}. Immediate action required.`
                        : `⏱️ Waiting on client response for ${daysSinceUpdated} days. Follow up recommended.`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}