import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskTemplateSelector from './TaskTemplateSelector';
import TaskCommentSection from '../comments/TaskCommentSection';

export default function TaskFormModal({ task, onClose, currentUser }) {
  const queryClient = useQueryClient();
  // Bookkeeper is the individual-contributor tier — restricted to fields
  // relevant to their own assignment rather than full task management.
  const isUserRole = currentUser?.role === 'bookkeeper';

  const [formData, setFormData] = useState(task || {
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
    assigned_to: currentUser?.email || '',
    client_id: '',
    service_filing_id: '',
    due_date: '',
    start_date: '',
    estimated_hours: '',
    tags: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (task) {
        return api.entities.Task.update(task.id, data);
      } else {
        return api.entities.Task.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['teamTasks']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (dataToSave.estimated_hours) {
      dataToSave.estimated_hours = Number(dataToSave.estimated_hours);
    }
    saveMutation.mutate(dataToSave);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? (isUserRole ? 'Update Task Status' : 'Edit Task') : 'Create New Task'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            {task && <TabsTrigger value="comments">Comments</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Template selector — admin/manager only */}
              {!isUserRole && (
                <div>
                  <Label className="mb-2 block">Quick Select from Templates</Label>
                  <TaskTemplateSelector
                    onSelect={(templateData) => setFormData({ ...formData, ...templateData })}
                    assignedTo={formData.assigned_to}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="title">Task Title {!isUserRole && '*'}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => !isUserRole && setFormData({ ...formData, title: e.target.value })}
                  required={!isUserRole}
                  readOnly={isUserRole}
                  className={isUserRole ? 'bg-slate-50 text-slate-700 cursor-default' : ''}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => !isUserRole && setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  readOnly={isUserRole}
                  className={isUserRole ? 'bg-slate-50 text-slate-700 cursor-default' : ''}
                />
              </div>

              {/* Status — editable for ALL roles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Not Started" className="text-slate-900">Not Started</SelectItem>
                      <SelectItem value="In Progress" className="text-slate-900">In Progress</SelectItem>
                      <SelectItem value="Blocked" className="text-slate-900">Blocked</SelectItem>
                      <SelectItem value="Complete" className="text-slate-900">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  {isUserRole ? (
                    <Input value={formData.priority || ''} readOnly className="bg-slate-50 text-slate-700 cursor-default" />
                  ) : (
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Low" className="text-slate-900">Low</SelectItem>
                        <SelectItem value="Medium" className="text-slate-900">Medium</SelectItem>
                        <SelectItem value="High" className="text-slate-900">High</SelectItem>
                        <SelectItem value="Critical" className="text-slate-900">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Admin/manager-only fields */}
              {!isUserRole && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assigned_to">Assign To</Label>
                      <Select value={formData.assigned_to || ''} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.email} className="text-slate-900">
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="client_id">Link to Client (Optional)</Label>
                      <Select value={formData.client_id || ''} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value={null} className="text-slate-900">None</SelectItem>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id} className="text-slate-900">
                              {client.legal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="service_filing_id">Link to Service Filing (Optional)</Label>
                    <Select value={formData.service_filing_id || ''} onValueChange={(value) => setFormData({ ...formData, service_filing_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service filing" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value={null} className="text-slate-900">None</SelectItem>
                        {serviceFilings.map(filing => (
                          <SelectItem key={filing.id} value={filing.id} className="text-slate-900">
                            {filing.service_name} - {filing.filing_year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date || ''}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date || ''}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      step="0.5"
                      value={formData.estimated_hours || ''}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Due date read-only display for user role */}
              {isUserRole && formData.due_date && (
                <div>
                  <Label>Due Date</Label>
                  <Input
                    value={new Date(formData.due_date).toLocaleDateString()}
                    readOnly
                    className="bg-slate-50 text-slate-700 cursor-default"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          {task && (
            <TabsContent value="comments" className="mt-4">
              <TaskCommentSection taskId={task.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}