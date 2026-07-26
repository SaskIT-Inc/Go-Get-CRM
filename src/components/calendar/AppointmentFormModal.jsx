import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AppointmentFormModal({ appointment, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(appointment || {
    title: '',
    description: '',
    appointment_type: 'Client Meeting',
    start_time: '',
    end_time: '',
    assigned_to: [currentUser?.email || ''],
    location: '',
    status: 'Scheduled'
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const saveMutation = useMutation({
    mutationFn: (data) => (
      appointment
        ? api.entities.Appointment.update(appointment.id, data)
        : api.entities.Appointment.create(data)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.appointment_type} onValueChange={(value) => setFormData({ ...formData, appointment_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Client Meeting">Client Meeting</SelectItem>
                  <SelectItem value="Internal Meeting">Internal Meeting</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                  <SelectItem value="Video Call">Video Call</SelectItem>
                  <SelectItem value="Site Visit">Site Visit</SelectItem>
                  <SelectItem value="Review Session">Review Session</SelectItem>
                  <SelectItem value="Filing Deadline">Filing Deadline</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Client</Label>
              <Select value={formData.client_id || ''} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>End Time *</Label>
              <Input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Location / Link</Label>
            <Input
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Meeting room, video link, or address"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? 'Saving...' : (appointment ? 'Update' : 'Create Appointment')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}