import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Building2, User, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#1e3a8a', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function ClientReports() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  // Client type distribution
  const clientTypeData = [
    { name: 'Individual', value: clients.filter(c => c.client_type === 'Individual').length },
    { name: 'Business', value: clients.filter(c => c.client_type === 'Business').length }
  ].filter(item => item.value > 0);

  // Status distribution
  const statusData = [
    { name: 'Active', value: clients.filter(c => c.status === 'Active').length },
    { name: 'Onboarding', value: clients.filter(c => c.status === 'Onboarding').length },
    { name: 'Pending', value: clients.filter(c => c.status === 'Pending').length },
    { name: 'Inactive', value: clients.filter(c => c.status === 'Inactive').length }
  ].filter(item => item.value > 0);

  // Client value tiers
  const clientValueData = clients.map(client => {
    const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
    const totalValue = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    return { ...client, totalValue };
  });

  const valueTierData = [
    { tier: 'High Value (>$5K)', count: clientValueData.filter(c => c.totalValue > 5000).length },
    { tier: 'Medium ($1K-$5K)', count: clientValueData.filter(c => c.totalValue >= 1000 && c.totalValue <= 5000).length },
    { tier: 'Standard (<$1K)', count: clientValueData.filter(c => c.totalValue < 1000).length }
  ];

  // Lead source distribution
  const leadSourceData = clients.reduce((acc, client) => {
    const source = client.lead_source || 'Unknown';
    if (!acc[source]) acc[source] = 0;
    acc[source]++;
    return acc;
  }, {});
  const leadSourceChart = Object.entries(leadSourceData).map(([name, value]) => ({ name, value }));

  // Service utilization
  const serviceUtilization = serviceFilings.reduce((acc, filing) => {
    if (!acc[filing.service_name]) {
      acc[filing.service_name] = 0;
    }
    acc[filing.service_name]++;
    return acc;
  }, {});
  const serviceData = Object.entries(serviceUtilization)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Office preference
  const officeData = clients.reduce((acc, client) => {
    const office = client.preferred_office || 'Not Specified';
    if (!acc[office]) acc[office] = 0;
    acc[office]++;
    return acc;
  }, {});
  const officeChart = Object.entries(officeData).map(([name, value]) => ({ name, value }));

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const businessClients = clients.filter(c => c.client_type === 'Business').length;
  const avgServicesPerClient = totalClients > 0 ? (serviceFilings.length / totalClients).toFixed(1) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Client Reports</h1>
          <p className="text-muted-foreground">Client demographics and value analysis</p>
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
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <Users className="w-5 h-5 text-navy" />
            </div>
            <p className="text-3xl font-bold text-navy">{totalClients}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{activeClients}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : 0}% active rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Business Clients</p>
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{businessClients}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClients - businessClients} individual
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Services/Client</p>
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{avgServicesPerClient}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="demographics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="value">Value Tiers</TabsTrigger>
          <TabsTrigger value="services">Service Utilization</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Client Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clientTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Client Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1e3a8a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Office Preference</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={officeChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {officeChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="value">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Client Value Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={valueTierData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Services by Client Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="service" type="category" width={200} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Client Acquisition Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={leadSourceChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadSourceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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