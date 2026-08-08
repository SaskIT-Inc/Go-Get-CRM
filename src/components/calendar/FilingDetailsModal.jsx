import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Building2 } from 'lucide-react';

export default function FilingDetailsModal({ filing, clientName, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{filing.service_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Badge variant="outline">{filing.status}</Badge>

          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Client</p>
              <p className="text-sm text-muted-foreground">{clientName || 'Unknown Client'}</p>
            </div>
          </div>

          {filing.due_date && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Due Date</p>
                <p className="text-sm text-muted-foreground">{new Date(filing.due_date).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {filing.assigned_to && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Assigned To</p>
                <p className="text-sm text-muted-foreground">{filing.assigned_to}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
