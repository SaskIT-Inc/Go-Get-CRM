import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import TaskKanban from '@/components/kanban/TaskKanban';
import { Plus, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, LayoutGrid } from 'lucide-react';
import { calculateUrgencyScore, getUrgencyLevel, getUrgencyIcon, getUrgencyExplanation } from '@/components/tasks/UrgencyScoreCalculator';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('my-tasks');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list(),
    staleTime: 1000
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => api.entities.DocumentChecklist.list()
  });

  const { data: filings = [] } = useQuery({
    queryKey: ['filings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.User.list()
  });

  // Calculate urgency scores for all tasks
  const tasksWithUrgency = tasks.map(task => {
    const client = clients.find(c => c.id === task.client_id);
    const checklist = checklists.find(ch => ch.service_filing_id === task.service_filing_id);
    const urgencyScore = calculateUrgencyScore(task, client, checklist, filings) ?? 0;
    const urgencyLevel = getUrgencyLevel(urgencyScore) ?? { level: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' };
    
    return {
      ...task,
      urgencyScore,
      urgencyLevel,
      urgencyExplanation: getUrgencyExplanation(task, client, checklist, urgencyScore) ?? []
    };
  });

  // Sort active tasks by urgency score (highest first)
  // Use all tasks for stats (not dependent on user email loading)
  const myActiveTasks = tasksWithUrgency
    .filter((t) => t.assigned_to === user?.email && t.status !== 'Complete')
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myOverdueTasks = myActiveTasks.filter(t => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });

  const myUpcomingTasks = myActiveTasks.filter(t => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  const teamActiveTasks = tasksWithUrgency
    .filter((t) => t.assigned_to !== user?.email && t.status !== 'Complete')
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const handleEditTask = (task) => {
    // Bookkeepers can update their own tasks; director/admin/manager can edit any task
    if (user?.role === 'bookkeeper' && task.assigned_to !== user?.email) {
      return;
    }
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-600 text-white';
      case 'High':
        return 'bg-orange-600 text-white';
      case 'Medium':
        return 'bg-yellow-600 text-white';
      case 'Low':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">My Tasks</h1>
          <p className="text-muted-foreground">Intelligently ranked by urgency score</p>
        </div>
        {user?.role !== 'bookkeeper' && (
          <Button onClick={handleCreateTask} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-5 h-5" />
            New Task
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{myOverdueTasks.length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-3xl font-bold text-orange-600">{myUpcomingTasks.length}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">
                  {myActiveTasks.filter(t => t.status === 'In Progress').length}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-3xl font-bold text-green-600">{myActiveTasks.length}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs wrapping everything so TabsContent is always inside Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>

        {/* Tab header + view toggle */}
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="my-tasks" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              My Tasks ({myActiveTasks.length})
            </TabsTrigger>
            <TabsTrigger value="team-tasks" className="gap-2">
              <Users className="w-4 h-4" />
              Team Tasks ({teamActiveTasks.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>
        </div>

        {/* Kanban view — spans both tabs */}
        {viewMode === 'kanban' ? (
          <div className="space-y-6">
            <TaskKanban tasks={selectedTab === 'my-tasks' ? myActiveTasks : teamActiveTasks} currentUser={user} teamMembers={teamMembers} />
          </div>
        ) : (
          <>
            {/* My Tasks Tab */}
            <TabsContent value="my-tasks">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    My Active Tasks (Ranked by Urgency)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {myActiveTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No active tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myActiveTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer relative"
                          onClick={() => handleEditTask(task)}
                        >
                          <div className="absolute -top-3 -right-3 flex flex-col items-center gap-1 z-10">
                            <div className={`px-3 py-1.5 rounded-full shadow-lg ${task.urgencyLevel.color} flex items-center gap-1.5`}>
                              <span className="text-xs font-bold">{getUrgencyIcon(task.urgencyLevel.level)}</span>
                              <span className="text-xs font-bold">{task.urgencyScore}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.urgencyLevel.color}`}>
                              {task.urgencyLevel.label}
                            </span>
                          </div>
                          <div className="pr-16 mb-2">
                            <h4 className="font-bold text-navy">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            )}
                            {task.urgencyExplanation?.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {task.urgencyExplanation.map((explanation, idx) => (
                                  <p key={idx} className="text-xs text-slate-700 font-medium">{explanation}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground mt-3 pt-3 border-t">
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            <Badge className={getStatusColor(task.status)} variant="outline">{task.status}</Badge>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tasks Tab */}
            <TabsContent value="team-tasks">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Tasks (Ranked by Urgency)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {teamActiveTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No team tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teamActiveTasks.map((task) => {
                        const assignee = teamMembers.find(m => m.email === task.assigned_to);
                        return (
                          <div
                            key={task.id}
                            className="p-4 bg-white border rounded-lg hover:shadow-md transition-all relative"
                          >
                            <div className="absolute -top-3 -right-3 flex flex-col items-center gap-1">
                              <div className={`px-3 py-1.5 rounded-full shadow-lg ${task.urgencyLevel.color} flex items-center gap-1.5`}>
                                <span className="text-xs font-bold">{getUrgencyIcon(task.urgencyLevel.level)}</span>
                                <span className="text-xs font-bold">{task.urgencyScore}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.urgencyLevel.color}`}>
                                {task.urgencyLevel.label}
                              </span>
                            </div>
                            <div className="pr-16 mb-2">
                              <h4 className="font-bold text-navy">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              {task.urgencyExplanation?.length > 0 && (
                                <div className="mt-2 space-y-0.5">
                                  {task.urgencyExplanation.map((explanation, idx) => (
                                    <p key={idx} className="text-xs text-slate-700 font-medium">{explanation}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground mt-3 pt-3 border-t">
                              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                              <Badge className={getStatusColor(task.status)} variant="outline">{task.status}</Badge>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {assignee?.full_name || task.assigned_to}
                              </span>
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

      </Tabs>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskFormModal
          task={editingTask}
          currentUser={user}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}