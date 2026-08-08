import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  MapPin
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MANAGERIAL_ROLES } from '@/lib/permissions';
import TaskFormModal from '@/features/tasks/components/TaskFormModal';
import AppointmentDetailsModal from '@/features/calendar/components/AppointmentDetailsModal';
import FilingDetailsModal from '@/features/calendar/components/FilingDetailsModal';
import DayDetailsModal from '@/features/calendar/components/DayDetailsModal';

export default function CentralCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editingFiling, setEditingFiling] = useState(null);
  const [layers, setLayers] = useState({ tasks: true, appointments: true, filings: false });
  const [viewFilter, setViewFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });
  const isManagerial = MANAGERIAL_ROLES.includes(currentUser?.role);

  // Fetch data
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: filings = [] } = useQuery({
    queryKey: ['filings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.User.list(),
    enabled: isManagerial,
  });

  // Update task due date
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, newDueDate }) =>
      api.entities.Task.update(taskId, { due_date: newDueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task rescheduled successfully');
    },
    onError: () => {
      toast.error('Failed to reschedule task');
    }
  });

  // Handle drag and drop
  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;

    if (!destination) return;

    const taskId = draggableId.replace('task-', '');
    const newDateStr = destination.droppableId.replace('day-', '');
    const newDate = parseISO(newDateStr);

    updateTaskMutation.mutate({
      taskId,
      newDueDate: format(newDate, 'yyyy-MM-dd')
    });
  };

  // Managerial "My Tasks / Team / [member]" filter — client-side, on top of
  // the already server-scoped list (_task_scope_filter already restricts
  // non-managerial users to their own tasks, so this control is hidden for
  // them entirely — there's nothing left to toggle).
  const visibleTasks = useMemo(() => {
    if (!isManagerial || viewFilter === 'all') return tasks;
    if (viewFilter === 'mine') return tasks.filter((t) => t.assigned_to === currentUser?.email);
    return tasks.filter((t) => t.assigned_to === viewFilter);
  }, [tasks, isManagerial, viewFilter, currentUser]);

  const visibleAppointments = useMemo(() => {
    if (!isManagerial || viewFilter === 'all') return appointments;
    const email = viewFilter === 'mine' ? currentUser?.email : viewFilter;
    return appointments.filter((a) => a.assigned_to?.includes(email));
  }, [appointments, isManagerial, viewFilter, currentUser]);

  const visibleFilings = useMemo(() => {
    if (!isManagerial || viewFilter === 'all') return filings;
    const email = viewFilter === 'mine' ? currentUser?.email : viewFilter;
    return filings.filter((f) => f.assigned_to === email);
  }, [filings, isManagerial, viewFilter, currentUser]);

  // Calculate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get items for a specific date
  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = layers.tasks
      ? visibleTasks.filter(t => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === dateStr)
      : [];
    const dayAppointments = layers.appointments
      ? visibleAppointments.filter(a => a.start_time && format(parseISO(a.start_time), 'yyyy-MM-dd') === dateStr)
      : [];
    const dayFilings = layers.filings
      ? visibleFilings.filter(f => f.due_date && format(parseISO(f.due_date), 'yyyy-MM-dd') === dateStr)
      : [];
    return { tasks: dayTasks, appointments: dayAppointments, filings: dayFilings };
  };

  // Get upcoming items (next 7 days)
  const upcomingItems = useMemo(() => {
    const today = new Date();
    const items = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayTasks = visibleTasks.filter(
        t => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === dateStr && t.status !== 'Complete'
      );
      const dayAppointments = visibleAppointments.filter(
        a => a.start_time && format(parseISO(a.start_time), 'yyyy-MM-dd') === dateStr
      );

      if (dayTasks.length > 0 || dayAppointments.length > 0) {
        items.push({ date, tasks: dayTasks, appointments: dayAppointments });
      }
    }

    return items;
  }, [visibleTasks, visibleAppointments]);

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-500',
      'High': 'bg-orange-500',
      'Medium': 'bg-yellow-500',
      'Low': 'bg-green-500'
    };
    return colors[priority] || 'bg-slate-500';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Blocked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.legal_name || 'Unknown Client';
  };

  const rescheduleTooltip = (task) => {
    const history = task.extra?.overdue_reschedule_history;
    if (!history?.length) return 'Automatically rescheduled after going overdue';
    return history.map((h) => `${h.from} → ${h.to}`).join('\n');
  };

  const selectedDateItems = selectedDate ? getItemsForDate(selectedDate) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Calendar & Deadlines</h1>
          <p className="text-muted-foreground">Drag tasks to reschedule, or click a date/task/appointment for full details</p>
        </div>
        <div className="flex gap-2">
          <Link to="/Tasks">
            <Button variant="outline" size="sm">My Tasks</Button>
          </Link>
          <Link to="/TeamTaskDashboard">
            <Button variant="outline" size="sm">Team Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Layer toggles + managerial assignee filter */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Show:</span>
        {[
          { key: 'tasks', label: 'Tasks' },
          { key: 'appointments', label: 'Appointments' },
          { key: 'filings', label: 'Filing Deadlines' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={layers[key] ? 'default' : 'outline'}
            onClick={() => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
            className={layers[key] ? 'bg-navy text-white hover:bg-navy/90' : ''}
          >
            {label}
          </Button>
        ))}

        {isManagerial && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">View:</span>
            <Select value={viewFilter} onValueChange={setViewFilter}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Whole Team</SelectItem>
                <SelectItem value="mine">My Own</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.email}>{member.full_name || member.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-sm text-navy py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map(day => {
                    const { tasks: dayTasks, appointments: dayAppointments, filings: dayFilings } = getItemsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <Droppable
                        key={format(day, 'yyyy-MM-dd')}
                        droppableId={`day-${format(day, 'yyyy-MM-dd')}`}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                              'min-h-[120px] p-2 rounded-lg border-2 transition-all',
                              !isCurrentMonth && 'bg-slate-50 border-slate-200',
                              isCurrentMonth && !isSelected && 'bg-white border-slate-200 hover:border-blue-400',
                              isSelected && 'border-blue-500 bg-blue-50',
                              snapshot.isDraggingOver && 'bg-green-50 border-green-400'
                            )}
                          >
                            <p className={cn(
                              'font-bold text-sm mb-1',
                              !isCurrentMonth && 'text-slate-400',
                              isCurrentMonth && 'text-navy'
                            )}>
                              {format(day, 'd')}
                            </p>

                            {/* Tasks */}
                            <div className="space-y-1">
                              {dayTasks.map((task, idx) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={`task-${task.id}`}
                                  index={idx}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                                      className={cn(
                                        'p-1 rounded text-xs font-semibold text-white truncate cursor-pointer',
                                        getPriorityColor(task.priority),
                                        snapshot.isDragging && 'opacity-50 ring-2 ring-blue-400'
                                      )}
                                      title={task.title}
                                    >
                                      {task.title}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>

                            {/* Appointments */}
                            {dayAppointments.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-200 space-y-0.5">
                                {dayAppointments.slice(0, 1).map(apt => (
                                  <div
                                    key={apt.id}
                                    onClick={(e) => { e.stopPropagation(); setEditingAppointment(apt); }}
                                    className="text-xs bg-purple-100 text-purple-700 p-0.5 rounded truncate cursor-pointer"
                                    title={apt.title}
                                  >
                                    📅 {apt.title}
                                  </div>
                                ))}
                                {dayAppointments.length > 1 && (
                                  <p className="text-xs text-slate-500">+{dayAppointments.length - 1} more</p>
                                )}
                              </div>
                            )}

                            {/* Filing deadlines */}
                            {dayFilings.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-200 space-y-0.5">
                                {dayFilings.slice(0, 1).map(filing => (
                                  <div
                                    key={filing.id}
                                    onClick={(e) => { e.stopPropagation(); setEditingFiling(filing); }}
                                    className="text-xs bg-teal-100 text-teal-700 p-0.5 rounded truncate cursor-pointer"
                                    title={filing.service_name}
                                  >
                                    📋 {filing.service_name}
                                  </div>
                                ))}
                                {dayFilings.length > 1 && (
                                  <p className="text-xs text-slate-500">+{dayFilings.length - 1} more</p>
                                )}
                              </div>
                            )}

                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Items Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Next 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No upcoming tasks or appointments</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingItems.map((item) => (
                      <div key={format(item.date, 'yyyy-MM-dd')} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-bold text-sm text-navy mb-2">
                          {format(item.date, 'EEE, MMM d')}
                        </p>

                        {/* Tasks */}
                        {item.tasks.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {item.tasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setEditingTask(task)}
                                className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-navy truncate">
                                    {task.title}
                                  </p>
                                  {task.client_id && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {getClientName(task.client_id)}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <Badge
                                      className="text-xs"
                                      variant="outline"
                                    >
                                      {task.priority}
                                    </Badge>
                                    {task.assigned_to && (
                                      <span className="text-xs text-muted-foreground">
                                        {task.assigned_to.split('@')[0]}
                                      </span>
                                    )}
                                    {task.extra?.overdue_reschedule_history?.length > 0 && (
                                      <span
                                        className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 whitespace-pre-line"
                                        title={rescheduleTooltip(task)}
                                      >
                                        ↻ Rescheduled
                                      </span>
                                    )}
                                    {(task.extra?.client_emailed || task.client_emailed) && (
                                      <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5">
                                        ✉️ Emailed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Appointments */}
                        {item.appointments.length > 0 && (
                          <div className="space-y-1.5">
                            {item.appointments.map(apt => (
                              <div
                                key={apt.id}
                                onClick={() => setEditingAppointment(apt)}
                                className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100"
                              >
                                <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-purple-900 truncate">
                                    {apt.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-purple-700">
                                    <Clock className="w-3 h-3" />
                                    {format(parseISO(apt.start_time), 'h:mm a')}
                                  </div>
                                  {apt.location && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                                      <MapPin className="w-3 h-3" />
                                      {apt.location}
                                    </div>
                                  )}
                                  {apt.assigned_to?.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-purple-700">
                                      <Users className="w-3 h-3" />
                                      {apt.assigned_to.length} attendee{apt.assigned_to.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
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
          </div>
        </div>
      </DragDropContext>

      {selectedDate && selectedDateItems && (
        <DayDetailsModal
          date={selectedDate}
          tasks={selectedDateItems.tasks}
          appointments={selectedDateItems.appointments}
          filings={selectedDateItems.filings}
          getClientName={getClientName}
          getStatusIcon={getStatusIcon}
          getPriorityColor={getPriorityColor}
          onOpenTask={setEditingTask}
          onOpenAppointment={setEditingAppointment}
          onOpenFiling={setEditingFiling}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          currentUser={currentUser}
          onClose={() => setEditingTask(null)}
        />
      )}

      {editingAppointment && (
        <AppointmentDetailsModal
          appointment={editingAppointment}
          clients={clients}
          onClose={() => setEditingAppointment(null)}
        />
      )}

      {editingFiling && (
        <FilingDetailsModal
          filing={editingFiling}
          clientName={getClientName(editingFiling.client_id)}
          onClose={() => setEditingFiling(null)}
        />
      )}
    </div>
  );
}
