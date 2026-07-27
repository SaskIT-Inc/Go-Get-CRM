import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const stageHeaderColors = {
  Onboarding: 'bg-slate-600',
  Pending: 'bg-yellow-500',
  Active: 'bg-green-600',
};

export default function ClientColumn({ stage, count, children, isOver }) {
  const headerColor = stageHeaderColors[stage] || 'bg-slate-600';

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl transition-all',
        isOver && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {/* Column Header */}
      <div className={`${headerColor} text-white rounded-t-xl p-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{stage}</h3>
          <Badge className="bg-white/20 text-white border-white/30 text-xs px-2">
            {count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 bg-slate-50 rounded-b-xl overflow-y-auto space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  );
}
