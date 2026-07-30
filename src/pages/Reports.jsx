import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileText, Download, Calendar, TrendingUp, Clock, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list()
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['filingPipelines'],
    queryFn: () => api.entities.FilingPipeline.list()
  });

  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      const response = await api.functions.invoke('generateMonthlyReport', {
        year: parseInt(selectedYear),
        month: parseInt(selectedMonth)
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        toast.success('Monthly report generated successfully!');
      }
    },
    onError: (error) => {
      toast.error('Failed to generate report: ' + error.message);
    }
  });

  const monthlyMetrics = useMemo(() => {
    const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
    const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0, 23, 59, 59);

    // Filter data for selected month
    const monthFilings = serviceFilings.filter(f => {
      const filedDate = f.filed_date ? new Date(f.filed_date) : null;
      return filedDate && filedDate >= startDate && filedDate <= endDate;
    });

    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= startDate && invDate <= endDate;
    });

    const monthPipelines = pipelines.filter(p => {
      const completedDate = p.final_confirmation_date ? new Date(p.final_confirmation_date) : null;
      return completedDate && completedDate >= startDate && completedDate <= endDate;
    });

    // Filing counts
    const totalFilings = monthFilings.length;
    const completedFilings = monthFilings.filter(f => f.status === 'Completed' || f.status === 'Filed').length;
    
    // Average turnaround time
    let totalTurnaroundDays = 0;
    let turnaroundCount = 0;
    
    monthPipelines.forEach(p => {
      if (p.created_date && p.final_confirmation_date) {
        const start = new Date(p.created_date);
        const end = new Date(p.final_confirmation_date);
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
        totalTurnaroundDays += days;
        turnaroundCount++;
      }
    });
    
    const avgTurnaroundTime = turnaroundCount > 0 ? Math.round(totalTurnaroundDays / turnaroundCount) : 0;

    // Revenue by service type
    const revenueByService = {};
    monthInvoices.forEach(inv => {
      const filing = serviceFilings.find(f => f.id === inv.service_filing_id);
      const serviceName = filing?.service_name || 'Other Services';
      revenueByService[serviceName] = (revenueByService[serviceName] || 0) + (inv.total_amount || 0);
    });

    const revenueData = Object.entries(revenueByService).map(([name, amount]) => ({
      name,
      amount: parseFloat(amount.toFixed(2))
    }));

    const totalRevenue = revenueData.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = monthInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

    // Filings by service type
    const filingsByType = {};
    monthFilings.forEach(f => {
      const type = f.service_name || 'Other';
      filingsByType[type] = (filingsByType[type] || 0) + 1;
    });

    const filingTypeData = Object.entries(filingsByType).map(([name, count]) => ({
      name,
      count
    }));

    return {
      totalFilings,
      completedFilings,
      avgTurnaroundTime,
      totalRevenue,
      totalPaid,
      revenueData,
      filingTypeData
    };
  }, [selectedYear, selectedMonth, serviceFilings, invoices, pipelines]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());

  if (!isManager) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">Reports are only accessible to managers and administrators.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Monthly Performance Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive PDF summaries of firm performance</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Analytics')}>
            <Button variant="outline" size="sm">Service Analytics</Button>
          </Link>
          <Link to={createPageUrl('ExecutiveAnalytics')}>
            <Button variant="outline" size="sm">Executive View</Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-none shadow-lg mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => generatePDFMutation.mutate()}
              disabled={generatePDFMutation.isPending}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {generatePDFMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download PDF Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Filings</p>
                <p className="text-3xl font-bold text-navy">{monthlyMetrics.totalFilings}</p>
                <p className="text-xs text-green-600 mt-1">
                  {monthlyMetrics.completedFilings} completed
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Turnaround</p>
                <p className="text-3xl font-bold text-purple-600">{monthlyMetrics.avgTurnaroundTime}</p>
                <p className="text-xs text-muted-foreground mt-1">days</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  ${monthlyMetrics.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${monthlyMetrics.totalPaid.toLocaleString()} collected
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Collection Rate</p>
                <p className="text-3xl font-bold text-orange-600">
                  {monthlyMetrics.totalRevenue > 0 
                    ? ((monthlyMetrics.totalPaid / monthlyMetrics.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">of invoiced</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyMetrics.revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={monthlyMetrics.revenueData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, amount }) => `${name}: $${amount.toLocaleString()}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {monthlyMetrics.revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No revenue data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Filings by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyMetrics.filingTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyMetrics.filingTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No filing data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card className="border-none shadow-lg mt-6">
        <CardHeader>
          <CardTitle>Service Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Service Type</th>
                  <th className="text-right py-3 px-4">Revenue</th>
                  <th className="text-right py-3 px-4">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyMetrics.revenueData.map((item) => (
                  <tr key={item.name} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      ${item.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {((item.amount / monthlyMetrics.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {monthlyMetrics.revenueData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No revenue data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}