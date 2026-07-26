import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceKanban() {
  const queryClient = useQueryClient();

  const { data: rawStages = [] } = useQuery({
    queryKey: ['statusStages'],
    queryFn: () => api.entities.StatusStageMaster.list(),
    select: (data) => data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  });

  // Deduplicate stages by status_name to prevent duplicate DnD keys
  const stages = rawStages.filter(
    (stage, idx, arr) => arr.findIndex(s => s.status_name === stage.status_name) === idx
  );

  const { data: services = [] } = useQuery({
    queryKey: ['clientServices'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: automationRules = [] } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => api.entities.AutomationRulesMaster.list()
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, newStatus }) =>
      api.entities.ServiceFiling.update(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientServices'] });
    }
  });

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const service = services.find((s) => s.id === draggableId);
    if (!service) return;

    const newStatus = destination.droppableId;
    const oldStatus = service.status;

    // Update service status
    await updateServiceMutation.mutateAsync({ id: draggableId, newStatus });

    // Trigger automation rule if exists
    const triggerEvent = `Service Status Changed: ${oldStatus} → ${newStatus}`;
    const rule = automationRules.find((r) => r.trigger_event === triggerEvent);
    if (rule && rule.system_action) {
      console.log(`Automation triggered: ${rule.system_action}`);
      // In production, invoke backend function to execute the automation
    }
  };

  const getServicesByStatus = (status) => services.filter((s) => s.status === status);

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date() && dueDate;

  return (
    <div className="w-full overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 min-w-full p-6 bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl">
          {stages.map((stage) => {
            const stageServices = getServicesByStatus(stage.status_name);
            return (
              <Droppable key={stage.status_name} droppableId={stage.status_name}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-80 rounded-lg p-4 transition-all ${
                      snapshot.isDraggingOver ? 'bg-blue-50 shadow-lg' : 'bg-white shadow-md'
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="mb-4 pb-4 border-b-2 border-slate-200">
                      <h3 className="font-bold text-navy text-lg">{stage.status_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stageServices.length} service{stageServices.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Service Cards */}
                    <div className="space-y-3 min-h-96">
                      {stageServices.map((service, index) => (
                        <Draggable key={service.id} draggableId={service.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? 'shadow-xl bg-white border-blue-500 scale-105'
                                  : 'bg-slate-50 border-slate-200 hover:shadow-md'
                              }`}
                            >
                              {/* Service Header */}
                              <h4 className="font-semibold text-navy text-sm mb-2 line-clamp-2">
                                {service.service_name}
                              </h4>

                              {/* Client Info */}
                              <p className="text-xs text-muted-foreground mb-3">
                                Client: {service.client_id}
                              </p>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {service.filing_year && (
                                  <Badge className="text-xs bg-slate-200 text-slate-700">
                                    {service.filing_year}
                                  </Badge>
                                )}
                              </div>

                              {/* Due Date */}
                              {service.due_date && (
                                <div
                                  className={`flex items-center gap-2 text-xs mt-3 p-2 rounded ${
                                    isOverdue(service.due_date)
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {isOverdue(service.due_date) ? (
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                  )}
                                  <span>
                                    {isOverdue(service.due_date) ? 'Overdue: ' : 'Due: '}
                                    {format(new Date(service.due_date), 'MMM d')}
                                  </span>
                                </div>
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}