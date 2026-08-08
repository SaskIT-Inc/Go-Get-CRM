import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskTemplateSelector from './TaskTemplateSelector';
import TaskCommentSection from '@/features/tasks/components/comments/TaskCommentSection';
import { toast } from 'sonner';
import { MANAGERIAL_ROLES } from '@/lib/permissions';

const SERVICE_FREQUENCY_OPTIONS = ['Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Annually'];

export default function TaskFormModal({ task, onClose, currentUser }) {
  const queryClient = useQueryClient();
  // Every individual-contributor role (bookkeeper, accountant, cpa,
  // business_consultant, intern, other) is restricted to fields relevant
  // to their own assignment rather than full task management — enforced
  // for real server-side (generic.py's TASK_SELF_EDIT_FIELDS), this is
  // just the matching UI.
  const isUserRole = !MANAGERIAL_ROLES.includes(currentUser?.role);
  const [clientEmailed, setClientEmailed] = useState(false);
  const [clientEmailedNote, setClientEmailedNote] = useState('');
  const wasAlreadyComplete = task?.status === 'Complete';

  const [formData, setFormData] = useState(task || {
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
    assigned_to: currentUser?.email || '',
    client_id: '',
    service_filing_id: '',
    linked_service_id: '',
    linked_package_id: '',
    service_frequency: '',
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

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list(),
    retry: false,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.entities.Package.list(),
    retry: false,
  });

  // A task auto-created from "Add Service" links to that specific filing
  // via service_filing_id — distinct from (and usually alongside a blank)
  // linked_service_id/linked_package_id below, which point at the reusable
  // catalog template instead. Surfaced read-only since nothing here is
  // meant to be re-pointed at a different filing.
  const { data: linkedFiling } = useQuery({
    queryKey: ['serviceFiling', task?.service_filing_id],
    queryFn: () => api.entities.ServiceFiling.get(task.service_filing_id),
    enabled: !!task?.service_filing_id,
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
      // Partial key match — refreshes every per-client Tasks tab
      // (ClientProfile.jsx) regardless of which client this task belongs to.
      queryClient.invalidateQueries(['clientTasks']);
      // A "client emailed" completion creates a real Communication row
      // server-side — refresh the client's Comms thread too, if open.
      queryClient.invalidateQueries(['communications']);
      queryClient.invalidateQueries(['activities']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save task');
    }
  });

  const isCompletingNow = task && !wasAlreadyComplete && formData.status === 'Complete';

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    dataToSave.estimated_hours = dataToSave.estimated_hours ? Number(dataToSave.estimated_hours) : null;
    if (isCompletingNow && clientEmailed) {
      dataToSave._client_emailed = true;
      dataToSave._client_emailed_note = clientEmailedNote.trim() || undefined;
    }
    saveMutation.mutate(dataToSave);
  };

  // A task links to at most one of Service/Package — encode the pick as
  // "service:<id>" / "package:<id>" in a single dropdown, split back into
  // the two separate fields on change.
  const linkedValue = formData.linked_service_id
    ? `service:${formData.linked_service_id}`
    : formData.linked_package_id
    ? `package:${formData.linked_package_id}`
    : '';

  const handleLinkedChange = (value) => {
    const [type, id] = value.split(':');
    setFormData({
      ...formData,
      linked_service_id: type === 'service' ? id : '',
      linked_package_id: type === 'package' ? id : '',
    });
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

              {linkedFiling && (
                <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800">
                  📋 Auto-linked to service filing: <span className="font-semibold">{linkedFiling.service_name}</span>
                  {linkedFiling.due_date && ` — due ${new Date(linkedFiling.due_date).toLocaleDateString()}`}
                  {' '}({linkedFiling.status})
                </div>
              )}

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

              {/* Optional "was the client emailed" prompt — shown only when
                  marking a client-linked task Complete for the first time;
                  skippable, never blocks saving. */}
              {isCompletingNow && formData.client_id && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="client_emailed"
                      checked={clientEmailed}
                      onCheckedChange={(checked) => setClientEmailed(!!checked)}
                    />
                    <Label htmlFor="client_emailed" className="cursor-pointer">
                      Client has been emailed about this
                    </Label>
                  </div>
                  {clientEmailed && (
                    <Textarea
                      placeholder="Optional note about what was communicated..."
                      value={clientEmailedNote}
                      onChange={(e) => setClientEmailedNote(e.target.value)}
                      rows={2}
                      className="bg-white"
                    />
                  )}
                </div>
              )}

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
                    <Label htmlFor="linked_service">Link to Service / Package (Optional)</Label>
                    <Select value={linkedValue} onValueChange={handleLinkedChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service or package" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {services.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Services</SelectLabel>
                            {services.map(s => (
                              <SelectItem key={s.id} value={`service:${s.id}`} className="text-slate-900">
                                {s.service_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {packages.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Packages</SelectLabel>
                            {packages.map(p => (
                              <SelectItem key={p.id} value={`package:${p.id}`} className="text-slate-900">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="service_frequency">Service Frequency (Optional)</Label>
                    <Select
                      value={formData.service_frequency || undefined}
                      onValueChange={(value) => setFormData({ ...formData, service_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {SERVICE_FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="text-slate-900">{option}</SelectItem>
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