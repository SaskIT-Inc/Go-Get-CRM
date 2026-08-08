import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Phone, Calendar, User, Search, Plus } from 'lucide-react';
import LogCommunicationModal from '@/features/clients/components/detail/LogCommunicationModal';

const TYPE_ICONS = {
  Call: <Phone className="w-5 h-5" />,
  Email: <Mail className="w-5 h-5" />,
  Meeting: <Calendar className="w-5 h-5" />,
  Note: <MessageSquare className="w-5 h-5" />,
};

const TYPE_COLORS = {
  Call: 'bg-green-500/10 text-green-700',
  Email: 'bg-blue-500/10 text-blue-700',
  Meeting: 'bg-purple-500/10 text-purple-700',
  Note: 'bg-yellow/10 text-yellow-dark',
};

export default function CommunicationHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [communicationType, setCommunicationType] = useState('all');
  const [showLogCommunication, setShowLogCommunication] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => api.entities.Communication.list('-communication_date')
  });

  const filteredCommunications = communications.filter(comm => {
    const client = clients.find(c => c.id === comm.client_id);
    const matchesSearch = !searchTerm ||
      comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = selectedClient === 'all' || comm.client_id === selectedClient;
    const matchesType = communicationType === 'all' || comm.communication_type === communicationType;
    return matchesSearch && matchesClient && matchesType;
  });

  const countByType = (type) => communications.filter(c => c.communication_type === type).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Communication History</h1>
          <p className="text-muted-foreground">Track all client interactions and correspondence</p>
        </div>
        <Button
          className="gap-2"
          disabled={selectedClient === 'all'}
          title={selectedClient === 'all' ? 'Select a client first' : undefined}
          onClick={() => setShowLogCommunication(true)}
        >
          <Plus className="w-4 h-4" />Log Communication
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails</p>
                <p className="text-3xl font-bold text-navy">{countByType('Email')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meetings</p>
                <p className="text-3xl font-bold text-navy">{countByType('Meeting')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calls</p>
                <p className="text-3xl font-bold text-navy">{countByType('Call')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-navy" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-navy">{communications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={communicationType} onValueChange={setCommunicationType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Call">Call</SelectItem>
                <SelectItem value="Note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredCommunications.map(comm => {
          const client = clients.find(c => c.id === comm.client_id);
          return (
            <Card key={comm.id} className="border-none shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${TYPE_COLORS[comm.communication_type] || TYPE_COLORS.Note} flex items-center justify-center`}>
                    {TYPE_ICONS[comm.communication_type] || TYPE_ICONS.Note}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-navy text-lg">{comm.subject || comm.communication_type}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className={TYPE_COLORS[comm.communication_type] || TYPE_COLORS.Note}>
                            {comm.communication_type}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>{client?.legal_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(comm.communication_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    {comm.notes && <p className="text-muted-foreground">{comm.notes}</p>}
                    {comm.created_by && (
                      <p className="text-xs text-muted-foreground mt-2">Logged by {comm.created_by}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCommunications.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No Communications Found</h3>
              <p className="text-muted-foreground">No communications match your search criteria</p>
            </CardContent>
          </Card>
        )}
      </div>

      <LogCommunicationModal
        open={showLogCommunication}
        onClose={() => setShowLogCommunication(false)}
        clientId={selectedClient !== 'all' ? selectedClient : undefined}
      />
    </div>
  );
}
