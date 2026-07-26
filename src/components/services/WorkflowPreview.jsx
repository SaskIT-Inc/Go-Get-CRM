import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Workflow, 
  Clock, 
  User, 
  FileText, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkflowPreview({ workflowTemplateName }) {
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows', workflowTemplateName],
    queryFn: () => api.entities.WorkflowTemplate.filter({ template_name: workflowTemplateName }),
    enabled: !!workflowTemplateName
  });

  const workflow = workflows[0];

  if (!workflowTemplateName) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="py-12 text-center">
          <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a service to view workflow details</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card className="border-red/30">
        <CardContent className="py-8 text-center">
          <p className="text-red">Workflow template not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-navy/20 shadow-md">
      <CardHeader className="bg-navy/5 border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-navy flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              {workflow.template_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
          </div>
          <Badge variant="secondary" className="bg-yellow/10 text-navy border-yellow/20">
            {workflow.service_category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-navy" />
            <div>
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="font-semibold text-navy">{workflow.total_estimated_hours || 0}h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Steps</p>
              <p className="font-semibold text-navy">{workflow.steps?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div>
          <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Workflow Steps
          </h4>
          <div className="space-y-3">
            {workflow.steps?.sort((a, b) => a.step_number - b.step_number).map((step, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-3 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold">
                  {step.step_number}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-navy text-sm">{step.step_name}</h5>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{step.responsible_role}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{step.estimated_hours}h</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Required Documents */}
        {workflow.required_documents?.length > 0 && (
          <div>
            <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Required Documents
            </h4>
            <div className="flex flex-wrap gap-2">
              {workflow.required_documents.map((doc, idx) => (
                <Badge key={idx} variant="secondary" className="bg-gray-100 text-navy">
                  {doc}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}