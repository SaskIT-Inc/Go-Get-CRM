import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, FileText, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeamReports() {
  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  // Team workload
  const teamWorkload = serviceFilings.reduce((acc, filing) => {
    const assignee = filing.assigned_to || 'Unassigned';
    if (!acc[assignee]) {
      acc[assignee] = { total: 0, active: 0, completed: 0 };
    }
    acc[assignee].total++;
    if (!['Filed', 'Completed'].includes(filing.status)) acc[assignee].active++;
    if (['Filed', 'Completed'].includes(filing.status)) acc[assignee].completed++;
    return acc;
  }, {});

  const workloadData = Object.entries(teamWorkload).map(([member, stats]) => ({
    member: member.split('@')[0] || member,
    ...stats
  }));

  // Client assignments
  const clientAssignments = clients.reduce((acc, client) => {
    const assignee = client.assigned_to || 'Unassigned';
    if (!acc[assignee]) acc[assignee] = 0;
    acc[assignee]++;
    return acc;
  }, {});

  const clientData = Object.entries(clientAssignments).map(([member, count]) => ({
    member: member.split('@')[0] || member,
    clients: count
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Team Performance</h1>
          <p className="text-muted-foreground">Staff productivity and workload analysis</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Workload Distribution */}
      <Card className="mb-6 border-none shadow-md">
        <CardHeader>
          <CardTitle>Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="member" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" fill="#fbbf24" name="Active Tasks" />
              <Bar dataKey="completed" fill="#10b981" name="Completed Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Client Assignments */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Client Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={clientData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="member" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clients" fill="#1e3a8a" name="Assigned Clients" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}