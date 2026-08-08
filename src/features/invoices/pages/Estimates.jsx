import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Estimates() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const estimatesSent = leads.filter(l => l.stage === 'Estimate Sent');
  const totalEstimateValue = estimatesSent.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Estimates & Quotes</h1>
          <p className="text-muted-foreground">
            Track sent estimates - use Commercial Hub to create new ones
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('CommercialHub')}>
            <Button variant="outline">Commercial Hub</Button>
          </Link>
          <Link to={createPageUrl('LeadPipeline')}>
            <Button variant="outline">Lead Pipeline</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimates Sent</p>
                <p className="text-3xl font-bold text-navy">{estimatesSent.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-3xl font-bold text-green-600">${totalEstimateValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Estimate</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${estimatesSent.length > 0 ? (totalEstimateValue / estimatesSent.length).toFixed(0) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {estimatesSent.map(lead => (
          <Card key={lead.id} className="border-none shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-navy">{lead.contact_name}</h3>
                  {lead.company_name && (
                    <p className="text-sm text-muted-foreground">{lead.company_name}</p>
                  )}
                </div>
                <Badge className="bg-blue-500/10 text-blue-700">Estimate Sent</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Value:</span> ${lead.estimated_value?.toFixed(2) || '0.00'}</p>
                <p><span className="font-medium">Email:</span> {lead.email}</p>
                {lead.services_interested && lead.services_interested.length > 0 && (
                  <p><span className="font-medium">Services:</span> {lead.services_interested.join(', ')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {estimatesSent.length === 0 && (
          <Card className="col-span-2 border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No Estimates Yet</h3>
              <p className="text-muted-foreground mb-4">
                Use Commercial Hub to create estimates
              </p>
              <Link to={createPageUrl('CommercialHub')}>
                <Button className="bg-navy hover:bg-navy-light">
                  <Plus className="w-4 h-4 mr-2" />
                  Go to Commercial Hub
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}