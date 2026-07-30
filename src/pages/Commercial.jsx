import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  FileText,
  Calculator,
  CreditCard,
  TrendingUp,
  DollarSign,
  BarChart3
} from 'lucide-react';

const commercialModules = [
  {
    title: 'Service Catalog',
    description: 'Manage your service offerings',
    icon: FileText,
    color: 'bg-blue-500/10 text-blue-700',
    page: 'ServiceCatalog',
    features: ['Service library', 'Pricing tiers', 'CRA forms']
  },
  {
    title: 'Estimate Builder',
    description: 'Create professional quotes',
    icon: Calculator,
    color: 'bg-green-500/10 text-green-700',
    page: 'EstimateBuilder',
    features: ['Custom estimates', 'Line items', 'Templates']
  },
  {
    title: 'Retainer Management',
    description: 'Recurring revenue contracts',
    icon: CreditCard,
    color: 'bg-purple-500/10 text-purple-700',
    page: 'RetainerManagement',
    features: ['Monthly retainers', 'Auto-billing', 'Service packages']
  },
  {
    title: 'Revenue Intelligence',
    description: 'Financial analytics and forecasting',
    icon: TrendingUp,
    color: 'bg-yellow/10 text-yellow-dark',
    page: 'RevenueIntelligence',
    features: ['Revenue tracking', 'Forecasting', 'KPIs']
  }
];

export default function Commercial() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list()
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const collectedRevenue = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const outstandingRevenue = totalRevenue - collectedRevenue;
  const activeServices = services.filter(s => s.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Commercial</h1>
        <p className="text-muted-foreground">
          Service catalog, pricing, and revenue management
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-navy">${totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-3xl font-bold text-blue-600">${collectedRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-3xl font-bold text-yellow-dark">${outstandingRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-3xl font-bold text-purple-600">{activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commercial Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {commercialModules.map((module) => (
          <Link key={module.page} to={createPageUrl(module.page)}>
            <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className={`w-16 h-16 rounded-xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform mb-4`}>
                    <module.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-navy text-lg mb-1 group-hover:text-yellow transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">
                    Key Features:
                  </p>
                  <div className="space-y-1">
                    {module.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-navy/30" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}