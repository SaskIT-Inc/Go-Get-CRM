import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExecutiveAnalytics() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list()
  });

  const { data: retainers = [] } = useQuery({
    queryKey: ['retainers'],
    queryFn: () => api.entities.Retainer.list()
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => api.entities.User.list()
  });

  // Role-based access control
  const isAuthorized = user?.role === 'admin' || user?.role === 'director' || user?.role === 'ceo';

  // Calculate MRR - Monthly Recurring Revenue from retainers (must be before any early returns)
  const mrrData = useMemo(() => {
    const activeRetainers = retainers.filter(r => r.status === 'active' || r.status === 'signed');
    const totalMRR = activeRetainers.reduce((sum, r) => sum + (r.total_monthly_fee || 0), 0);
    return totalMRR;
  }, [retainers]);

  // Calculate MOR - Monthly One-Time Revenue from invoices this month
  const morData = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= monthStart && invDate <= now && inv.payment_status !== 'Paid';
    });
    const totalMOR = thisMonthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    return totalMOR;
  }, [invoices]);

  // Lead conversion by source
  const leadConversionBySource = useMemo(() => {
    const sources = [...new Set(leads.map(l => l.lead_source))];
    return sources.map(source => {
      const sourceLeads = leads.filter(l => l.lead_source === source);
      const converted = sourceLeads.filter(l => l.converted_to_client_id).length;
      const rate = sourceLeads.length > 0 ? Math.round((converted / sourceLeads.length) * 100) : 0;
      return {
        source: source || 'Unknown',
        total: sourceLeads.length,
        converted,
        rate
      };
    });
  }, [leads]);

  // Retainer conversion rate
  const retainerConversionRate = useMemo(() => {
    const estimatesWithRetainers = retainers.filter(r => r.estimate_id).length;
    const totalRetainers = retainers.length;
    const rate = totalRetainers > 0 ? Math.round((estimatesWithRetainers / totalRetainers) * 100) : 0;
    return {
      rate,
      active: retainers.filter(r => r.status === 'active' || r.status === 'signed').length,
      total: totalRetainers
    };
  }, [retainers]);

  // Employee task delivery metrics
  const employeeMetrics = useMemo(() => {
    const employees = [...new Set(tasks.map(t => t.assigned_to))].filter(Boolean);
    return employees.map(email => {
      const employeeTasks = tasks.filter(t => t.assigned_to === email);
      const completedTasks = employeeTasks.filter(t => t.status === 'Complete').length;
      const totalTasks = employeeTasks.length;
      const overdueTasks = employeeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Complete').length;

      const userName = users.find(u => u.email === email)?.full_name || email.split('@')[0];

      return {
        name: userName,
        email,
        quantity: totalTasks,
        completed: completedTasks,
        quality: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        timeliness: totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 0
      };
    }).sort((a, b) => b.quantity - a.quantity);
  }, [tasks, users]);

  // Outstanding invoices
  const outstandingInvoices = useMemo(() => {
    const outstanding = invoices.filter(inv => inv.payment_status !== 'Paid');
    const total = outstanding.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    return {
      count: outstanding.length,
      total,
      byStatus: {
        unpaid: outstanding.filter(inv => inv.payment_status === 'Unpaid').length,
        partial: outstanding.filter(inv => inv.payment_status === 'Partial').length,
        overdue: outstanding.filter(inv => {
          const dueDate = new Date(inv.due_date);
          return dueDate < new Date() && inv.payment_status !== 'Paid';
        }).length
      }
    };
  }, [invoices]);

  // Client acquisition speed (month-over-month)
  const clientAcquisition = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthClients = clients.filter(c => {
        const createdDate = new Date(c.created_date);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: monthClients
      });
    }
    return months;
  }, [clients]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  if (!isAuthorized) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">Access Restricted</h3>
              <p className="text-sm text-red-700">Only Directors and CEOs can view this analytics dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[2000px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Executive Analytics</h1>
          <p className="text-muted-foreground">Revenue, conversions, and high-level KPIs</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Analytics')}>
            <Button variant="outline" size="sm">Service Analytics</Button>
          </Link>
          <Link to={createPageUrl('Reports')}>
            <Button variant="outline" size="sm">Monthly Reports</Button>
          </Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold text-navy">${mrrData.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly One-Time Revenue</p>
                <p className="text-3xl font-bold text-navy">${morData.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Outstanding Invoices</p>
                <p className="text-3xl font-bold text-navy">${outstandingInvoices.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{outstandingInvoices.count} invoices</p>
              </div>
              <AlertCircle className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Retainer Conversion Rate</p>
                <p className="text-3xl font-bold text-navy">{retainerConversionRate.rate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{retainerConversionRate.active} active</p>
              </div>
              <CheckCircle className="w-10 h-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Client Acquisition Over Time */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Client Acquisition Speed (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={clientAcquisition}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Conversion by Source */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Lead Conversion Rate by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadConversionBySource.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold text-sm text-navy">{item.source}</p>
                    <p className="text-xs text-muted-foreground">{item.total} leads</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-600">{item.rate}%</p>
                    <p className="text-xs text-muted-foreground">{item.converted} converted</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Metrics */}
      <Card className="border-none shadow-md mb-8">
        <CardHeader>
          <CardTitle>Employee Task Delivery Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quantity Chart */}
            <div>
              <h4 className="font-semibold text-sm text-navy mb-4">Task Quantity</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quality & Timeliness Chart */}
            <div>
              <h4 className="font-semibold text-sm text-navy mb-4">Quality & Timeliness</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quality" fill="#10b981" />
                  <Bar dataKey="timeliness" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Employee</th>
                  <th className="text-center py-3 px-4 font-semibold">Quantity</th>
                  <th className="text-center py-3 px-4 font-semibold">Completed</th>
                  <th className="text-center py-3 px-4 font-semibold">Quality %</th>
                  <th className="text-center py-3 px-4 font-semibold">Timeliness %</th>
                </tr>
              </thead>
              <tbody>
                {employeeMetrics.map((emp, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-navy">{emp.name}</p>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge variant="outline">{emp.quantity}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="font-semibold text-green-600">{emp.completed}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${emp.quality}%` }}
                          />
                        </div>
                        <span className="ml-2 font-semibold text-sm">{emp.quality}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500" 
                            style={{ width: `${emp.timeliness}%` }}
                          />
                        </div>
                        <span className="ml-2 font-semibold text-sm">{emp.timeliness}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Invoices Breakdown */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Outstanding Invoices Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <p className="text-sm text-muted-foreground mb-2">Unpaid</p>
              <p className="text-2xl font-bold text-red-600">{outstandingInvoices.byStatus.unpaid}</p>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <p className="text-sm text-muted-foreground mb-2">Partial Payment</p>
              <p className="text-2xl font-bold text-yellow-600">{outstandingInvoices.byStatus.partial}</p>
            </div>
            <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
              <p className="text-sm text-muted-foreground mb-2">Overdue</p>
              <p className="text-2xl font-bold text-orange-600">{outstandingInvoices.byStatus.overdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}