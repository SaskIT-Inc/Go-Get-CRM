import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target } from 'lucide-react';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4', '#ec4899'];

export default function LeadConversionAnalytics({ leads }) {
  // Conversion by Lead Source
  const sourceData = leads.reduce((acc, lead) => {
    const source = lead.lead_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { total: 0, converted: 0 };
    }
    acc[source].total++;
    if (lead.stage === 'Won') {
      acc[source].converted++;
    }
    return acc;
  }, {});

  const conversionBySource = Object.entries(sourceData).map(([source, data]) => ({
    source,
    total: data.total,
    converted: data.converted,
    conversionRate: ((data.converted / data.total) * 100).toFixed(1),
    lost: data.total - data.converted
  })).sort((a, b) => b.total - a.total);

  // Lead Stage Distribution
  const stageDistribution = leads.reduce((acc, lead) => {
    const stage = lead.stage || 'Unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stagePieData = Object.entries(stageDistribution).map(([name, value]) => ({
    name,
    value
  }));

  // Lead Type Analysis
  const typeData = leads.reduce((acc, lead) => {
    const type = lead.lead_type || 'Unknown';
    if (!acc[type]) {
      acc[type] = { total: 0, converted: 0 };
    }
    acc[type].total++;
    if (lead.stage === 'Won') {
      acc[type].converted++;
    }
    return acc;
  }, {});

  const conversionByType = Object.entries(typeData).map(([type, data]) => ({
    type,
    total: data.total,
    converted: data.converted,
    conversionRate: ((data.converted / data.total) * 100).toFixed(1)
  }));

  // Top Referral Sources
  const referralSources = leads
    .filter(l => l.referral_source)
    .reduce((acc, lead) => {
      const source = lead.referral_source;
      if (!acc[source]) {
        acc[source] = { count: 0, converted: 0 };
      }
      acc[source].count++;
      if (lead.stage === 'Won') {
        acc[source].converted++;
      }
      return acc;
    }, {});

  const topReferrals = Object.entries(referralSources)
    .map(([source, data]) => ({
      source,
      count: data.count,
      converted: data.converted,
      conversionRate: ((data.converted / data.count) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Conversion Rate by Lead Source */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Conversion Rate by Lead Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={conversionBySource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="converted" fill="#059669" name="Converted" />
              <Bar dataKey="lost" fill="#dc2626" name="Not Converted" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversionBySource.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-navy">{item.source}</p>
                <p className="text-2xl font-bold text-blue-600">{item.conversionRate}%</p>
                <p className="text-sm text-slate-600">
                  {item.converted} / {item.total} leads converted
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Stage Distribution & Type Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Lead Stage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stagePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stagePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Conversion by Lead Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionByType.map((item, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-navy">{item.type}</span>
                    <span className="text-2xl font-bold text-green-600">{item.conversionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${item.conversionRate}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {item.converted} / {item.total} converted
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Referral Sources */}
      {topReferrals.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Top Referral Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topReferrals.map((item, idx) => (
                <div key={idx} className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg">
                  <p className="font-semibold text-navy truncate">{item.source}</p>
                  <p className="text-2xl font-bold text-blue-600">{item.count}</p>
                  <p className="text-sm text-slate-600">{item.conversionRate}% conversion</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}