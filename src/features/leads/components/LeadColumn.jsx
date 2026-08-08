import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const stageHeaderColors = {
  'New Lead':       'bg-slate-600',
  'Mail Sent':      'bg-blue-600',
  '1st Follow-Up':  'bg-indigo-600',
  '2nd Follow-Up':  'bg-violet-600',
  'Replied':        'bg-green-600',
  'Contacted':      'bg-orange-600',
  'Email Sent':     'bg-teal-600',
  'Appointment Set': 'bg-purple-600',
  'Estimate Sent':  'bg-yellow-500',
  'Closed Leads':   'bg-emerald-600',
  'Lost Leads':     'bg-red-500',
  'False Leads':    'bg-gray-400',
  // Legacy
  'Needs Assessment': 'bg-amber-500',
  'Negotiation':    'bg-slate-700',
  'Won':            'bg-green-500',
  'Lost':           'bg-red-500'
};

export default function LeadColumn({ stage, count, totalValue, children, isOver }) {
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">{stage}</h3>
          <Badge className="bg-white/20 text-white border-white/30 text-xs px-2">
            {count}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-white/90 font-semibold">
            ${totalValue.toLocaleString()}
          </p>
        )}
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 bg-slate-50 rounded-b-xl overflow-y-auto space-y-2 min-h-[200px] max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  );
}