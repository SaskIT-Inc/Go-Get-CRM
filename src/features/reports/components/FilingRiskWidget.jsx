import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, Clock, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FilingRiskWidget() {
  const [expanded, setExpanded] = useState(false);

  const { data: predictions, isLoading, error } = useQuery({
    queryKey: ['filingRiskPredictions'],
    queryFn: async () => {
      const response = await api.functions.invoke('predictFilingDelays', {});
      return response.data;
    },
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    staleTime: 5 * 60 * 1000
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getRiskIcon = (level) => {
    if (level === 'critical' || level === 'high') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-lg border-red-200">
        <CardContent className="pt-6 text-center py-8">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm text-red-600">Failed to load predictions</p>
        </CardContent>
      </Card>
    );
  }

  const highRiskFilings = predictions?.predictions?.filter(p => 
    p.risk_level === 'critical' || p.risk_level === 'high'
  ) || [];

  const displayedFilings = expanded ? predictions?.predictions || [] : highRiskFilings.slice(0, 3);

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy">AI Risk Prediction</h3>
              <p className="text-xs text-muted-foreground font-normal">Machine learning delay analysis</p>
            </div>
          </div>
          <Badge className="bg-red-100 text-red-800 text-lg px-3 py-1">
            {predictions?.high_risk_count || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedFilings.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-green-600 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-green-700 font-semibold">All filings on track!</p>
            <p className="text-xs text-muted-foreground mt-1">No high-risk delays predicted</p>
          </div>
        ) : (
          <>
            {displayedFilings.map((prediction) => (
              <div
                key={prediction.filing_id}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all hover:shadow-md',
                  prediction.risk_level === 'critical' ? 'bg-red-50 border-red-300' :
                  prediction.risk_level === 'high' ? 'bg-orange-50 border-orange-300' :
                  'bg-yellow-50 border-yellow-300'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getRiskIcon(prediction.risk_level)}
                      <h4 className="font-bold text-sm text-navy">{prediction.service_name}</h4>
                      <Badge className={getRiskColor(prediction.risk_level)}>
                        {prediction.risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{prediction.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className="text-2xl font-bold text-red-600">{prediction.risk_score}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Task Progress</p>
                    <Progress value={prediction.task_completion_rate} className="h-2" />
                    <p className="text-xs font-semibold mt-1">{prediction.task_completion_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Documents</p>
                    <Progress value={prediction.document_completeness} className="h-2" />
                    <p className="text-xs font-semibold mt-1">{prediction.document_completeness}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t pt-2">
                  <span className="text-muted-foreground">
                    ⏰ Due in <strong>{prediction.days_until_due}</strong> days
                  </span>
                  {prediction.predicted_delay && (
                    <span className="text-red-600 font-semibold">
                      ⚠️ +{prediction.delay_days} days predicted
                    </span>
                  )}
                </div>

                {prediction.recommendations?.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <p className="text-xs font-semibold text-navy mb-2">AI Recommendations:</p>
                    {prediction.recommendations.map((rec, idx) => (
                      <p key={idx} className="text-xs text-slate-700 pl-2">
                        {rec}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              {predictions?.predictions?.length > 3 && !expanded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="w-full gap-2"
                >
                  View All {predictions.predictions.length} Predictions
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              {expanded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(false)}
                  className="w-full"
                >
                  Show Less
                </Button>
              )}
            </div>
          </>
        )}

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Analyzing {predictions?.total_active_filings || 0} active filings
          </p>
          <Link to={createPageUrl('ComplianceTracking')}>
            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs">
              View Full Compliance Dashboard
              <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}