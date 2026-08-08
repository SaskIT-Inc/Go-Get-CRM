import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#1e3a8a', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function LeadReports() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  // Pipeline distribution
  const pipelineData = [
    { stage: 'New Lead', count: leads.filter(l => l.stage === 'New Lead').length },
    { stage: 'Contacted', count: leads.filter(l => l.stage === 'Contacted').length },
    { stage: 'Needs Assessment', count: leads.filter(l => l.stage === 'Needs Assessment').length },
    { stage: 'Estimate Sent', count: leads.filter(l => l.stage === 'Estimate Sent').length },
    { stage: 'Negotiation', count: leads.filter(l => l.stage === 'Negotiation').length },
    { stage: 'Won', count: leads.filter(l => l.stage === 'Won').length },
    { stage: 'Lost', count: leads.filter(l => l.stage === 'Lost').length }
  ];

  // Lead source distribution
  const sourceData = leads.reduce((acc, lead) => {
    const source = lead.lead_source || 'Unknown';
    if (!acc[source]) acc[source] = 0;
    acc[source]++;
    return acc;
  }, {});
  const sourceChart = Object.entries(sourceData).map(([name, value]) => ({ name, value }));

  // Conversion metrics
  const wonLeads = leads.filter(l => l.stage === 'Won').length;
  const lostLeads = leads.filter(l => l.stage === 'Lost').length;
  const activeLeads = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length;
  const conversionRate = (wonLeads + lostLeads) > 0 ? ((wonLeads / (wonLeads + lostLeads)) * 100).toFixed(1) : 0;

  // Value analysis
  const totalPipelineValue = leads
    .filter(l => !['Won', 'Lost'].includes(l.stage))
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const wonValue = leads
    .filter(l => l.stage === 'Won')
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const avgDealSize = wonLeads > 0 ? (wonValue / wonLeads) : 0;

  // Lead type distribution
  const typeData = [
    { name: 'Individual', value: leads.filter(l => l.lead_type === 'Individual').length },
    { name: 'Business', value: leads.filter(l => l.lead_type === 'Business').length }
  ].filter(item => item.value > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Lead Reports</h1>
          <p className="text-muted-foreground">Lead pipeline and conversion analytics</p>
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
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <Users className="w-5 h-5 text-navy" />
            </div>
            <p className="text-3xl font-bold text-navy">{leads.length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Pipeline</p>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{activeLeads}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{wonLeads} won / {lostLeads} lost</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <DollarSign className="w-5 h-5 text-yellow-dark" />
            </div>
            <p className="text-3xl font-bold text-yellow-dark">${totalPipelineValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg: ${avgDealSize.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="type">Lead Type</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Lead Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e3a8a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Lead Source Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={sourceChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Win/Loss Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Won', value: wonLeads },
                        { name: 'Lost', value: lostLeads },
                        { name: 'In Pipeline', value: activeLeads }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#fbbf24" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Won Value</p>
                  <p className="text-3xl font-bold text-green-600">${wonValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pipeline Value</p>
                  <p className="text-3xl font-bold text-yellow-dark">${totalPipelineValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Average Deal Size</p>
                  <p className="text-3xl font-bold text-navy">${avgDealSize.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="type">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Lead Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}