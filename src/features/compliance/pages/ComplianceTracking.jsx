import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Search, AlertCircle, Clock, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ComplianceTracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: filings = [] } = useQuery({
    queryKey: ['complianceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['complianceTasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['complianceClients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['complianceUsers'],
    queryFn: () => api.entities.User.list()
  });

  // Calculate compliance status
  const getComplianceStatus = (filing) => {
    const filingTasks = tasks.filter((t) => t.service_filing_id === filing.id);
    const allCompleted = filingTasks.every((t) => t.status === 'Complete');
    
    if (!filing.due_date) return 'compliant';

    const today = new Date();
    const dueDate = new Date(filing.due_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (allCompleted) return 'compliant';
    if (dueDate < today) return 'overdue';
    if (dueDate <= thirtyDaysFromNow) return 'upcoming';
    return 'compliant';
  };

  // Filter and search filings
  const filteredFilings = useMemo(() => {
    let result = filings;

    // Search filter
    if (searchTerm) {
      result = result.filter((filing) => {
        const client = clients.find((c) => c.id === filing.client_id);
        const clientName = client?.company_name || client?.contact_name || '';
        return (
          filing.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((filing) => getComplianceStatus(filing) === filterStatus);
    }

    return result;
  }, [filings, searchTerm, filterStatus, clients]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const overdue = filings.filter((f) => getComplianceStatus(f) === 'overdue').length;
    const upcoming = filings.filter((f) => getComplianceStatus(f) === 'upcoming').length;
    const compliant = filings.filter((f) => getComplianceStatus(f) === 'compliant').length;
    return { overdue, upcoming, compliant };
  }, [filings]);

  // Get team members for selected filing
  const getTeamMembers = (filingId) => {
    const filingTasks = tasks.filter((t) => t.service_filing_id === filingId);
    const uniqueAssignees = [...new Set(filingTasks.map((t) => t.assigned_to))];
    
    return uniqueAssignees.map((email) => {
      const user = users.find((u) => u.email === email);
      const assignedTasks = filingTasks.filter((t) => t.assigned_to === email);
      return {
        email,
        name: user?.full_name || email,
        role: user?.role || 'Team Member',
        tasks: assignedTasks,
        completedTasks: assignedTasks.filter((t) => t.status === 'Complete').length,
        totalTasks: assignedTasks.length
      };
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue':
        return 'text-red-600 bg-red-50';
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-50';
      case 'compliant':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'upcoming':
        return <Clock className="w-4 h-4" />;
      case 'compliant':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Filing Compliance</h1>
          <p className="text-muted-foreground">
            Monitor deadlines and filing status by client
          </p>
        </div>
        <Link to={createPageUrl('ComplianceAlerts')}>
          <Button variant="outline">View Alerts</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{kpis.overdue}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Due Soon (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{kpis.upcoming}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{kpis.compliant}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by service or client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-6 text-lg"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-8">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="all">
            All ({filings.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Overdue ({kpis.overdue})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-yellow-600">
            Upcoming ({kpis.upcoming})
          </TabsTrigger>
          <TabsTrigger value="compliant" className="text-green-600">
            Compliant ({kpis.compliant})
          </TabsTrigger>
        </TabsList>

        {['all', 'overdue', 'upcoming', 'compliant'].map((status) => (
          <TabsContent key={status} value={status}>
            {filteredFilings.length === 0 ? (
              <Card className="text-center py-16">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">
                  {status === 'all' ? 'No filings found' : `No ${status} items`}
                </h3>
                <p className="text-slate-500">
                  {status === 'all' ? 'Try adjusting your search' : 'All filings are on track!'}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredFilings.map((filing) => {
                  const status = getComplianceStatus(filing);
                  const client = clients.find((c) => c.id === filing.client_id);
                  const teamMembers = getTeamMembers(filing.id);

                  return (
                    <Card
                      key={filing.id}
                      className="cursor-pointer border-l-4 hover:shadow-lg transition-all"
                      style={{
                        borderLeftColor:
                          status === 'overdue'
                            ? '#dc2626'
                            : status === 'upcoming'
                            ? '#eab308'
                            : '#16a34a'
                      }}
                      onClick={() => setSelectedFiling(selectedFiling?.id === filing.id ? null : filing)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(status)}
                              <h3 className="text-lg font-semibold text-navy">
                                {filing.service_name}
                              </h3>
                              <Badge className={getStatusColor(status)}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {client?.company_name || client?.contact_name}
                            </p>
                          </div>
                          {filing.due_date && (
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Due Date</p>
                              <p className="text-lg font-semibold text-navy">
                                {new Date(filing.due_date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Team Members Tab - Expandable */}
                        {selectedFiling?.id === filing.id && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="w-5 h-5 text-navy" />
                              <h4 className="font-semibold text-navy">Assigned Team Members</h4>
                            </div>
                            {teamMembers.length === 0 ? (
                              <p className="text-sm text-slate-500">No team members assigned</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                {teamMembers.map((member) => (
                                  <Card key={member.email} className="bg-blue-50 border-blue-200">
                                    <CardContent className="pt-4">
                                      <p className="font-semibold text-navy">{member.name}</p>
                                      <p className="text-xs text-slate-600 mb-2">{member.role}</p>
                                      <div className="space-y-2">
                                        {member.tasks.length > 0 && (
                                          <div>
                                            <p className="text-xs text-slate-600 mb-1">Responsibilities:</p>
                                            <ul className="text-xs space-y-1">
                                              {member.tasks.map((task) => (
                                                <li
                                                  key={task.id}
                                                  className="flex items-center gap-1 text-slate-700"
                                                >
                                                  <span
                                                    className={cn(
                                                      'w-2 h-2 rounded-full',
                                                      task.status === 'Complete' ? 'bg-green-500' : 'bg-slate-400'
                                                    )}
                                                  />
                                                  {task.title}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
                                          <span className="text-xs font-semibold text-slate-600">Progress</span>
                                          <span className="text-xs font-bold text-navy">
                                            {member.completedTasks}/{member.totalTasks}
                                          </span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}