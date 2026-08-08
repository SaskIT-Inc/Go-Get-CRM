import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

export default function ConversionTracking() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const won = leads.filter(l => l.stage === 'Won');
  const lost = leads.filter(l => l.stage === 'Lost');
  const active = leads.filter(l => !['Won', 'Lost'].includes(l.stage));

  const conversionRate = (won.length + lost.length) > 0 
    ? ((won.length / (won.length + lost.length)) * 100).toFixed(1)
    : 0;

  const wonValue = won.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const lostValue = lost.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const byStage = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {});

  const stageData = Object.entries(byStage).map(([stage, count]) => ({
    name: stage,
    count
  }));

  const outcomeData = [
    { name: 'Won', value: won.length },
    { name: 'Lost', value: lost.length },
    { name: 'Active', value: active.length }
  ];

  const bySource = leads.reduce((acc, lead) => {
    const source = lead.lead_source || 'Unknown';
    if (!acc[source]) acc[source] = { won: 0, lost: 0, total: 0 };
    acc[source].total++;
    if (lead.stage === 'Won') acc[source].won++;
    if (lead.stage === 'Lost') acc[source].lost++;
    return acc;
  }, {});

  const sourceData = Object.entries(bySource).map(([source, data]) => ({
    source,
    won: data.won,
    lost: data.lost,
    rate: data.total > 0 ? ((data.won / (data.won + data.lost || 1)) * 100).toFixed(1) : 0
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Conversion Analytics</h1>
          <p className="text-muted-foreground">
            Lead-to-client conversion rates and pipeline performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('LeadPipeline')}>
            <Button variant="outline" size="sm">Pipeline View</Button>
          </Link>
          <Link to={createPageUrl('LeadDirectory')}>
            <Button variant="outline" size="sm">Lead Directory</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Won</p>
                <p className="text-3xl font-bold text-green-600">{won.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lost</p>
                <p className="text-3xl font-bold text-red">{lost.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-600">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate Value</p>
                <p className="text-2xl font-bold text-blue-600">${wonValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversion by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceData.map(source => (
                <div key={source.source} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold text-navy">{source.source}</p>
                    <p className="text-sm text-muted-foreground">
                      Won: {source.won} | Lost: {source.lost}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-navy">{source.rate}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}