import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, Building2, Mail, FileText, UserCheck, Package, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

function recurringStatusLabel(sequence) {
  if (!sequence) return 'No recurring follow-up';
  if (sequence.status === 'active') {
    return `Every ${sequence.interval_days}d · next ${new Date(sequence.next_send_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`;
  }
  if (sequence.stopped_reason === 'client_replied') return 'Stopped — replied';
  if (sequence.stopped_reason === 'max_sends_reached') return 'Stopped — limit reached';
  return 'Stopped';
}

export default function ClientCard({ client, completionPct, assignedStaffName, filingCount, isDragging, onClick, recurringSequence, onOpenRecurringEmail }) {
  const packageLabel = client.active_package || client.monthly_package;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-navy',
        isDragging && 'opacity-50 rotate-2'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
            {client.client_type === 'Business' ? (
              <Building2 className="w-4 h-4 text-navy" />
            ) : (
              <User className="w-4 h-4 text-navy" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-navy text-sm truncate">{client.legal_name}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{client.primary_email}</span>
            </div>
          </div>
        </div>

        {/* Document checklist completion */}
        {completionPct !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-muted-foreground">Document checklist</span>
              <span className="font-semibold text-navy">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-1.5" />
          </div>
        )}

        {/* Filings & Package */}
        <div className="space-y-1 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span>{filingCount} service filing{filingCount === 1 ? '' : 's'}</span>
          </div>
          {packageLabel && (
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{packageLabel}{!client.active_package && ' (picked at intake)'}</span>
            </div>
          )}
        </div>

        {/* Recurring follow-up */}
        {onOpenRecurringEmail && (
          <div className="flex items-center justify-between gap-2 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Repeat className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{recurringStatusLabel(recurringSequence)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRecurringEmail(client);
              }}
            >
              <Mail className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Assigned staff */}
        <div className="flex items-center justify-between text-xs">
          {assignedStaffName ? (
            <Badge variant="secondary" className="bg-navy/5 text-navy gap-1">
              <UserCheck className="w-3 h-3" />
              {assignedStaffName}
            </Badge>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          {client.created_date && (
            <span className="text-[10px] text-muted-foreground/70">
              {new Date(client.created_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
