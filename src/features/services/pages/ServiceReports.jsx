import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#1e3a8a', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function ServiceReports() {
  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  // Status distribution
  const statusData = [
    { name: 'Not Started', value: serviceFilings.filter(f => f.status === 'Not Started').length },
    { name: 'Documents Pending', value: serviceFilings.filter(f => f.status === 'Documents Pending').length },
    { name: 'In Progress', value: serviceFilings.filter(f => f.status === 'In Progress').length },
    { name: 'Review', value: serviceFilings.filter(f => f.status === 'Review').length },
    { name: 'Filed', value: serviceFilings.filter(f => f.status === 'Filed').length },
    { name: 'Completed', value: serviceFilings.filter(f => f.status === 'Completed').length }
  ].filter(item => item.value > 0);

  // Service performance
  const servicePerformance = serviceFilings.reduce((acc, filing) => {
    if (!acc[filing.service_name]) {
      acc[filing.service_name] = { total: 0, completed: 0, filed: 0 };
    }
    acc[filing.service_name].total++;
    if (filing.status === 'Completed') acc[filing.service_name].completed++;
    if (filing.status === 'Filed') acc[filing.service_name].filed++;
    return acc;
  }, {});

  const performanceData = Object.entries(servicePerformance)
    .map(([service, stats]) => ({
      service,
      total: stats.total,
      completed: stats.completed,
      filed: stats.filed
    }))
    .sort((a, b) => b.total - a.total);

  // Upcoming deadlines
  const upcomingDeadlines = serviceFilings
    .filter(f => f.due_date && f.status !== 'Filed' && f.status !== 'Completed')
    .map(f => ({
      ...f,
      client: clients.find(c => c.id === f.client_id)
    }))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 10);

  const overdueTasks = upcomingDeadlines.filter(f => new Date(f.due_date) < new Date());

  // Filing year distribution
  const yearData = serviceFilings.reduce((acc, filing) => {
    const year = filing.filing_year || 'Unknown';
    if (!acc[year]) acc[year] = 0;
    acc[year]++;
    return acc;
  }, {});
  const yearChart = Object.entries(yearData)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));

  const totalFilings = serviceFilings.length;
  const completedFilings = serviceFilings.filter(f => f.status === 'Completed' || f.status === 'Filed').length;
  const activeFilings = serviceFilings.filter(f => !['Completed', 'Filed'].includes(f.status)).length;
  const completionRate = totalFilings > 0 ? ((completedFilings / totalFilings) * 100).toFixed(1) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Service Reports</h1>
          <p className="text-muted-foreground">Service performance and filing analytics</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Filings</p>
              <FileText className="w-5 h-5 text-navy" />
            </div>
            <p className="text-3xl font-bold text-navy">{totalFilings}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Completed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{completedFilings}</p>
            <p className="text-xs text-muted-foreground mt-1">{completionRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active</p>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{activeFilings}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <AlertCircle className="w-5 h-5 text-red" />
            </div>
            <p className="text-3xl font-bold text-red">{overdueTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Filing Status</TabsTrigger>
          <TabsTrigger value="performance">Service Performance</TabsTrigger>
          <TabsTrigger value="deadlines">Upcoming Deadlines</TabsTrigger>
          <TabsTrigger value="years">Filing Years</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Filing Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Service Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="service" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#1e3a8a" name="Total" />
                  <Bar dataKey="filed" fill="#10b981" name="Filed" />
                  <Bar dataKey="completed" fill="#8b5cf6" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map((filing) => {
                  const isOverdue = new Date(filing.due_date) < new Date();
                  return (
                    <div
                      key={filing.id}
                      className={`p-4 rounded-lg border ${isOverdue ? 'bg-red/5 border-red/20' : 'bg-muted'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-navy">{filing.service_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {filing.client?.legal_name} - {filing.filing_year}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${isOverdue ? 'text-red' : 'text-muted-foreground'}`}>
                            {new Date(filing.due_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          {isOverdue && (
                            <Badge variant="secondary" className="bg-red/10 text-red border-red/20 mt-1">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {upcomingDeadlines.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No upcoming deadlines</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="years">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Filings by Year</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={yearChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}