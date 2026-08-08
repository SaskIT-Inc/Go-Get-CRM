import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import KanbanColumn from './KanbanColumn';
import { AlertCircle } from 'lucide-react';

const STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Complete'];

export default function TaskKanban({ tasks, currentUser, teamMembers }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, taskData }) =>
      api.entities.Task.update(taskId, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setError(null);
    },
    onError: (err) => {
      setError('Failed to update task. Please try again.');
      console.error(err);
    },
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // No movement
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    if (newStatus === task.status) return;

    updateTaskMutation.mutate({
      taskId: task.id,
      taskData: { ...task, status: newStatus },
    });
  };

  const tasksByStatus = {};
  STATUSES.forEach((status) => {
    tasksByStatus[status] = tasks.filter((t) => t.status === status);
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl p-4 transition-colors ${
                    snapshot.isDraggingOver
                      ? 'bg-primary/5 border-2 border-primary'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {status}
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                      {tasksByStatus[status].length}
                    </span>
                  </h3>

                  <div className="space-y-3 min-h-[200px]">
                    {tasksByStatus[status].map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded-lg border transition-all ${
                              snapshot.isDragging
                                ? 'bg-white shadow-lg border-primary scale-105'
                                : 'bg-white border-slate-200 hover:shadow-md'
                            }`}
                          >
                            <p className="font-semibold text-slate-800 text-sm mb-1">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                  task.priority === 'Critical'
                                    ? 'bg-red-100 text-red-700'
                                    : task.priority === 'High'
                                    ? 'bg-orange-100 text-orange-700'
                                    : task.priority === 'Medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              {task.due_date && (
                                <span className="text-xs text-slate-500">
                                  {new Date(task.due_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                            {task.assigned_to && (
                              <p className="text-xs text-slate-400 mt-2">
                                {teamMembers?.find(m => m.email === task.assigned_to)?.full_name || task.assigned_to}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}