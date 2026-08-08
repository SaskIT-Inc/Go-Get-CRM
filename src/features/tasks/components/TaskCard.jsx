import React from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MoreVertical, Edit, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskCard({ task, onEdit, allowFullControl = false }) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  // Check if user has management permissions
  const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());
  const isOwnTask = task.assigned_to === user?.email;
  const canEdit = isManager || (isOwnTask && allowFullControl !== false);
  const canDelete = isManager;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['teamTasks']);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.entities.Task.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['teamTasks']);
    }
  });

  const statusColors = {
    'Not Started': 'bg-gray-500/10 text-gray-700 border-gray-300',
    'In Progress': 'bg-blue-500/10 text-blue-700 border-blue-300',
    'Blocked': 'bg-red-500/10 text-red-700 border-red-300',
    'Complete': 'bg-green-500/10 text-green-700 border-green-300'
  };

  const priorityColors = {
    'Low': 'bg-slate-100 text-slate-700',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700'
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Complete';

  return (
    <Card className={cn("border-none shadow-md hover:shadow-lg transition-all", isOverdue && "border-l-4 border-l-red")}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-navy text-lg mb-1">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {task.assigned_to && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{task.assigned_to}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className={isOverdue ? 'text-red font-semibold' : 'text-muted-foreground'}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {task.estimated_hours && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{task.estimated_hours}h</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 shrink-0">
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[task.status]}>
              {task.status}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'Not Started' })}>
                  Mark as Not Started
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'In Progress' })}>
                  Mark as In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'Complete' })}>
                  Mark as Complete
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(task.id)}
                    className="text-red"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}