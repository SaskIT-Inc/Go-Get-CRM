import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  DollarSign, 
  User, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const frequencyColors = {
  'Annual': 'bg-navy/10 text-navy border-navy/20',
  'Quarterly': 'bg-yellow/10 text-yellow-dark border-yellow/20',
  'Monthly': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'Ad-hoc': 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  'One-time': 'bg-purple-500/10 text-purple-700 border-purple-500/20'
};

const categoryColors = {
  'Personal Tax': 'bg-navy',
  'Corporate Tax': 'bg-navy-light',
  'Bookkeeping': 'bg-yellow',
  'Payroll': 'bg-blue-600',
  'GST/HST': 'bg-green-600',
  'Incorporation': 'bg-purple-600',
  'Compliance': 'bg-orange-600',
  'Consultation': 'bg-red'
};

export default function ServiceCard({ service, onSelect, selected }) {
  return (
    <Card
      onClick={() => onSelect(service)}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg border-2',
        selected ? 'border-yellow shadow-lg' : 'border-transparent hover:border-gray-200'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {service.service_category && (
              <div className={`inline-block px-2 py-1 rounded-md mb-2 ${categoryColors[service.service_category] || 'bg-gray-500'} text-white text-xs font-semibold`}>
                {service.service_category}
              </div>
            )}
            <CardTitle className="text-lg text-navy leading-tight">
              {service.service_name}
            </CardTitle>
          </div>
          {selected && (
            <CheckCircle className="w-6 h-6 text-yellow flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* CRA Form */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-navy" />
          <span className="font-semibold text-navy">CRA Form:</span>
          <span className="text-muted-foreground">{service.cra_form}</span>
        </div>

        {/* Frequency */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-navy" />
          <Badge variant="secondary" className={`${frequencyColors[service.service_frequency]} border`}>
            {service.service_frequency}
          </Badge>
        </div>

        {/* Price & Hours */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-bold text-navy">${service.base_price}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{service.estimated_hours}h</span>
          </div>
        </div>

        {/* Responsible Role */}
        <div className="flex items-start gap-2 text-xs">
          <User className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{service.responsible_role}</span>
        </div>

        {/* CPA Required Badge */}
        {service.requires_cpa && (
          <div className="flex items-center gap-1 text-xs text-red">
            <AlertCircle className="w-3 h-3" />
            <span className="font-semibold">CPA Review Required</span>
          </div>
        )}

        {/* Notes */}
        {service.notes && (
          <p className="text-xs text-muted-foreground italic pt-2 border-t">
            {service.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}