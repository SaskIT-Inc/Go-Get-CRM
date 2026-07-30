import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4', '#ec4899'];

export default function RevenueAnalytics({ invoices }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Monthly revenue for selected year
  const monthlyRevenue = invoices
    .filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate.getFullYear() === selectedYear;
    })
    .reduce((acc, inv) => {
      const month = new Date(inv.invoice_date).getMonth();
      if (!acc[month]) {
        acc[month] = { paid: 0, pending: 0, overdue: 0 };
      }
      
      if (inv.payment_status === 'Paid') {
        acc[month].paid += inv.total_amount || 0;
      } else if (inv.payment_status === 'Overdue') {
        acc[month].overdue += inv.total_amount || 0;
      } else {
        acc[month].pending += inv.total_amount || 0;
      }
      return acc;
    }, {});

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
    paid: monthlyRevenue[i]?.paid || 0,
    pending: monthlyRevenue[i]?.pending || 0,
    overdue: monthlyRevenue[i]?.overdue || 0,
    total: (monthlyRevenue[i]?.paid || 0) + (monthlyRevenue[i]?.pending || 0) + (monthlyRevenue[i]?.overdue || 0)
  }));

  // Payment status distribution
  const paymentStatusData = invoices.reduce((acc, inv) => {
    const status = inv.payment_status || 'Unknown';
    acc[status] = (acc[status] || 0) + (inv.total_amount || 0);
    return acc;
  }, {});

  const statusPieData = Object.entries(paymentStatusData).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  // Revenue by payment method
  const paymentMethodData = invoices
    .filter(inv => inv.payment_status === 'Paid' && inv.payment_method)
    .reduce((acc, inv) => {
      const method = inv.payment_method;
      acc[method] = (acc[method] || 0) + (inv.total_amount || 0);
      return acc;
    }, {});

  const methodBarData = Object.entries(paymentMethodData)
    .map(([method, amount]) => ({
      method,
      amount: Math.round(amount)
    }))
    .sort((a, b) => b.amount - a.amount);

  // Key metrics
  const totalRevenue = invoices
    .filter(inv => inv.payment_status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const outstandingRevenue = invoices
    .filter(inv => inv.payment_status !== 'Paid')
    .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0);

  const overdueAmount = invoices
    .filter(inv => inv.payment_status === 'Overdue')
    .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthRevenue = invoices
    .filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return inv.payment_status === 'Paid' && 
             invDate.getMonth() === currentMonth && 
             invDate.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const avgInvoiceValue = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / invoices.length
    : 0;

  // Available years
  const years = [...new Set(invoices.map(inv => new Date(inv.invoice_date).getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">This Month</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${thisMonthRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Outstanding</p>
                <p className="text-2xl font-bold text-orange-700">
                  ${outstandingRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-red-700">
                  ${overdueAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Monthly Revenue Trend
            </CardTitle>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="paid" fill="#059669" name="Paid" stackId="a" />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" stackId="a" />
              <Bar dataKey="overdue" fill="#dc2626" name="Overdue" stackId="a" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 bg-slate-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-slate-600 mb-2">Year Summary ({selectedYear})</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  ${monthlyData.reduce((sum, m) => sum + m.paid, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Monthly</p>
                <p className="text-xl font-bold text-blue-600">
                  ${(monthlyData.reduce((sum, m) => sum + m.paid, 0) / 12).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Best Month</p>
                <p className="text-xl font-bold text-purple-600">
                  ${Math.max(...monthlyData.map(m => m.paid)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status & Method Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Revenue by Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={methodBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#2563eb" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Revenue Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Average Invoice Value</p>
              <p className="text-3xl font-bold text-blue-700">
                ${avgInvoiceValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Total Invoices</p>
              <p className="text-3xl font-bold text-purple-700">{invoices.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Collection Rate</p>
              <p className="text-3xl font-bold text-green-700">
                {invoices.length > 0 
                  ? ((invoices.filter(i => i.payment_status === 'Paid').length / invoices.length) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}