import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, FunnelChart, Funnel, LabelList,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, DollarSign, Target, ArrowRight } from 'lucide-react';

const STAGE_ORDER = [
  'New Lead', 'Mail Sent', '1st Follow-Up', '2nd Follow-Up',
  'Replied', 'Contacted', 'Estimate Sent', 'Closed Leads', 'Lost Leads', 'False Leads'
];

const STAGE_COLORS = {
  'New Lead':       '#1e3a8a',
  'Mail Sent':      '#2563eb',
  '1st Follow-Up':  '#7c3aed',
  '2nd Follow-Up':  '#9333ea',
  'Replied':        '#0891b2',
  'Contacted':      '#0d9488',
  'Estimate Sent':  '#ca8a04',
  'Closed Leads':   '#16a34a',
  'Lost Leads':     '#dc2626',
  'False Leads':    '#9ca3af',
};

const WIN_STAGES = ['Closed Leads'];
const LOSS_STAGES = ['Lost Leads', 'False Leads'];
const ACTIVE_STAGES = ['New Lead', 'Mail Sent', '1st Follow-Up', '2nd Follow-Up', 'Replied', 'Contacted', 'Estimate Sent'];

const PIE_COLORS = ['#16a34a', '#dc2626', '#2563eb', '#9ca3af'];

