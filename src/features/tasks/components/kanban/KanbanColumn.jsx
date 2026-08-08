import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  'Not Started': {
    icon: Clock,
    color: 'bg-slate-100 border-slate-300',
    badgeColor: 'bg-slate-200 text-slate-800'
  },
  'In Progress': {
    icon: AlertCircle,
    color: 'bg-blue-100 border-blue-300',
    badgeColor: 'bg-blue-200 text-blue-800'
  },
  'Blocked': {
    icon: Pause,
    color: 'bg-amber-100 border-amber-300',
    badgeColor: 'bg-amber-200 text-amber-800'
  },
  'Complete': {
    icon: CheckCircle2,
    color: 'bg-green-100 border-green-300',
    badgeColor: 'bg-green-200 text-green-800'
  }
};

export default function KanbanColumn({ status, tasks = [], onTaskClick }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col w-full max-w-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h3 className="font-bold text-sm">{status}</h3>
          <Badge className={cn('ml-2', config.badgeColor)}>
            {tasks.length}
          </Badge>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 rounded-lg p-4 min-h-[500px] transition-all',
              config.color,
              snapshot.isDraggingOver && 'ring-2 ring-offset-2 ring-blue-500 bg-opacity-50'
            )}
          >
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'bg-white rounded-lg p-4 shadow-sm border-l-4 cursor-grab active:cursor-grabbing',
                        'hover:shadow-md transition-all',
                        snapshot.isDragging && 'shadow-lg ring-2 ring-blue-400',
                        {
                          'border-l-slate-400': status === 'Not Started',
                          'border-l-blue-400': status === 'In Progress',
                          'border-l-amber-400': status === 'Blocked',
                          'border-l-green-400': status === 'Complete'
                        }
                      )}
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm line-clamp-2">
                          {task.title}
                        </h4>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-1 flex-wrap">
                            {task.priority && (
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            )}
                            {task.assigned_to && (
                              <Badge variant="secondary" className="text-xs">
                                {task.assigned_to.split('@')[0]}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {task.due_date && (
                          <div className="text-xs text-muted-foreground">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}