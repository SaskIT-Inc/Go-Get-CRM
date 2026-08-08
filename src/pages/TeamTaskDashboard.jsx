import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Clock, AlertCircle, CheckCircle2, Calendar, User, Building2, 
  ListTodo, TrendingUp, RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TeamTaskDashboard() {
  const queryClient = useQueryClient();
  // Defaults to "All Team Members" — a shared team dashboard that opens
  // scoped to just the viewer's own tasks hides everything else (including
  // unassigned tasks, which never match anyone's email) until someone
  // remembers to switch the filter. "My Tasks" stays available below.
  const [selectedUser, setSelectedUser] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list(),
    refetchInterval: 30000
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.entities.Task.update(taskId, { 
      status,
      completed_date: status === 'Complete' ? new Date().toISOString().split('T')[0] : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    }
  });

  const statuses = [
    { id: 'Not Started', label: 'Not Started', color: 'bg-slate-100 border-slate-300' },
    { id: 'In Progress', label: 'In Progress', color: 'bg-blue-100 border-blue-300' },
    { id: 'Blocked', label: 'Blocked', color: 'bg-red-100 border-red-300' },
    { id: 'Complete', label: 'Complete', color: 'bg-green-100 border-green-300' }
  ];

  const filterTasks = () => {
    if (selectedUser === 'all') return tasks;
    if (selectedUser === 'me') return tasks.filter(t => t.assigned_to === currentUser?.email);
    return tasks.filter(t => t.assigned_to === selectedUser);
  };

  const filteredTasks = filterTasks();

  const tasksByStatus = statuses.map(status => ({
    ...status,
    tasks: filteredTasks.filter(t => t.status === status.id)
  }));

  const getTaskStats = () => {
    const userTasks = selectedUser === 'me' 
      ? tasks.filter(t => t.assigned_to === currentUser?.email)
      : selectedUser === 'all' 
      ? tasks 
      : tasks.filter(t => t.assigned_to === selectedUser);

    const today = new Date().setHours(0, 0, 0, 0);
    const overdue = userTasks.filter(t => 
      t.due_date && new Date(t.due_date).setHours(0, 0, 0, 0) < today && t.status !== 'Complete'
    ).length;

    const dueToday = userTasks.filter(t => {
      if (!t.due_date || t.status === 'Complete') return false;
      const taskDate = new Date(t.due_date).setHours(0, 0, 0, 0);
      return taskDate === today;
    }).length;

    const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
    const completed = userTasks.filter(t => t.status === 'Complete').length;

    return { overdue, dueToday, inProgress, completed };
  };

  const stats = getTaskStats();

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    updateTaskMutation.mutate({ 
      taskId: draggableId, 
      status: newStatus 
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-500 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white'
    };
    return colors[priority] || 'bg-slate-500 text-white';
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'Complete') return false;
    return new Date(task.due_date) < new Date();
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.legal_name || 'No Client';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[2000px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Team Task Dashboard</h1>
          <p className="text-muted-foreground">Centralized view with drag-and-drop status management and real-time updates</p>
        </div>
        <Link to="/Tasks">
          <Button variant="outline" className="gap-2">
            <ListTodo className="w-4 h-4" />
            My Tasks View
          </Button>
        </Link>
      </div>

      {/* User Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-semibold text-navy">View tasks for:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg font-medium"
        >
          <option value="me">My Tasks</option>
          <option value="all">All Team Members</option>
          {allUsers.map(user => (
            <option key={user.id} value={user.email}>{user.full_name}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
          className="ml-auto gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-3xl font-bold text-orange-600">{stats.dueToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {tasksByStatus.map(column => (
            <div key={column.id} className={cn('rounded-lg border-2 p-4 min-h-[600px]', column.color)}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-navy text-lg">{column.label}</h3>
                <Badge variant="outline" className="font-bold">{column.tasks.length}</Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'space-y-3 min-h-[500px] rounded-lg p-2 transition-colors',
                      snapshot.isDraggingOver && 'bg-white/50'
                    )}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'cursor-move transition-shadow hover:shadow-lg',
                              snapshot.isDragging && 'shadow-2xl rotate-2',
                              isOverdue(task) && 'border-red-500 border-2'
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <h4 className="font-semibold text-navy text-sm mb-1 line-clamp-2">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                {task.client_id && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Client:</span>
                                    <span className="font-medium truncate">{getClientName(task.client_id)}</span>
                                  </div>
                                )}

                                {task.assigned_to && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <User className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Assigned to:</span>
                                    <span className="truncate">
                                      {allUsers.find(u => u.email === task.assigned_to)?.full_name || task.assigned_to}
                                    </span>
                                  </div>
                                )}

                                {task.due_date && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className={cn(
                                      'font-medium',
                                      isOverdue(task) && 'text-red-600 font-bold'
                                    )}>
                                      {new Date(task.due_date).toLocaleDateString()}
                                      {isOverdue(task) && ' (OVERDUE)'}
                                    </span>
                                  </div>
                                )}

                                {task.priority && (
                                  <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}