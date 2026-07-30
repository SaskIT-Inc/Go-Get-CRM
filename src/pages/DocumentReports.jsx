import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#1e3a8a', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function DocumentReports() {
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.entities.Document.list()
  });

  // Status distribution
  const statusData = [
    { name: 'Pending Review', value: documents.filter(d => d.status === 'Pending Review').length },
    { name: 'Reviewed', value: documents.filter(d => d.status === 'Reviewed').length },
    { name: 'Processed', value: documents.filter(d => d.status === 'Processed').length },
    { name: 'Archived', value: documents.filter(d => d.status === 'Archived').length }
  ].filter(item => item.value > 0);

  // Document type distribution
  const typeData = documents.reduce((acc, doc) => {
    const type = doc.document_type || 'Unknown';
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {});
  const typeChart = Object.entries(typeData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const totalDocs = documents.length;
  const pendingDocs = documents.filter(d => d.status === 'Pending Review').length;
  const processedDocs = documents.filter(d => d.status === 'Processed').length;
  const verifiedDocs = documents.filter(d => d.is_verified).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Document Reports</h1>
          <p className="text-muted-foreground">Document tracking and compliance status</p>
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
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <FileText className="w-5 h-5 text-navy" />
            </div>
            <p className="text-3xl font-bold text-navy">{totalDocs}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <Clock className="w-5 h-5 text-yellow-dark" />
            </div>
            <p className="text-3xl font-bold text-yellow-dark">{pendingDocs}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Processed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{processedDocs}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Verified</p>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{verifiedDocs}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Document Status</TabsTrigger>
          <TabsTrigger value="types">Document Types</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Document Status Distribution</CardTitle>
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

        <TabsContent value="types">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Top 10 Document Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={typeChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1e3a8a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}