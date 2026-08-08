import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const urgencyColors = {
  'Immediate': 'bg-red text-white',
  'This Week': 'bg-yellow text-navy',
  'This Month': 'bg-blue-500 text-white',
  'Future Planning': 'bg-gray-500 text-white'
};

const sourceColors = {
  'Website': 'bg-navy/10 text-navy border-navy/20',
  'Referral': 'bg-yellow/10 text-yellow-dark border-yellow/20',
  'Social Media': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  'Google': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'Event': 'bg-green-500/10 text-green-700 border-green-500/20',
  'Existing Client': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  'Other': 'bg-gray-500/10 text-gray-700 border-gray-500/20'
};

export default function LeadCard({ lead, onClick, isDragging }) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg border-l-4',
        lead.urgency === 'Immediate' ? 'border-l-red' : 'border-l-navy',
        isDragging && 'opacity-50 rotate-2'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
              {lead.lead_type === 'Individual' ? (
                <User className="w-4 h-4 text-navy" />
              ) : (
                <Building2 className="w-4 h-4 text-navy" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-navy text-sm truncate">
                {lead.contact_name}
              </h4>
              {lead.company_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {lead.company_name}
                </p>
              )}
            </div>
          </div>
          <Badge className={urgencyColors[lead.urgency]} variant="secondary">
            {lead.urgency === 'Immediate' ? '🔥' : lead.urgency.split(' ')[0]}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>

        {/* Value & Probability */}
        {lead.estimated_value > 0 && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <DollarSign className="w-4 h-4" />
              <span>${lead.estimated_value.toLocaleString()}</span>
            </div>
            {lead.probability && (
              <Badge variant="secondary" className="text-xs bg-navy/5 text-navy">
                {lead.probability}% win
              </Badge>
            )}
          </div>
        )}

        {/* Services */}
        {lead.services_interested?.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Briefcase className="w-3 h-3" />
              <span>Services:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {lead.services_interested.slice(0, 2).map((service, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-yellow/10 text-navy">
                  {service.length > 15 ? service.substring(0, 15) + '...' : service}
                </Badge>
              ))}
              {lead.services_interested.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{lead.services_interested.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Source & Follow-up */}
        <div className="flex items-center justify-between text-xs">
          <Badge variant="secondary" className={`${sourceColors[lead.lead_source]} border`}>
            {lead.lead_source}
          </Badge>
          {lead.next_follow_up && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(lead.next_follow_up).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Captured timestamp */}
        {lead.created_date && (
          <div className="flex justify-end mt-2 pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground/70">
              📅 {new Date(lead.created_date).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        )}

        {/* Overdue indicator */}
        {lead.next_follow_up && new Date(lead.next_follow_up) < new Date() && (
          <div className="flex items-center gap-1 text-xs text-red mt-2">
            <AlertCircle className="w-3 h-3" />
            <span className="font-semibold">Follow-up overdue</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}