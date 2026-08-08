import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Filter,
  ListChecks
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClientDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list('-created_date')
  });

  // One bulk fetch, grouped client-side by client_id — same pattern as the
  // recurring-follow-up status lookup on this page's onboarding sibling —
  // so every card can show an at-a-glance task/overdue count without a
  // per-client query.
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });
  const taskCountsByClient = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map();
    for (const task of allTasks) {
      if (!task.client_id) continue;
      const bucket = map.get(task.client_id) || { total: 0, overdue: 0 };
      bucket.total += 1;
      if (task.status !== 'Complete' && task.due_date && new Date(task.due_date) < today) {
        bucket.overdue += 1;
      }
      map.set(task.client_id, bucket);
    }
    return map;
  }, [allTasks]);

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || client.client_type === filterType;
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const statusColors = {
    'Active': 'bg-green-500/10 text-green-700 border-green-500/20',
    'Onboarding': 'bg-yellow/10 text-yellow-dark border-yellow/20',
    'Pending': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    'Inactive': 'bg-gray-500/10 text-gray-700 border-gray-500/20',
    'Archived': 'bg-red/10 text-red border-red/20'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Client Directory</h1>
          <p className="text-muted-foreground">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} - searchable database
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('ClientProfile')}>
            <Button variant="outline">View Profile</Button>
          </Link>
          <Link to={createPageUrl('ClientOnboarding')}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Tabs value={filterType} onValueChange={setFilterType}>
              <TabsList className="bg-muted">
                <TabsTrigger value="all">All Types</TabsTrigger>
                <TabsTrigger value="Individual">Individual</TabsTrigger>
                <TabsTrigger value="Business">Business</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Status Filter */}
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="bg-muted">
                <TabsTrigger value="all">All Status</TabsTrigger>
                <TabsTrigger value="Active">Active</TabsTrigger>
                <TabsTrigger value="Onboarding">Onboarding</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="py-12 text-center">
            <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No clients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first client'}
            </p>
            <Link to={createPageUrl('ClientOnboarding')}>
              <Button className="bg-yellow text-navy hover:bg-yellow-dark">
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <Link key={client.id} to={`${createPageUrl('ClientProfile')}?client=${client.id}`}>
              <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center">
                      {client.client_type === 'Individual' ? (
                        <User className="w-6 h-6 text-navy" />
                      ) : (
                        <Building2 className="w-6 h-6 text-navy" />
                      )}
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs mb-1">
                        {client.client_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[client.status]} border`}
                  >
                    {client.status}
                  </Badge>
                </div>

                {/* Client Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-navy text-lg group-hover:text-yellow transition-colors">
                      {client.legal_name}
                    </h3>
                    {client.operating_name && (
                      <p className="text-sm text-muted-foreground">
                        DBA: {client.operating_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{client.primary_contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.primary_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{client.primary_phone}</span>
                    </div>
                    {client.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{client.city}, {client.province}</span>
                      </div>
                    )}
                  </div>

                  {/* Task summary badge */}
                  {taskCountsByClient.has(client.id) && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <ListChecks className="w-3 h-3" />
                        {taskCountsByClient.get(client.id).total} task{taskCountsByClient.get(client.id).total !== 1 ? 's' : ''}
                      </Badge>
                      {taskCountsByClient.get(client.id).overdue > 0 && (
                        <Badge className="text-xs bg-red-100 text-red-700">
                          {taskCountsByClient.get(client.id).overdue} overdue
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Services */}
                  {client.services_needed?.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {client.services_needed.slice(0, 2).map((service, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs bg-navy/5 text-navy"
                          >
                            {service}
                          </Badge>
                        ))}
                        {client.services_needed.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{client.services_needed.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}