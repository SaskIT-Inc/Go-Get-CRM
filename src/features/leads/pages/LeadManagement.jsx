import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  UserPlus,
  Users,
  GitBranch,
  FileText,
  DollarSign,
  CreditCard,
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';

const leadModules = [
  {
    title: 'Lead Capture',
    description: 'Quick intake form for new leads',
    icon: UserPlus,
    color: 'bg-green-500/10 text-green-700',
    page: 'LeadCapture',
    features: ['Fast entry', 'Multiple sources', 'Auto-routing']
  },
  {
    title: 'Lead Directory',
    description: 'Complete lead database',
    icon: Users,
    color: 'bg-blue-500/10 text-blue-700',
    page: 'LeadDirectory',
    features: ['Search & filter', 'Contact info', 'Lead history']
  },
  {
    title: 'Lead Pipeline',
    description: 'Visual sales pipeline management',
    icon: GitBranch,
    color: 'bg-purple-500/10 text-purple-700',
    page: 'LeadPipeline',
    features: ['Kanban board', 'Drag & drop', 'Stage tracking']
  },
  {
    title: 'Needs Assessment',
    description: 'Detailed requirement analysis',
    icon: FileText,
    color: 'bg-yellow/10 text-yellow-dark',
    page: 'NeedsAssessment',
    features: ['Service matching', 'Pain points', 'Solution mapping']
  },
  {
    title: 'Estimates',
    description: 'Proposal and quote generation',
    icon: DollarSign,
    color: 'bg-indigo-500/10 text-indigo-700',
    page: 'Estimates',
    features: ['Custom quotes', 'Pricing', 'Proposal templates']
  },
  {
    title: 'Retainers',
    description: 'Retainer agreements and management',
    icon: CreditCard,
    color: 'bg-red/10 text-red',
    page: 'Retainers',
    features: ['Monthly fees', 'Service packages', 'Auto-renewal']
  },
  {
    title: 'Conversion Tracking',
    description: 'Lead-to-client analytics',
    icon: TrendingUp,
    color: 'bg-teal-500/10 text-teal-700',
    page: 'ConversionTracking',
    features: ['Win/loss analysis', 'Conversion rates', 'ROI metrics']
  }
];

export default function LeadManagement() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length;
  const wonLeads = leads.filter(l => l.stage === 'Won').length;
  const conversionRate = (wonLeads + leads.filter(l => l.stage === 'Lost').length) > 0
    ? ((wonLeads / (wonLeads + leads.filter(l => l.stage === 'Lost').length)) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Lead Management</h1>
        <p className="text-muted-foreground">
          Complete lead capture, nurturing, and conversion system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold text-navy">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Pipeline</p>
                <p className="text-3xl font-bold text-yellow-dark">{activeLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Won</p>
                <p className="text-3xl font-bold text-green-600">{wonLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-600">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leadModules.map((module) => (
          <Link key={module.page} to={createPageUrl(module.page)}>
            <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <module.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-navy text-lg mb-1 group-hover:text-yellow transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
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