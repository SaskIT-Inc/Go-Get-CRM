import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, Clock, DollarSign, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function MonthlyTaskReports() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [selectedClient, setSelectedClient] = useState('all');
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  // Filter tasks by selected month and completion status
  const getMonthlyTasks = (clientId = null) => {
    const [year, month] = selectedMonth.split('-');
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    return allTasks.filter(task => {
      if (task.status !== 'Complete') return false;
      if (!task.completed_date) return false;
      
      const completedDate = new Date(task.completed_date);
      if (completedDate < monthStart || completedDate > monthEnd) return false;

      if (clientId && clientId !== 'all') {
        return task.client_id === clientId;
      }
      return true;
    });
  };

  const calculateSummary = (tasks) => {
    const totalTasks = tasks.length;
    const totalHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
    const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const tasksWithClient = tasks.filter(t => t.client_id).length;

    // Group by client
    const byClient = tasks.reduce((acc, task) => {
      const clientId = task.client_id || 'unassigned';
      if (!acc[clientId]) {
        acc[clientId] = { tasks: [], hours: 0 };
      }
      acc[clientId].tasks.push(task);
      acc[clientId].hours += task.actual_hours || 0;
      return acc;
    }, {});

    // Group by assignee
    const byAssignee = tasks.reduce((acc, task) => {
      const assignee = task.assigned_to || 'unassigned';
      if (!acc[assignee]) {
        acc[assignee] = { tasks: [], hours: 0 };
      }
      acc[assignee].tasks.push(task);
      acc[assignee].hours += task.actual_hours || 0;
      return acc;
    }, {});

    return {
      totalTasks,
      totalHours,
      estimatedHours,
      tasksWithClient,
      byClient,
      byAssignee
    };
  };

  const monthlyTasks = getMonthlyTasks(selectedClient);
  const summary = calculateSummary(monthlyTasks);

  const generateCSV = () => {
    setGeneratingReport(true);
    
    try {
      const headers = [
        'Task ID',
        'Task Title',
        'Client',
        'Assigned To',
        'Priority',
        'Completed Date',
        'Estimated Hours',
        'Actual Hours',
        'Description'
      ];

      const rows = monthlyTasks.map(task => {
        const client = clients.find(c => c.id === task.client_id);
        const assignee = users.find(u => u.email === task.assigned_to);
        
        return [
          task.id,
          `"${task.title.replace(/"/g, '""')}"`,
          client?.legal_name || 'N/A',
          assignee?.full_name || task.assigned_to || 'N/A',
          task.priority || 'Medium',
          task.completed_date ? new Date(task.completed_date).toLocaleDateString() : 'N/A',
          task.estimated_hours || 0,
          task.actual_hours || 0,
          `"${(task.description || 'N/A').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `task-report-${selectedMonth}${selectedClient !== 'all' ? `-${clients.find(c => c.id === selectedClient)?.legal_name || 'client'}` : ''}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('CSV report downloaded');
    } catch (error) {
      toast.error('Failed to generate CSV: ' + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const generatePDF = async () => {
    setGeneratingReport(true);
    
    try {
      const response = await api.functions.invoke('generateMonthlyTaskReport', {
        month: selectedMonth,
        clientId: selectedClient !== 'all' ? selectedClient : null,
        tasks: monthlyTasks,
        summary: summary,
        clients: clients,
        users: users
      });

      if (response.data.pdf_url) {
        const link = document.createElement('a');
        link.href = response.data.pdf_url;
        link.download = `task-report-${selectedMonth}.pdf`;
        link.click();
        toast.success('PDF report downloaded');
      }
    } catch (error) {
      toast.error('Failed to generate PDF: ' + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Monthly Task Reports</h1>
          <p className="text-muted-foreground">
            Export task summaries for accounting and client billing
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Reports')}>
            <Button variant="outline" size="sm">Performance Reports</Button>
          </Link>
          <Link to={createPageUrl('ExecutiveAnalytics')}>
            <Button variant="outline" size="sm">Executive View</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={new Date().toISOString().slice(0, 7)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.legal_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={generateCSV}
                disabled={generatingReport || monthlyTasks.length === 0}
                variant="outline"
                className="flex-1 gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                onClick={generatePDF}
                disabled={generatingReport || monthlyTasks.length === 0}
                className="flex-1 gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Tasks</p>
                <p className="text-3xl font-bold text-navy">{summary.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold text-navy">{summary.totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Hours</p>
                <p className="text-3xl font-bold text-navy">{summary.estimatedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client Tasks</p>
                <p className="text-3xl font-bold text-navy">{summary.tasksWithClient}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Client */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Breakdown by Client - {monthName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-center py-3 px-4">Tasks Completed</th>
                  <th className="text-center py-3 px-4">Hours Logged</th>
                  <th className="text-center py-3 px-4">Avg Hours/Task</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byClient).map(([clientId, data]) => {
                  const client = clients.find(c => c.id === clientId);
                  const clientName = client?.legal_name || 'Unassigned';
                  const avgHours = data.hours / data.tasks.length;

                  return (
                    <tr key={clientId} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{clientName}</td>
                      <td className="text-center py-3 px-4">{data.tasks.length}</td>
                      <td className="text-center py-3 px-4">{data.hours.toFixed(1)}</td>
                      <td className="text-center py-3 px-4">{avgHours.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Team Member */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Team Member - {monthName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Team Member</th>
                  <th className="text-center py-3 px-4">Tasks Completed</th>
                  <th className="text-center py-3 px-4">Hours Logged</th>
                  <th className="text-center py-3 px-4">Productivity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byAssignee).map(([email, data]) => {
                  const user = users.find(u => u.email === email);
                  const userName = user?.full_name || email || 'Unassigned';
                  const productivity = ((data.hours / summary.totalHours) * 100).toFixed(0);

                  return (
                    <tr key={email} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{userName}</td>
                      <td className="text-center py-3 px-4">{data.tasks.length}</td>
                      <td className="text-center py-3 px-4">{data.hours.toFixed(1)}</td>
                      <td className="text-center py-3 px-4">{productivity}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}