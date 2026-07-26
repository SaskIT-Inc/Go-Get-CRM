import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function CentralCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const queryClient = useQueryClient();

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

  // Calculate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get items for a specific date
  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(
      t => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === dateStr
    );
    const dayAppointments = appointments.filter(
      a => a.start_time && format(parseISO(a.start_time), 'yyyy-MM-dd') === dateStr
    );
    return { tasks: dayTasks, appointments: dayAppointments };
  };

  // Get upcoming items (next 7 days)
  const upcomingItems = useMemo(() => {
    const today = new Date();
    const items = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayTasks = tasks.filter(
        t => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === dateStr && t.status !== 'Complete'
      );
      const dayAppointments = appointments.filter(
        a => a.start_time && format(parseISO(a.start_time), 'yyyy-MM-dd') === dateStr
      );

      if (dayTasks.length > 0 || dayAppointments.length > 0) {
        items.push({ date, tasks: dayTasks, appointments: dayAppointments });
      }
    }

    return items;
  }, [tasks, appointments]);

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

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Calendar & Deadlines</h1>
          <p className="text-muted-foreground">Drag tasks to reschedule - synced with task management</p>
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
                    const { tasks: dayTasks, appointments: dayAppointments } = getItemsForDate(day);
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
                                      className={cn(
                                        'p-1 rounded text-xs font-semibold text-white cursor-move truncate',
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
                                    className="text-xs bg-purple-100 text-purple-700 p-0.5 rounded truncate"
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

                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
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
                                className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-navy truncate">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1">
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
                                className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg"
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

      {/* Selected Date Details */}
      {selectedDate && (
        <Card className="mt-6 border-none shadow-md">
          <CardHeader>
            <CardTitle>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const { tasks: dayTasks, appointments: dayAppointments } = getItemsForDate(selectedDate);

              if (dayTasks.length === 0 && dayAppointments.length === 0) {
                return <p className="text-muted-foreground text-center py-8">No tasks or appointments scheduled</p>;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tasks */}
                  {dayTasks.length > 0 && (
                    <div>
                      <h3 className="font-bold text-navy mb-4">Tasks</h3>
                      <div className="space-y-3">
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-navy">{task.title}</h4>
                              <Badge className={`${getPriorityColor(task.priority)} text-white text-xs`}>
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {getStatusIcon(task.status)}
                                {task.status}
                              </span>
                              {task.assigned_to && (
                                <span className="flex items-center gap-1">
                                  👤 {task.assigned_to.split('@')[0]}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span>⏱️ {task.estimated_hours}h</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Appointments */}
                  {dayAppointments.length > 0 && (
                    <div>
                      <h3 className="font-bold text-navy mb-4">Appointments</h3>
                      <div className="space-y-3">
                        {dayAppointments.map(apt => (
                          <div
                            key={apt.id}
                            className="p-4 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-navy">{apt.title}</h4>
                              <Badge className="bg-purple-500 text-white text-xs">
                                {apt.appointment_type || 'Meeting'}
                              </Badge>
                            </div>
                            {apt.description && (
                              <p className="text-sm text-muted-foreground mb-2">{apt.description}</p>
                            )}
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')}
                              </div>
                              {apt.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3" />
                                  {apt.location}
                                </div>
                              )}
                              {apt.assigned_to?.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  {apt.assigned_to.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}