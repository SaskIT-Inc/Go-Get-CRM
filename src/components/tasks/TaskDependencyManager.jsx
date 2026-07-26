import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskDependencyManager({ task, onClose }) {
  const queryClient = useQueryClient();
  const [selectedDeps, setSelectedDeps] = useState(task.depends_on || []);

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Task.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      if (onClose) onClose();
    }
  });

  const availableTasks = allTasks.filter(t => 
    t.id !== task.id && 
    t.status !== 'Complete' &&
    !wouldCreateCircularDependency(t.id, task.id)
  );

  function wouldCreateCircularDependency(newDepId, currentTaskId, visited = new Set()) {
    if (newDepId === currentTaskId) return true;
    if (visited.has(newDepId)) return false;
    visited.add(newDepId);

    const newDepTask = allTasks.find(t => t.id === newDepId);
    if (!newDepTask || !newDepTask.depends_on) return false;

    return newDepTask.depends_on.some(depId => 
      wouldCreateCircularDependency(depId, currentTaskId, visited)
    );
  }

  const toggleDependency = (taskId) => {
    if (selectedDeps.includes(taskId)) {
      setSelectedDeps(selectedDeps.filter(id => id !== taskId));
    } else {
      setSelectedDeps([...selectedDeps, taskId]);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ depends_on: selectedDeps });
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Manage Dependencies
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-2">
          Task: <span className="font-semibold">{task.title}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">
              This task cannot be started until all selected dependencies are marked as Complete.
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">
            Select tasks that must be completed first:
          </Label>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No available tasks to add as dependencies
              </p>
            ) : (
              availableTasks.map((availableTask) => (
                <div
                  key={availableTask.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                    selectedDeps.includes(availableTask.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                  onClick={() => toggleDependency(availableTask.id)}
                >
                  <Checkbox
                    checked={selectedDeps.includes(availableTask.id)}
                    onCheckedChange={() => toggleDependency(availableTask.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-navy">
                        {availableTask.title}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {availableTask.status}
                      </Badge>
                    </div>
                    {availableTask.assigned_to && (
                      <p className="text-xs text-slate-600 mt-1">
                        Assigned: {availableTask.assigned_to}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Dependencies'}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}