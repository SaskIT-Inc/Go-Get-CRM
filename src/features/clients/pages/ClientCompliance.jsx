import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, Clock, Calendar, Search, FileText } from 'lucide-react';

export default function ClientCompliance() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Upcoming deadlines (next 30 days)
  const upcomingDeadlines = serviceFilings
    .filter(f => f.due_date && !['Filed', 'Completed'].includes(f.status))
    .map(f => ({
      ...f,
      client: clients.find(c => c.id === f.client_id),
      daysUntilDue: Math.ceil((new Date(f.due_date) - today) / (1000 * 60 * 60 * 24))
    }))
    .filter(f => new Date(f.due_date) <= thirtyDaysFromNow)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Overdue items
  const overdueItems = serviceFilings
    .filter(f => f.due_date && !['Filed', 'Completed'].includes(f.status))
    .map(f => ({
      ...f,
      client: clients.find(c => c.id === f.client_id),
      daysOverdue: Math.ceil((today - new Date(f.due_date)) / (1000 * 60 * 60 * 24))
    }))
    .filter(f => new Date(f.due_date) < today)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Compliant (filed/completed)
  const compliantItems = serviceFilings
    .filter(f => ['Filed', 'Completed'].includes(f.status))
    .map(f => ({
      ...f,
      client: clients.find(c => c.id === f.client_id)
    }))
    .sort((a, b) => new Date(b.filed_date || b.updated_date) - new Date(a.filed_date || a.updated_date));

  const filteredUpcoming = upcomingDeadlines.filter(item =>
    !searchTerm ||
    item.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOverdue = overdueItems.filter(item =>
    !searchTerm ||
    item.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompliant = compliantItems.filter(item =>
    !searchTerm ||
    item.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-navy mb-2">Compliance Tracking</h1>
        <p className="text-muted-foreground">Monitor filing deadlines and compliance status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red">{overdueItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Soon (30 days)</p>
                <p className="text-3xl font-bold text-yellow-dark">{upcomingDeadlines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliant</p>
                <p className="text-3xl font-bold text-green-600">{compliantItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by service or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overdue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Overdue ({filteredOverdue.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="w-4 h-4" />
            Upcoming ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="compliant" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Compliant ({filteredCompliant.length})
          </TabsTrigger>
        </TabsList>

        {/* Overdue Tab */}
        <TabsContent value="overdue">
          <div className="space-y-3">
            {filteredOverdue.map(item => (
              <Card key={item.id} className="border-none shadow-md bg-red/5 border-l-4 border-l-red">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-navy">{item.service_name}</h3>
                        <p className="text-sm text-muted-foreground">{item.client?.legal_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-red" />
                            <span className="text-red font-medium">
                              Due: {new Date(item.due_date).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-red/10 text-red border-red/20">
                            {item.daysOverdue} days overdue
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredOverdue.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-navy mb-2">No Overdue Items</h3>
                  <p className="text-muted-foreground">All filings are on track!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming">
          <div className="space-y-3">
            {filteredUpcoming.map(item => (
              <Card key={item.id} className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-yellow-dark" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-navy">{item.service_name}</h3>
                        <p className="text-sm text-muted-foreground">{item.client?.legal_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                          </div>
                          <Badge variant="secondary" className={
                            item.daysUntilDue <= 7
                              ? 'bg-yellow/10 text-yellow-dark border-yellow/20'
                              : 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                          }>
                            {item.daysUntilDue} days remaining
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredUpcoming.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-navy mb-2">No Upcoming Deadlines</h3>
                  <p className="text-muted-foreground">No filings due in the next 30 days</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Compliant Tab */}
        <TabsContent value="compliant">
          <div className="space-y-3">
            {filteredCompliant.map(item => (
              <Card key={item.id} className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-navy">{item.service_name}</h3>
                        <p className="text-sm text-muted-foreground">{item.client?.legal_name}</p>
                        {item.filed_date && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">
                              Filed: {new Date(item.filed_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                      {item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredCompliant.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-navy mb-2">No Completed Filings</h3>
                  <p className="text-muted-foreground">No filings have been completed yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}