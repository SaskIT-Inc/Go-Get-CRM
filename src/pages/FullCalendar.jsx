import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, FileText, CheckCircle } from 'lucide-react';
import AppointmentFormModal from '@/components/calendar/AppointmentFormModal';
import AppointmentDetailsModal from '@/components/calendar/AppointmentDetailsModal';

export default function FullCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  // Combine all calendar events
  const calendarEvents = useMemo(() => {
    const events = [];

    // Add appointments
    appointments.forEach(apt => {
      events.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: apt.title,
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
        data: apt,
        color: 'blue'
      });
    });

    // Add tasks with due dates
    tasks.filter(t => t.due_date && t.status !== 'Complete').forEach(task => {
      events.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        data: task,
        color: task.priority === 'Critical' ? 'red' : task.priority === 'High' ? 'orange' : 'purple'
      });
    });

    // Add filing deadlines
    serviceFilings.filter(f => f.due_date && f.status !== 'Completed').forEach(filing => {
      events.push({
        id: `filing-${filing.id}`,
        type: 'filing',
        title: `${filing.service_name} - Filing Due`,
        start: new Date(filing.due_date),
        end: new Date(filing.due_date),
        data: filing,
        color: 'green'
      });
    });

    return events;
  }, [appointments, tasks, serviceFilings]);

  // Calendar grid generation
  const generateMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const grid = [];
    let day = 1;

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if ((week === 0 && dayOfWeek < startingDayOfWeek) || day > daysInMonth) {
          weekDays.push(null);
        } else {
          weekDays.push(new Date(year, month, day));
          day++;
        }
      }
      grid.push(weekDays);
      if (day > daysInMonth) break;
    }

    return grid;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event) => {
    if (event.type === 'appointment') {
      setSelectedAppointment(event.data);
    }
  };

  const monthGrid = generateMonthGrid();
  const todayEvents = getEventsForDate(new Date());
  const upcomingEvents = calendarEvents
    .filter(e => e.start > new Date())
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-700 border-blue-300',
    red: 'bg-red-500/10 text-red-700 border-red-300',
    orange: 'bg-orange-500/10 text-orange-700 border-orange-300',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-300',
    green: 'bg-green-500/10 text-green-700 border-green-300'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Calendar</h1>
          <p className="text-muted-foreground">Unified view of tasks, appointments, and deadlines</p>
        </div>
        <Button onClick={() => setShowAppointmentForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleToday}>Today</Button>
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
              <div className="min-w-[640px]">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {monthGrid.map((week, weekIdx) => (
                  <React.Fragment key={weekIdx}>
                    {week.map((date, dayIdx) => {
                      const events = date ? getEventsForDate(date) : [];
                      const isToday = date && date.toDateString() === new Date().toDateString();

                      return (
                        <div
                          key={dayIdx}
                          className={`min-h-[100px] border rounded-lg p-2 ${
                            date ? 'bg-white hover:bg-slate-50 cursor-pointer' : 'bg-slate-50'
                          } ${isToday ? 'border-2 border-blue-500' : 'border-slate-200'}`}
                          onClick={() => date && setSelectedDate(date)}
                        >
                          {date && (
                            <>
                              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                                {date.getDate()}
                              </div>
                              <div className="space-y-1">
                                {events.slice(0, 2).map(event => (
                                  <div
                                    key={event.id}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate ${colorClasses[event.color]}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                  >
                                    {event.title}
                                  </div>
                                ))}
                                {events.length > 2 && (
                                  <div className="text-xs text-muted-foreground">+{events.length - 2} more</div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Events */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                Today's Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events today</p>
              ) : (
                <div className="space-y-3">
                  {todayEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className={colorClasses[event.color]}>
                          {event.type}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm mt-2">{event.title}</p>
                      {event.type === 'appointment' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="pb-3 border-b last:border-0">
                    <p className="font-semibold text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAppointmentForm && (
        <AppointmentFormModal
          onClose={() => setShowAppointmentForm(false)}
          currentUser={user}
        />
      )}

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          clients={clients}
        />
      )}
    </div>
  );
}