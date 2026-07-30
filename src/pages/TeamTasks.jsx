import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TaskCard from '@/components/tasks/TaskCard';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import { Users, User, Plus, Calendar, Clock, AlertCircle, CheckCircle, Edit, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TeamTasks() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['teamTasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => api.entities.User.list()
  });

  // Check if user has management permissions
  const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());
  
  // Only Directors, CEMs, and Accountants can view team member dashboards
  const canViewMemberDashboard = ['director', 'admin'].includes(user?.role?.toLowerCase());

  const activeTasks = tasks.filter(t => t.status !== 'Complete');
  
  // Group by assigned staff
  const byStaff = activeTasks.reduce((acc, task) => {
    const staff = task.assigned_to || 'Unassigned';
    if (!acc[staff]) acc[staff] = [];
    acc[staff].push(task);
    return acc;
  }, {});

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleCloseForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const getTaskStatus = (task) => {
    if (task.status === 'Complete') return { label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' };
    if (task.due_date && new Date(task.due_date) < new Date()) return { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
    if (task.status === 'In Progress') return { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (task.status === 'Blocked') return { label: 'Blocked', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const deleteMutation = useMutation({
    mutationFn: (taskId) => api.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      toast.success('Task deleted');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete task')
  });

  const memberTasks = selectedMember 
    ? activeTasks.filter(t => t.assigned_to === selectedMember)
    : [];

  // Get unique team members who have tasks
  const teamMembers = Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean))).sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Team Member Dashboard Search - Only for authorized roles */}
      {canViewMemberDashboard && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <label className="text-sm font-semibold text-blue-900 block mb-2">
                View Team Member Dashboard
              </label>
              <Select value={selectedMember || ""} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMember && (
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-blue-600" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Team Tasks</h1>
          <p className="text-muted-foreground">All team assignments and workload distribution</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowTaskForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Assign Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold text-navy">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold text-purple-600">{Object.keys(byStaff).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Per Person</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(activeTasks.length / Math.max(Object.keys(byStaff).length, 1))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Show member dashboard if selected */}
      {selectedMember && canViewMemberDashboard && (
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">{selectedMember}'s Task Dashboard</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-none shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Assigned</p>
                  <p className="text-2xl font-bold text-navy">{memberTasks.length}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {memberTasks.filter(t => t.status === 'In Progress').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {memberTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Complete').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {memberTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No tasks assigned</p>
              ) : (
                memberTasks.map(task => (
                  <div key={task.id} onClick={() => setSelectedTaskDetail(task)} className="cursor-pointer">
                    <TaskCard task={task} onEdit={handleEdit} allowFullControl={isManager} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="byMember">By Team Member</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {activeTasks.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskDetail(task)}
              className="cursor-pointer"
            >
              <TaskCard task={task} onEdit={handleEdit} allowFullControl={isManager} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="byMember" className="space-y-6">
           {Object.entries(byStaff).map(([staff, staffTasks]) => (
             <Card 
               key={staff} 
               className="border-none shadow-md cursor-pointer hover:shadow-lg transition-all"
               onClick={() => setSelectedMember(staff)}
             >
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3 justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                       <User className="w-5 h-5 text-navy" />
                     </div>
                     <div>
                       <h3 className="font-bold text-navy">{staff}</h3>
                       <p className="text-sm text-muted-foreground">{staffTasks.length} active tasks</p>
                     </div>
                   </div>
                   {isManager && (
                     <Button 
                       size="sm" 
                       variant="outline"
                       onClick={(e) => {
                         e.stopPropagation();
                         setSelectedMember(staff);
                       }}
                     >
                       Manage Tasks
                     </Button>
                   )}
                 </div>

                 <div className="space-y-3 mt-4">
                    {staffTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskDetail(task);
                        }}
                        className="cursor-pointer"
                      >
                        <TaskCard task={task} onEdit={handleEdit} allowFullControl={isManager} />
                      </div>
                    ))}
                    {staffTasks.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">+{staffTasks.length - 3} more tasks</p>
                    )}
                 </div>
               </CardContent>
             </Card>
           ))}
         </TabsContent>
      </Tabs>

      {showTaskForm && (
        <TaskFormModal
          task={editingTask}
          onClose={handleCloseForm}
          currentUser={user}
        />
      )}

      {/* Member Task Management Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedMember}'s Tasks</span>
              {isManager && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingTask(null);
                    setShowTaskForm(true);
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {memberTasks.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tasks assigned to this member</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberTasks.map(task => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-navy mb-1">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${task.status === 'Complete' ? 'bg-green-100 text-green-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {task.status}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${task.priority === 'Critical' ? 'bg-red-100 text-red-700' : task.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getDaysUntilDue(task.due_date) < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                      </div>
                      {isManager && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleEdit(task);
                              setSelectedMember(null);
                            }}
                            className="gap-1"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(task)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Details Modal */}
      <Dialog open={!!selectedTaskDetail} onOpenChange={() => setSelectedTaskDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTaskDetail?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedTaskDetail && (
            <div className="space-y-6">
              {/* Status Indicator */}
              <div className={`p-4 rounded-lg ${getTaskStatus(selectedTaskDetail).bg}`}>
                <div className="flex items-center gap-2">
                  {getTaskStatus(selectedTaskDetail).label === 'Completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {getTaskStatus(selectedTaskDetail).label === 'Overdue' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {getTaskStatus(selectedTaskDetail).label === 'In Progress' && <Clock className="w-5 h-5 text-blue-600" />}
                  <span className={`font-semibold ${getTaskStatus(selectedTaskDetail).color}`}>
                    {getTaskStatus(selectedTaskDetail).label}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTaskDetail.description && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{selectedTaskDetail.description}</p>
                </div>
              )}

              {/* Task Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-semibold">{selectedTaskDetail.status}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Priority</p>
                  <p className="text-sm font-semibold">{selectedTaskDetail.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Assigned To</p>
                  <p className="text-sm">{selectedTaskDetail.assigned_to || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Estimated Hours</p>
                  <p className="text-sm">{selectedTaskDetail.estimated_hours || 'N/A'}</p>
                </div>
              </div>

              {/* Deadline */}
              {selectedTaskDetail.due_date && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Deadline</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(selectedTaskDetail.due_date).toLocaleDateString()}</span>
                    {getDaysUntilDue(selectedTaskDetail.due_date) !== null && (
                      <span className={`text-sm font-semibold ${getDaysUntilDue(selectedTaskDetail.due_date) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        ({getDaysUntilDue(selectedTaskDetail.due_date) < 0 ? `${Math.abs(getDaysUntilDue(selectedTaskDetail.due_date))} days overdue` : `${getDaysUntilDue(selectedTaskDetail.due_date)} days left`})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                {selectedTaskDetail.start_date && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Start Date</p>
                    <p className="text-sm">{new Date(selectedTaskDetail.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedTaskDetail.completed_date && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Completed Date</p>
                    <p className="text-sm">{new Date(selectedTaskDetail.completed_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Related Info */}
              {(selectedTaskDetail.client_id || selectedTaskDetail.service_filing_id) && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">Related To</p>
                  {selectedTaskDetail.client_id && <p className="text-sm">Client ID: {selectedTaskDetail.client_id}</p>}
                  {selectedTaskDetail.service_filing_id && <p className="text-sm">Filing ID: {selectedTaskDetail.service_filing_id}</p>}
                </div>
              )}

              {/* Notes */}
              {selectedTaskDetail.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{selectedTaskDetail.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEdit(selectedTaskDetail);
                    setSelectedTaskDetail(null);
                  }}
                >
                  Edit Task
                </Button>
                <Button variant="outline" onClick={() => setSelectedTaskDetail(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}