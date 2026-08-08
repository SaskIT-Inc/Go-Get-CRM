import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskFormModal from '@/features/tasks/components/TaskFormModal';
import TaskKanban from '@/features/tasks/components/kanban/TaskKanban';
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Users, LayoutGrid, Search, Mail, RotateCcw, Building2 } from 'lucide-react';
import { calculateUrgencyScore, getUrgencyLevel, getUrgencyIcon, getUrgencyExplanation } from '@/features/tasks/components/UrgencyScoreCalculator';
import { MANAGERIAL_ROLES } from '@/lib/permissions';
import { Link } from 'react-router-dom';

function TaskFlags({ task }) {
  const rescheduled = task.extra?.overdue_reschedule_history?.length > 0
    || task.overdue_reschedule_history?.length > 0;
  const emailed = task.extra?.client_emailed || task.client_emailed;
  if (!rescheduled && !emailed) return null;
  return (
    <>
      {rescheduled && (
        <span
          className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
          title="This task was automatically rescheduled after going overdue"
        >
          <RotateCcw className="w-3 h-3" />Auto-Rescheduled
        </span>
      )}
      {emailed && (
        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          <Mail className="w-3 h-3" />Emailed
        </span>
      )}
    </>
  );
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('my-tasks');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const isManagerial = MANAGERIAL_ROLES.includes(user?.role);

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

  // Per-client rollup for the managerial-only "Client Overview" tab —
  // grouped client-side from the already-fetched tasks/clients arrays, no
  // new endpoints. Keeps working at ~100 clients / ~500 tasks via the
  // search box below rather than needing pagination.
  const clientOverview = useMemo(() => {
    if (!isManagerial) return [];
    const byClient = new Map();
    for (const task of tasks) {
      if (!task.client_id) continue;
      if (!byClient.has(task.client_id)) {
        byClient.set(task.client_id, { total: 0, overdue: 0, completed: 0, emailed: 0, assignees: new Set() });
      }
      const bucket = byClient.get(task.client_id);
      bucket.total += 1;
      if (task.status === 'Complete') bucket.completed += 1;
      else if (task.due_date && new Date(task.due_date) < today) bucket.overdue += 1;
      if (task.extra?.client_emailed) bucket.emailed += 1;
      if (task.assigned_to) bucket.assignees.add(task.assigned_to);
    }
    return Array.from(byClient.entries())
      .map(([clientId, bucket]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          clientId,
          clientName: client?.legal_name || 'Unknown Client',
          ...bucket,
          assignees: Array.from(bucket.assignees),
        };
      })
      .filter(row => row.clientName.toLowerCase().includes(clientSearch.toLowerCase()))
      .sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [isManagerial, tasks, clients, clientSearch, today]);

  // Same idea, grouped by assignee instead — the managerial-only "Team
  // Overview" tab ("team members allocated task lists").
  const teamOverview = useMemo(() => {
    if (!isManagerial) return [];
    const byAssignee = new Map();
    for (const task of tasks) {
      const key = task.assigned_to || '__unassigned__';
      if (!byAssignee.has(key)) {
        byAssignee.set(key, { total: 0, overdue: 0, completed: 0, tasks: [] });
      }
      const bucket = byAssignee.get(key);
      bucket.total += 1;
      if (task.status === 'Complete') bucket.completed += 1;
      else if (task.due_date && new Date(task.due_date) < today) bucket.overdue += 1;
      bucket.tasks.push(task);
    }
    return Array.from(byAssignee.entries())
      .map(([email, bucket]) => {
        const member = teamMembers.find(m => m.email === email);
        return {
          email,
          name: email === '__unassigned__' ? 'Unassigned' : (member?.full_name || email),
          ...bucket,
        };
      })
      .filter(row => row.name.toLowerCase().includes(teamSearch.toLowerCase()))
      .sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [isManagerial, tasks, teamMembers, teamSearch, today]);

  const [expandedMember, setExpandedMember] = useState(null);

  const handleEditTask = (task) => {
    // Individual contributors can only open/update their own tasks;
    // managerial roles (director/admin/manager) can edit any task. Real
    // enforcement is server-side (generic.py's _task_scope_filter +
    // TASK_SELF_EDIT_FIELDS) — this is just the matching UI gate.
    if (!isManagerial && task.assigned_to !== user?.email) {
      return;
    }
    setEditingTask(task);
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

  const renderTaskRow = (task, { showAssignee } = {}) => {
    const assignee = teamMembers.find(m => m.email === task.assigned_to);
    return (
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
        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t">
          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
          <Badge className={getStatusColor(task.status)} variant="outline">{task.status}</Badge>
          {showAssignee && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {assignee?.full_name || task.assigned_to || 'Unassigned'}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          <TaskFlags task={task} />
        </div>
      </div>
    );
  };

  const tabTriggerCount = isManagerial ? 4 : 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">My Tasks</h1>
          <p className="text-muted-foreground">Intelligently ranked by urgency score</p>
        </div>
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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <TabsList className={`grid w-full max-w-2xl`} style={{ gridTemplateColumns: `repeat(${tabTriggerCount}, minmax(0, 1fr))` }}>
            <TabsTrigger value="my-tasks" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              My Tasks ({myActiveTasks.length})
            </TabsTrigger>
            {isManagerial && (
              <TabsTrigger value="team-tasks" className="gap-2">
                <Users className="w-4 h-4" />
                Team Tasks ({teamActiveTasks.length})
              </TabsTrigger>
            )}
            {isManagerial && (
              <TabsTrigger value="client-overview" className="gap-2">
                <Building2 className="w-4 h-4" />
                Client Overview
              </TabsTrigger>
            )}
            {isManagerial && (
              <TabsTrigger value="team-overview" className="gap-2">
                <Users className="w-4 h-4" />
                Team Overview
              </TabsTrigger>
            )}
          </TabsList>
          {(selectedTab === 'my-tasks' || selectedTab === 'team-tasks') && (
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
          )}
        </div>

        {/* Kanban view — spans My/Team Tasks tabs only */}
        {viewMode === 'kanban' && (selectedTab === 'my-tasks' || selectedTab === 'team-tasks') ? (
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
                      {myActiveTasks.map((task) => renderTaskRow(task))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tasks Tab — managerial only */}
            {isManagerial && (
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
                        {teamActiveTasks.map((task) => renderTaskRow(task, { showAssignee: true }))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Client Overview Tab — managerial only */}
            {isManagerial && (
              <TabsContent value="client-overview">
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Client Task Overview ({clientOverview.length} clients)
                      </CardTitle>
                      <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search clients..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {clientOverview.length === 0 ? (
                      <p className="text-center text-muted-foreground py-12">No clients with tasks found</p>
                    ) : (
                      <div className="space-y-2">
                        {clientOverview.map((row) => (
                          <Link
                            key={row.clientId}
                            to={`/ClientProfile?client=${row.clientId}`}
                            className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-navy truncate">{row.clientName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {row.assignees.length > 0 ? row.assignees.join(', ') : 'Unassigned'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline">{row.total} total</Badge>
                              {row.overdue > 0 && <Badge className="bg-red-100 text-red-700">{row.overdue} overdue</Badge>}
                              <Badge className="bg-green-100 text-green-700">{row.completed} done</Badge>
                              {row.emailed > 0 && (
                                <Badge className="bg-blue-100 text-blue-700 gap-1">
                                  <Mail className="w-3 h-3" />{row.emailed}
                                </Badge>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Team Overview Tab — managerial only */}
            {isManagerial && (
              <TabsContent value="team-overview">
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Team Allocated Tasks ({teamOverview.length} members)
                      </CardTitle>
                      <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search team members..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {teamOverview.length === 0 ? (
                      <p className="text-center text-muted-foreground py-12">No allocated tasks found</p>
                    ) : (
                      <div className="space-y-2">
                        {teamOverview.map((row) => (
                          <div key={row.email} className="border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedMember(expandedMember === row.email ? null : row.email)}
                              className="w-full flex items-center justify-between gap-4 p-3 hover:bg-slate-50 transition-colors text-left"
                            >
                              <p className="font-semibold text-navy truncate">{row.name}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline">{row.total} total</Badge>
                                {row.overdue > 0 && <Badge className="bg-red-100 text-red-700">{row.overdue} overdue</Badge>}
                                <Badge className="bg-green-100 text-green-700">{row.completed} done</Badge>
                              </div>
                            </button>
                            {expandedMember === row.email && (
                              <div className="border-t bg-slate-50/50 p-3 space-y-2">
                                {row.tasks.map((task) => (
                                  <div key={task.id} className="flex items-center justify-between gap-3 p-2 bg-white border rounded text-sm">
                                    <span className="truncate flex-1">{task.title}</span>
                                    <Badge className={getStatusColor(task.status)} variant="outline">{task.status}</Badge>
                                    {task.due_date && (
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
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
