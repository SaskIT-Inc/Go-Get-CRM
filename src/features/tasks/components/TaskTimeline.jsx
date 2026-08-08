import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskTimeline({ tasks }) {
  // Build dependency graph
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // Calculate task levels based on dependencies
  const getTaskLevel = (task, visited = new Set()) => {
    if (visited.has(task.id)) return 0;
    visited.add(task.id);
    
    if (!task.depends_on || task.depends_on.length === 0) return 0;
    
    const dependencyLevels = task.depends_on
      .map(depId => {
        const depTask = taskMap.get(depId);
        return depTask ? getTaskLevel(depTask, visited) : 0;
      });
    
    return Math.max(...dependencyLevels) + 1;
  };

  // Organize tasks by level
  const tasksByLevel = tasks.reduce((acc, task) => {
    const level = getTaskLevel(task);
    if (!acc[level]) acc[level] = [];
    acc[level].push(task);
    return acc;
  }, {});

  const maxLevel = Math.max(...Object.keys(tasksByLevel).map(Number));

  const statusColors = {
    'Not Started': 'bg-gray-500/10 text-gray-700 border-gray-300',
    'In Progress': 'bg-blue-500/10 text-blue-700 border-blue-300',
    'Blocked': 'bg-red-500/10 text-red-700 border-red-300',
    'Complete': 'bg-green-500/10 text-green-700 border-green-300'
  };

  const statusIcons = {
    'Not Started': <div className="w-3 h-3 rounded-full bg-gray-400" />,
    'In Progress': <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />,
    'Blocked': <Lock className="w-4 h-4 text-red-500" />,
    'Complete': <CheckCircle className="w-4 h-4 text-green-600" />
  };

  const isTaskBlocked = (task) => {
    if (!task.depends_on || task.depends_on.length === 0) return false;
    return task.depends_on.some(depId => {
      const depTask = taskMap.get(depId);
      return depTask && depTask.status !== 'Complete';
    });
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
          Task Dependencies Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Object.keys(tasksByLevel)
            .sort((a, b) => Number(a) - Number(b))
            .map((level) => (
              <div key={level} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold shadow-lg">
                    {Number(level) + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Phase {Number(level) + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tasksByLevel[level].length} task{tasksByLevel[level].length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="ml-14 space-y-3">
                  {tasksByLevel[level].map((task) => {
                    const blocked = isTaskBlocked(task);
                    const hasDependencies = task.depends_on && task.depends_on.length > 0;
                    
                    return (
                      <div key={task.id} className="relative">
                        <Card className={cn(
                          "border-2 transition-all hover:shadow-md",
                          statusColors[task.status],
                          blocked && "opacity-60"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {statusIcons[task.status]}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-navy truncate">
                                    {task.title}
                                  </h4>
                                  <Badge variant="outline" className={cn(
                                    "text-xs shrink-0",
                                    task.priority === 'Critical' && 'border-red-500 text-red-700',
                                    task.priority === 'High' && 'border-orange-500 text-orange-700',
                                    task.priority === 'Medium' && 'border-blue-500 text-blue-700',
                                    task.priority === 'Low' && 'border-gray-500 text-gray-700'
                                  )}>
                                    {task.priority}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                  {task.assigned_to && (
                                    <span>Assigned: {task.assigned_to}</span>
                                  )}
                                  {task.due_date && (
                                    <span className={cn(
                                      new Date(task.due_date) < new Date() && task.status !== 'Complete' 
                                        ? 'text-red-600 font-semibold' 
                                        : ''
                                    )}>
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.estimated_hours && (
                                    <span>{task.estimated_hours}h estimated</span>
                                  )}
                                </div>

                                {blocked && (
                                  <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Blocked by incomplete dependencies</span>
                                  </div>
                                )}

                                {hasDependencies && (
                                  <div className="mt-2 pt-2 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Depends on:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {task.depends_on.map(depId => {
                                        const depTask = taskMap.get(depId);
                                        if (!depTask) return null;
                                        return (
                                          <Badge
                                            key={depId}
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              depTask.status === 'Complete' 
                                                ? 'border-green-300 text-green-700' 
                                                : 'border-orange-300 text-orange-700'
                                            )}
                                          >
                                            {depTask.title.substring(0, 20)}
                                            {depTask.status === 'Complete' && ' ✓'}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>

                {Number(level) < maxLevel && (
                  <div className="ml-5 mt-4 mb-2">
                    <ArrowRight className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No tasks to display in timeline</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}