import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TaskTimeline from '@/features/tasks/components/TaskTimeline';
import TaskDependencyManager from '@/features/tasks/components/TaskDependencyManager';
import { 
  GitBranch, 
  Plus,
  AlertCircle,
  CheckCircle,
  Lock
} from 'lucide-react';

export default function TaskTimelinePage() {
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const myTasks = tasks.filter(t => t.assigned_to === user?.email);
  const allActiveTasks = tasks.filter(t => t.status !== 'Complete');
  const blockedTasks = tasks.filter(t => {
    if (!t.depends_on || t.depends_on.length === 0) return false;
    return t.depends_on.some(depId => {
      const depTask = tasks.find(dt => dt.id === depId);
      return depTask && depTask.status !== 'Complete';
    });
  });

  const completedTasks = tasks.filter(t => t.status === 'Complete');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2 flex items-center gap-3">
          <GitBranch className="w-10 h-10" />
          Task Timeline & Dependencies
        </h1>
        <p className="text-muted-foreground">
          Visualize task dependencies and manage workflow sequences
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Tasks</p>
                <p className="text-3xl font-bold text-blue-700">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-600 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Blocked Tasks</p>
                <p className="text-3xl font-bold text-orange-700">{blockedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-3xl font-bold text-purple-700">
                  {tasks.filter(t => t.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-3xl font-bold text-green-700">{completedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Link to={createPageUrl('MyTasks')}>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create New Task
          </Button>
        </Link>
      </div>

      {/* Timeline Views */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({allActiveTasks.length})</TabsTrigger>
          <TabsTrigger value="my">My Tasks ({myTasks.length})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked ({blockedTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading tasks...</p>
              </CardContent>
            </Card>
          ) : (
            <TaskTimeline tasks={allActiveTasks} />
          )}
        </TabsContent>

        <TabsContent value="my">
          <TaskTimeline tasks={myTasks.filter(t => t.status !== 'Complete')} />
        </TabsContent>

        <TabsContent value="blocked">
          {blockedTasks.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No Blocked Tasks</h3>
                <p className="text-muted-foreground">
                  All tasks have their dependencies satisfied!
                </p>
              </CardContent>
            </Card>
          ) : (
            <TaskTimeline tasks={blockedTasks} />
          )}
        </TabsContent>

        <TabsContent value="completed">
          <TaskTimeline tasks={completedTasks} />
        </TabsContent>
      </Tabs>

      {/* Dependency Manager Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <TaskDependencyManager
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}