import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#1e3a8a', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list('-created_date')
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  // Filter by date range
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    return invDate >= new Date(dateRange.start) && invDate <= new Date(dateRange.end);
  });

  // Revenue metrics
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const paidRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const outstandingRevenue = totalRevenue - paidRevenue;
  const overdueInvoices = filteredInvoices.filter(inv => 
    inv.payment_status === 'Overdue'
  );
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  // Monthly revenue trend
  const monthlyData = filteredInvoices.reduce((acc, inv) => {
    const month = new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { month, billed: 0, collected: 0 };
    }
    acc[month].billed += inv.total_amount || 0;
    acc[month].collected += inv.amount_paid || 0;
    return acc;
  }, {});
  const revenueByMonth = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month) - new Date(b.month)
  );

  // Payment status distribution
  const paymentStatusData = [
    { name: 'Paid', value: filteredInvoices.filter(i => i.payment_status === 'Paid').length },
    { name: 'Pending', value: filteredInvoices.filter(i => i.payment_status === 'Pending').length },
    { name: 'Partial', value: filteredInvoices.filter(i => i.payment_status === 'Partial').length },
    { name: 'Overdue', value: filteredInvoices.filter(i => i.payment_status === 'Overdue').length }
  ].filter(item => item.value > 0);

  // Top clients by revenue
  const clientRevenue = filteredInvoices.reduce((acc, inv) => {
    const client = clients.find(c => c.id === inv.client_id);
    const clientName = client?.legal_name || 'Unknown';
    if (!acc[clientName]) {
      acc[clientName] = 0;
    }
    acc[clientName] += inv.total_amount || 0;
    return acc;
  }, {});
  const topClients = Object.entries(clientRevenue)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Financial Reports</h1>
          <p className="text-muted-foreground">Revenue, invoices, and payment analytics</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <Button className="bg-yellow text-navy hover:bg-yellow-dark">
              <Calendar className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-navy">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {filteredInvoices.length} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Collected</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">${paidRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRevenue > 0 ? ((paidRevenue / totalRevenue) * 100).toFixed(1) : 0}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <DollarSign className="w-5 h-5 text-yellow-dark" />
            </div>
            <p className="text-3xl font-bold text-yellow-dark">${outstandingRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredInvoices.filter(i => i.payment_status !== 'Paid').length} pending invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <TrendingDown className="w-5 h-5 text-red" />
            </div>
            <p className="text-3xl font-bold text-red">${overdueAmount.toFixed(2)}</p>
            <p className="text-xs text-red mt-1">
              {overdueInvoices.length} overdue invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="status">Payment Status</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="billed" stroke="#1e3a8a" name="Billed" strokeWidth={2} />
                  <Line type="monotone" dataKey="collected" stroke="#10b981" name="Collected" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Payment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Clients by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#1e3a8a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}