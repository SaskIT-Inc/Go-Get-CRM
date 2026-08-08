import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Clock, MapPin, Users, FileCheck2 } from 'lucide-react';

export default function DayDetailsModal({
  date,
  tasks,
  appointments,
  filings,
  getClientName,
  getStatusIcon,
  getPriorityColor,
  onOpenTask,
  onOpenAppointment,
  onOpenFiling,
  onClose,
}) {
  const isEmpty = tasks.length === 0 && appointments.length === 0 && filings.length === 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(date, 'EEEE, MMMM d, yyyy')}</DialogTitle>
        </DialogHeader>

        {isEmpty ? (
          <p className="text-muted-foreground text-center py-8">No tasks, appointments, or filing deadlines this day</p>
        ) : (
          <div className="space-y-6">
            {tasks.length > 0 && (
              <div>
                <h3 className="font-bold text-navy mb-3">Tasks</h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onOpenTask(task)}
                      className="p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-navy text-sm">{task.title}</h4>
                        <Badge className={`${getPriorityColor(task.priority)} text-white text-xs`}>{task.priority}</Badge>
                      </div>
                      {task.client_id && (
                        <p className="text-xs font-medium text-navy/70 mb-1">🏢 {getClientName(task.client_id)}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">{getStatusIcon(task.status)}{task.status}</span>
                        {task.assigned_to && <span>👤 {task.assigned_to.split('@')[0]}</span>}
                        {task.estimated_hours && <span>⏱️ {task.estimated_hours}h</span>}
                        {task.extra?.overdue_reschedule_history?.length > 0 && (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            ↻ Auto-Rescheduled ×{task.extra.overdue_reschedule_history.length}
                          </span>
                        )}
                        {(task.extra?.client_emailed || task.client_emailed) && (
                          <span className="text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            ✉️ Emailed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointments.length > 0 && (
              <div>
                <h3 className="font-bold text-navy mb-3">Appointments</h3>
                <div className="space-y-2">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => onOpenAppointment(apt)}
                      className="p-3 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-navy text-sm">{apt.title}</h4>
                        <Badge className="bg-purple-500 text-white text-xs">{apt.appointment_type || 'Meeting'}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')}
                        </span>
                        {apt.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{apt.location}</span>
                        )}
                        {apt.assigned_to?.length > 0 && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{apt.assigned_to.length}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filings.length > 0 && (
              <div>
                <h3 className="font-bold text-navy mb-3">Filing Deadlines</h3>
                <div className="space-y-2">
                  {filings.map((filing) => (
                    <div
                      key={filing.id}
                      onClick={() => onOpenFiling(filing)}
                      className="p-3 border border-teal-200 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-navy text-sm">{filing.service_name}</h4>
                        <Badge className="bg-teal-600 text-white text-xs">{filing.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><FileCheck2 className="w-3 h-3" />{getClientName(filing.client_id)}</span>
                        {filing.assigned_to && <span>👤 {filing.assigned_to.split('@')[0]}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