function fmt(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${Math.round(val)}`;
}

export default function SalesAnalytics() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['salesAnalyticsLeads'],
    queryFn: () => api.entities.Lead.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['salesAnalyticsClients'],
    queryFn: () => api.entities.Client.list()
  });

  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => WIN_STAGES.includes(l.stage)).length;
    const lost = leads.filter(l => LOSS_STAGES.includes(l.stage)).length;
    const active = leads.filter(l => ACTIVE_STAGES.includes(l.stage)).length;
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

    // Leads by stage
    const byStage = STAGE_ORDER.map(stage => ({
      stage,
      shortStage: stage.replace(' Leads', '').replace(' Follow-Up', ' F/U'),
      count: leads.filter(l => l.stage === stage).length,
      value: leads.filter(l => l.stage === stage).reduce((sum, l) => sum + (l.estimated_value || 0), 0),
      color: STAGE_COLORS[stage]
    })).filter(s => s.count > 0);

    // Revenue forecast
    const totalPipeline = leads
      .filter(l => ACTIVE_STAGES.includes(l.stage))
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    const weightedForecast = leads
      .filter(l => ACTIVE_STAGES.includes(l.stage))
      .reduce((sum, l) => sum + ((l.estimated_value || 0) * (l.probability || 50) / 100), 0);

    const closedRevenue = leads
      .filter(l => WIN_STAGES.includes(l.stage))
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    // Breakdown by pipeline type
    const hotLeads = leads.filter(l => l.pipeline_type === 'Hot Lead');
    const coldLeads = leads.filter(l => l.pipeline_type === 'Cold Lead');

    // Source breakdown
    const sourceMap = {};
    leads.forEach(l => {
      const src = l.lead_source || 'Unknown';
      if (!sourceMap[src]) sourceMap[src] = { source: src, count: 0, value: 0 };
      sourceMap[src].count++;
      sourceMap[src].value += l.estimated_value || 0;
    });
    const bySource = Object.values(sourceMap).sort((a, b) => b.count - a.count);

    // Win/Loss/Active/False breakdown for pie
    const outcomeData = [
      { name: 'Closed / Won', value: won, color: '#16a34a' },
      { name: 'Lost', value: lost, color: '#dc2626' },
      { name: 'Active', value: active, color: '#2563eb' },
    ].filter(d => d.value > 0);

    // Monthly trend (leads created per month, last 6 months)
    const monthlyMap = {};
    leads.forEach(l => {
      if (!l.created_date) return;
      const d = new Date(l.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, new_leads: 0, won: 0, value: 0 };
      monthlyMap[key].new_leads++;
      if (WIN_STAGES.includes(l.stage)) monthlyMap[key].won++;
      monthlyMap[key].value += l.estimated_value || 0;
    });
    const monthlyTrend = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(m => ({ ...m, month: m.month.slice(5) + '/' + m.month.slice(2, 4) }));

    return {
      total, won, lost, active, conversionRate,
      totalPipeline, weightedForecast, closedRevenue,
      byStage, outcomeData, bySource, monthlyTrend,
      hotLeads: hotLeads.length, coldLeads: coldLeads.length,
      avgDealSize: won > 0 ? Math.round(closedRevenue / won) : 0
    };
  }, [leads, clients]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-navy">Sales Analytics</h1>
        <p className="text-muted-foreground mt-1">Lead pipeline performance, conversion rates & revenue forecast</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Leads</p>
                <p className="text-4xl font-bold text-blue-900 mt-1">{metrics.total}</p>
                <p className="text-xs text-blue-600 mt-1">{metrics.hotLeads} hot · {metrics.coldLeads} cold</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-200">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Conversion Rate</p>
                <p className="text-4xl font-bold text-green-900 mt-1">{metrics.conversionRate}%</p>
                <p className="text-xs text-green-600 mt-1">{metrics.won} leads closed</p>
              </div>
              <div className="p-2.5 rounded-lg bg-green-200">
                <Target className="w-5 h-5 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Pipeline Value</p>
                <p className="text-4xl font-bold text-purple-900 mt-1">{fmt(metrics.totalPipeline)}</p>
                <p className="text-xs text-purple-600 mt-1">{metrics.active} active leads</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-200">
                <TrendingUp className="w-5 h-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Closed Revenue</p>
                <p className="text-4xl font-bold text-amber-900 mt-1">{fmt(metrics.closedRevenue)}</p>
                <p className="text-xs text-amber-600 mt-1">Avg deal {fmt(metrics.avgDealSize)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-200">
                <DollarSign className="w-5 h-5 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads by Stage + Outcome Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage bar chart */}
        <Card className="border-none shadow-md lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy text-base flex items-center gap-2">
              <Target className="w-4 h-4" /> Leads by Pipeline Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.byStage} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="shortStage" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => name === 'count' ? [`${val} leads`, 'Leads'] : [fmt(val), 'Est. Value']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {metrics.byStage.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome pie */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy text-base">Lead Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={metrics.outcomeData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {metrics.outcomeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} leads`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {metrics.outcomeData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-semibold text-navy">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue forecast card */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Revenue Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Closed Revenue</p>
                <p className="text-2xl font-bold text-green-800">{fmt(metrics.closedRevenue)}</p>
              </div>
              <Badge className="bg-green-200 text-green-800">Confirmed</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Pipeline</p>
                <p className="text-2xl font-bold text-blue-800">{fmt(metrics.totalPipeline)}</p>
                <p className="text-xs text-blue-600 mt-0.5">All active leads at full value</p>
              </div>
              <Badge className="bg-blue-200 text-blue-800">Pipeline</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Weighted Forecast</p>
                <p className="text-2xl font-bold text-purple-800">{fmt(metrics.weightedForecast)}</p>
                <p className="text-xs text-purple-600 mt-0.5">Adjusted by probability %</p>
              </div>
              <Badge className="bg-purple-200 text-purple-800">Forecast</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Total Opportunity</p>
                <p className="text-2xl font-bold text-amber-800">{fmt(metrics.closedRevenue + metrics.totalPipeline)}</p>
                <p className="text-xs text-amber-600 mt-0.5">Closed + full pipeline</p>
              </div>
              <Badge className="bg-amber-200 text-amber-800">Total</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Monthly Lead Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No historical data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.monthlyTrend} margin={{ top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new_leads" name="New Leads" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="won" name="Won" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Source breakdown */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-navy text-base">Leads by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.bySource.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No lead source data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.bySource.map((src, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:shadow-sm transition-all">
                  <div>
                    <p className="font-semibold text-navy text-sm">{src.source}</p>
                    <p className="text-xs text-muted-foreground">{fmt(src.value)} est. value</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 text-sm px-3">{src.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}