import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, FileText } from 'lucide-react';

export default function AppointmentDetailsModal({ appointment, onClose, clients }) {
  const client = clients.find(c => c.id === appointment.client_id);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{appointment.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{appointment.appointment_type}</Badge>
            <Badge variant="outline" className={
              appointment.status === 'Completed' ? 'bg-green-500/10 text-green-700' :
              appointment.status === 'Cancelled' ? 'bg-red-500/10 text-red-700' :
              'bg-blue-500/10 text-blue-700'
            }>
              {appointment.status}
            </Badge>
          </div>

          {appointment.description && (
            <div>
              <p className="text-sm font-semibold mb-1">Description</p>
              <p className="text-sm text-muted-foreground">{appointment.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Start</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(appointment.start_time).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">End</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(appointment.end_time).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {appointment.location && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Location</p>
                <p className="text-sm text-muted-foreground">{appointment.location}</p>
              </div>
            </div>
          )}

          {client && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Client</p>
                <p className="text-sm text-muted-foreground">{client.legal_name}</p>
              </div>
            </div>
          )}

          {appointment.notes && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Notes</p>
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}