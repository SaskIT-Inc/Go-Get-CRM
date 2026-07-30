import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskCard from '@/components/tasks/TaskCard';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import { CheckSquare, Clock, AlertCircle, Plus } from 'lucide-react';

export default function MyTasks() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => api.entities.Task.filter({ assigned_to: user.email }),
    enabled: !!user
  });

  const activeTasks = tasks.filter(t => t.status !== 'Complete');
  const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const dueSoon = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const daysUntil = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  });

  const byStatus = {
    notStarted: activeTasks.filter(t => t.status === 'Not Started'),
    inProgress: activeTasks.filter(t => t.status === 'In Progress'),
    blocked: activeTasks.filter(t => t.status === 'Blocked')
  };

  const handleEdit = (task) => {
    // Check if user can edit this task
    const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());
    const isOwnTask = task.assigned_to === user?.email;
    
    if (isManager || isOwnTask) {
      setEditingTask(task);
      setShowTaskForm(true);
    }
  };

  const handleCloseForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">My Tasks</h1>
          <p className="text-muted-foreground">Your personal assignments and work items</p>
        </div>
        <Button onClick={() => setShowTaskForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold text-navy">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-3xl font-bold text-yellow-dark">{dueSoon.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red">{overdue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-purple-600">{byStatus.inProgress.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="notStarted">Not Started ({byStatus.notStarted.length})</TabsTrigger>
          <TabsTrigger value="inProgress">In Progress ({byStatus.inProgress.length})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked ({byStatus.blocked.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {activeTasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))}
          {activeTasks.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No Active Tasks</h3>
                <p className="text-muted-foreground">You don't have any active tasks assigned.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notStarted" className="space-y-3">
          {byStatus.notStarted.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))}
        </TabsContent>

        <TabsContent value="inProgress" className="space-y-3">
          {byStatus.inProgress.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-3">
          {byStatus.blocked.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} />
          ))}
        </TabsContent>
      </Tabs>

      {showTaskForm && (
        <TaskFormModal
          task={editingTask}
          onClose={handleCloseForm}
          currentUser={user}
        />
      )}
    </div>
  );
}