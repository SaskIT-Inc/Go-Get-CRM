import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, Zap, CheckCircle } from 'lucide-react';

export default function ServiceDeliveryAnalytics({ serviceFilings }) {
  // Calculate average delivery time by service
  const servicePerformance = serviceFilings
    .filter(sf => sf.status === 'Completed' && sf.filed_date && sf.created_date)
    .reduce((acc, sf) => {
      const service = sf.service_name || 'Unknown Service';
      const days = Math.ceil((new Date(sf.filed_date) - new Date(sf.created_date)) / (1000 * 60 * 60 * 24));
      
      if (!acc[service]) {
        acc[service] = { times: [], count: 0 };
      }
      acc[service].times.push(days);
      acc[service].count++;
      return acc;
    }, {});

  const avgDeliveryByService = Object.entries(servicePerformance)
    .map(([service, data]) => ({
      service: service.length > 30 ? service.substring(0, 30) + '...' : service,
      avgDays: (data.times.reduce((a, b) => a + b, 0) / data.times.length).toFixed(1),
      count: data.count,
      minDays: Math.min(...data.times),
      maxDays: Math.max(...data.times)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status distribution
  const statusData = serviceFilings.reduce((acc, sf) => {
    const status = sf.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = Object.entries(statusData).map(([name, value]) => ({
    name,
    value
  }));

  // Monthly completion trend
  const monthlyCompletions = serviceFilings
    .filter(sf => sf.status === 'Completed' && sf.filed_date)
    .reduce((acc, sf) => {
      const date = new Date(sf.filed_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

  const completionTrend = Object.entries(monthlyCompletions)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      completions: count
    }));

  // On-time vs delayed analysis
  const onTimeAnalysis = serviceFilings
    .filter(sf => sf.status === 'Completed' && sf.due_date && sf.filed_date)
    .reduce((acc, sf) => {
      const onTime = new Date(sf.filed_date) <= new Date(sf.due_date);
      if (onTime) {
        acc.onTime++;
      } else {
        acc.delayed++;
      }
      return acc;
    }, { onTime: 0, delayed: 0 });

  const onTimeRate = onTimeAnalysis.onTime + onTimeAnalysis.delayed > 0
    ? ((onTimeAnalysis.onTime / (onTimeAnalysis.onTime + onTimeAnalysis.delayed)) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">On-Time Delivery</p>
                <p className="text-3xl font-bold text-green-700">{onTimeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Completed</p>
                <p className="text-3xl font-bold text-blue-700">
                  {serviceFilings.filter(sf => sf.status === 'Completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-3xl font-bold text-purple-700">
                  {serviceFilings.filter(sf => sf.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Delivery Time by Service */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Average Delivery Time by Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={avgDeliveryByService} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="service" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDays" fill="#2563eb" name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {avgDeliveryByService.slice(0, 6).map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-navy text-sm">{item.service}</p>
                <p className="text-2xl font-bold text-blue-600">{item.avgDays} days</p>
                <p className="text-xs text-slate-600">
                  Range: {item.minDays}-{item.maxDays} days • {item.count} completed
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Completion Trend */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Monthly Completion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completions" stroke="#059669" strokeWidth={2} name="Completions" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Service Filing Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg text-center">
                <p className="text-sm font-semibold text-navy mb-1">{item.name}</p>
                <p className="text-3xl font-bold text-blue-600">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}