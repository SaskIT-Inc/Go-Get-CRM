import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Retainers() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const retainerClients = clients.filter(c => c.payment_terms === 'Retainer');
  const activeRetainers = retainerClients.filter(c => c.status === 'Active');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Retainer Overview</h1>
          <p className="text-muted-foreground">
            View active retainers - use Commercial Hub to manage agreements
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('CommercialHub')}>
            <Button>Retainer Management</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Retainers</p>
                <p className="text-3xl font-bold text-navy">{retainerClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Retainers</p>
                <p className="text-3xl font-bold text-green-600">{activeRetainers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-3xl font-bold text-purple-600">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {retainerClients.map(client => (
          <Card key={client.id} className="border-none shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-navy">{client.legal_name}</h3>
                  <p className="text-sm text-muted-foreground">{client.primary_email}</p>
                </div>
                <Badge className={client.status === 'Active' ? 'bg-green-500/10 text-green-700' : 'bg-gray-500/10 text-gray-700'}>
                  {client.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Payment: {client.payment_terms}</span>
                </div>
                {client.services_needed && client.services_needed.length > 0 && (
                  <p className="text-muted-foreground">
                    Services: {client.services_needed.join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {retainerClients.length === 0 && (
          <Card className="col-span-2 border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No Retainer Clients</h3>
              <p className="text-muted-foreground mb-4">
                Set up retainer agreements for recurring monthly services
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}