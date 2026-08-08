import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AlertCircle, TrendingUp, Users, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { can } from '@/lib/permissions';

const COLORS = ['#1e3a8a', '#7c3aed', '#dc2626', '#ea580c', '#16a34a', '#0891b2'];

export default function Analytics() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['analyticsTasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['analyticsServices'],
    queryFn: () => api.entities.ServiceMaster.list()
  });

  const { data: filings = [] } = useQuery({
    queryKey: ['analyticsFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['analyticsStatuses'],
    queryFn: () => api.entities.StatusStageMaster.list()
  });

  // Check access
  const hasAccess = can(user, 'analytics', 'view');

  // Calculate metrics (must be before any early returns)
  const metrics = useMemo(() => {
    // Average turnaround time per service family
    const serviceMetrics = services.map((service) => {
      const relatedFilings = filings.filter((f) => f.service_name === service.service_name);
      const completedFilings = relatedFilings.filter((f) => f.status === 'Completed');

      const turnaroundTimes = completedFilings
        .filter((f) => f.filed_date && f.created_date)
        .map((f) => differenceInDays(new Date(f.filed_date), new Date(f.created_date)))
        .filter((days) => days > 0);

      const avgTurnaround = turnaroundTimes.length > 0
        ? Math.round(turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length)
        : 0;

      return {
        name: service.service_family || service.service_name,
        avgTurnaround,
        totalFiled: completedFilings.length,
        complexity: service.complexity || 'Medium'
      };
    });

    // Bottleneck analysis - stages with most stalled tasks
    const bottlenecks = statuses.map((status) => {
      const stagedTasks = tasks.filter((t) => t.status === status.status_name);
      const stalledTasks = stagedTasks.filter((t) => {
        if (!t.updated_date) return false;
        const daysSinceUpdate = differenceInDays(new Date(), new Date(t.updated_date));
        return daysSinceUpdate > 3;
      });

      return {
        stage: status.status_name,
        totalTasks: stagedTasks.length,
        stalledTasks: stalledTasks.length,
        stalledPercentage: stagedTasks.length > 0
          ? Math.round((stalledTasks.length / stagedTasks.length) * 100)
          : 0,
        sortOrder: status.sort_order || 0
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    // Staff productivity metrics
    const staffMetrics = {};
    tasks.forEach((task) => {
      if (!task.assigned_to) return;

      if (!staffMetrics[task.assigned_to]) {
        staffMetrics[task.assigned_to] = {
          email: task.assigned_to,
          tasksCompleted: 0,
          tasksInProgress: 0,
          avgTaskHours: 0,
          hoursLogged: 0,
          taskCount: 0
        };
      }

      if (task.status === 'Complete') {
        staffMetrics[task.assigned_to].tasksCompleted++;
      } else if (task.status === 'In Progress') {
        staffMetrics[task.assigned_to].tasksInProgress++;
      }

      if (task.actual_hours) {
        staffMetrics[task.assigned_to].hoursLogged += task.actual_hours;
        staffMetrics[task.assigned_to].taskCount++;
      }
    });

    const staffData = Object.values(staffMetrics)
      .map((staff) => ({
        ...staff,
        avgTaskHours: staff.taskCount > 0 ? (staff.hoursLogged / staff.taskCount).toFixed(1) : 0,
        name: staff.email.split('@')[0]
      }))
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 8);

    return {
      serviceMetrics,
      bottlenecks,
      staffData,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'Complete').length,
      overdueTasks: tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Complete').length
    };
  }, [services, filings, tasks, statuses]);

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Access Restricted</h3>
                <p className="text-red-700">
                  Analytics are available to Directors only. Current role: <span className="font-semibold">{user.role}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Service Performance Analytics</h1>
          <p className="text-muted-foreground">
            Service delivery metrics, bottlenecks, and team productivity
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Reports')}>
            <Button variant="outline" size="sm">Monthly Reports</Button>
          </Link>
          <Link to={createPageUrl('ExecutiveAnalytics')}>
            <Button variant="outline" size="sm">Executive View</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Completion Rate</p>
                <p className="text-4xl font-bold text-blue-900">
                  {metrics.totalTasks > 0 
                    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {metrics.completedTasks} of {metrics.totalTasks} tasks
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-200">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-2">Overdue Tasks</p>
                <p className="text-4xl font-bold text-orange-900">{metrics.overdueTasks}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {metrics.totalTasks > 0 
                    ? Math.round((metrics.overdueTasks / metrics.totalTasks) * 100)
                    : 0}% of total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-200">
                <AlertCircle className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-2">Avg Turnaround</p>
                <p className="text-4xl font-bold text-green-900">
                  {metrics.serviceMetrics.length > 0
                    ? Math.round(
                        metrics.serviceMetrics.reduce((a, b) => a + b.avgTurnaround, 0) /
                          metrics.serviceMetrics.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-green-600 mt-1">days per service</p>
              </div>
              <div className="p-3 rounded-lg bg-green-200">
                <Clock className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Turnaround Time by Service */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Average Turnaround by Service Family
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.serviceMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${value} days`} />
                <Bar dataKey="avgTurnaround" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottleneck Analysis */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Bottleneck Analysis by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.bottlenecks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="stalledPercentage" fill="#dc2626" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Staff Productivity */}
      <Card className="border-none shadow-md mb-8">
        <CardHeader>
          <CardTitle className="text-navy flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Productivity Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-navy">Team Member</th>
                  <th className="text-center py-3 px-4 font-semibold text-navy">Completed</th>
                  <th className="text-center py-3 px-4 font-semibold text-navy">In Progress</th>
                  <th className="text-center py-3 px-4 font-semibold text-navy">Avg Hours/Task</th>
                  <th className="text-center py-3 px-4 font-semibold text-navy">Total Hours</th>
                  <th className="text-center py-3 px-4 font-semibold text-navy">Productivity</th>
                </tr>
              </thead>
              <tbody>
                {metrics.staffData.map((staff, idx) => {
                  const productivity = Math.round(
                    (staff.tasksCompleted / (staff.tasksCompleted + staff.tasksInProgress)) * 100
                  ) || 0;
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4 font-medium text-navy">{staff.name}</td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-green-100 text-green-800">{staff.tasksCompleted}</Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-800">{staff.tasksInProgress}</Badge>
                      </td>
                      <td className="text-center py-3 px-4 text-navy font-medium">{staff.avgTaskHours}h</td>
                      <td className="text-center py-3 px-4 text-navy font-medium">{Math.round(staff.hoursLogged)}h</td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-green-600"
                              style={{ width: `${productivity}%` }}
                            />
                          </div>
                          <span className="font-semibold text-navy text-xs">{productivity}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-navy">Service Family Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.serviceMetrics.map((service, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-all">
                <h4 className="font-bold text-navy mb-3">{service.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Turnaround:</span>
                    <span className="font-semibold text-navy">{service.avgTurnaround} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Completed Filings:</span>
                    <span className="font-semibold text-green-600">{service.totalFiled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Complexity:</span>
                    <Badge className={
                      service.complexity === 'High' ? 'bg-red-100 text-red-800' :
                      service.complexity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {service.complexity}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}