import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, Zap, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function ComplianceAlerts() {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [expandedAlert, setExpandedAlert] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['complianceAlerts'],
    queryFn: () => api.entities.ComplianceAlert.list(),
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId) => api.entities.ComplianceAlert.update(alertId, {
      status: 'acknowledged',
      acknowledged_by: user?.email,
      acknowledged_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceAlerts'] });
      toast.success('Alert acknowledged');
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId) => api.entities.ComplianceAlert.update(alertId, {
      status: 'resolved'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceAlerts'] });
      toast.success('Alert resolved');
    }
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <Zap className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
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

  const getTypeLabel = (type) => {
    const labels = {
      'missing_info': 'Missing Information',
      'approaching_deadline': 'Approaching Deadline',
      'unprepared_filing': 'Unprepared Filing',
      'compliance_risk': 'Compliance Risk'
    };
    return labels[type] || type;
  };

  const filteredAlerts = alerts.filter(a => a.status === filterStatus);
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            Compliance Alerts
          </h1>
          <p className="text-muted-foreground mt-2">Active compliance issues and reminders</p>
        </div>
        <Link to={createPageUrl('ComplianceTracking')}>
          <Button variant="outline">Filing Compliance</Button>
        </Link>
      </div>

      {/* Alert Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{acknowledgedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{alerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 font-semibold ${
            filterStatus === 'active'
              ? 'text-red-600 border-b-2 border-b-red-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('acknowledged')}
          className={`px-4 py-2 font-semibold ${
            filterStatus === 'acknowledged'
              ? 'text-yellow-600 border-b-2 border-b-yellow-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Acknowledged ({acknowledgedCount})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-4 py-2 font-semibold ${
            filterStatus === 'resolved'
              ? 'text-green-600 border-b-2 border-b-green-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Resolved ({alerts.filter(a => a.status === 'resolved').length})
        </button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">No {filterStatus} alerts</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === 'critical'
                  ? 'border-l-red-600'
                  : alert.severity === 'high'
                  ? 'border-l-orange-600'
                  : 'border-l-yellow-600'
              }`}
            >
              <CardContent className="pt-6">
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{alert.title}</h3>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{getTypeLabel(alert.alert_type)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        {alert.days_until_due && (
                          <p className="text-sm text-red-600 font-semibold mt-1">
                            ⏰ Due in {alert.days_until_due} day(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedAlert === alert.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {expandedAlert === alert.id && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    {alert.missing_fields && alert.missing_fields.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm mb-2">Missing Fields:</p>
                        <div className="flex flex-wrap gap-2">
                          {alert.missing_fields.map((field) => (
                            <Badge key={field} variant="secondary">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {alert.required_actions && (
                      <div>
                        <p className="font-semibold text-sm mb-2">Required Actions:</p>
                        <ul className="space-y-1">
                          {alert.required_actions.map((action, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      {alert.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                          >
                            Mark Resolved
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Button
                          size="sm"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isPending}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}