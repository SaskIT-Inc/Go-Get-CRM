import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  FileText,
  Clipboard,
  Users,
  FolderOpen,
  GitBranch,
  Database as DatabaseIcon
} from 'lucide-react';

const databaseModules = [
  {
    title: 'Services',
    description: 'Master service catalog database',
    icon: FileText,
    color: 'bg-blue-500/10 text-blue-700',
    page: 'DatabaseServices',
    features: ['All services', 'Pricing', 'Categories']
  },
  {
    title: 'CRA Forms',
    description: 'Tax forms and filing requirements',
    icon: Clipboard,
    color: 'bg-green-500/10 text-green-700',
    page: 'CRAForms',
    features: ['Form library', 'Requirements', 'Deadlines']
  },
  {
    title: 'Vendors',
    description: 'Third-party service providers',
    icon: Users,
    color: 'bg-purple-500/10 text-purple-700',
    page: 'Vendors',
    features: ['Partner network', 'Contact info', 'Services']
  },
  {
    title: 'Document Types',
    description: 'Document classification system',
    icon: FolderOpen,
    color: 'bg-yellow/10 text-yellow-dark',
    page: 'DocumentTypes',
    features: ['Categories', 'Templates', 'Standards']
  },
  {
    title: 'Workflow Templates',
    description: 'Reusable process workflows',
    icon: GitBranch,
    color: 'bg-red/10 text-red',
    page: 'WorkflowTemplates',
    features: ['Process steps', 'Automation', 'Best practices']
  }
];

export default function Database() {
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list()
  });

  const { data: workflowTemplates = [] } = useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: () => api.entities.WorkflowTemplate.list()
  });

  const totalServices = services.length;
  const activeServices = services.filter(s => s.is_active).length;
  const totalWorkflows = workflowTemplates.length;
  const activeWorkflows = workflowTemplates.filter(w => w.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Database</h1>
        <p className="text-muted-foreground">
          Master data management for services, forms, and workflows
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-3xl font-bold text-navy">{totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-3xl font-bold text-green-600">{activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workflows</p>
                <p className="text-3xl font-bold text-purple-600">{totalWorkflows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
                <DatabaseIcon className="w-6 h-6 text-yellow-dark" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-3xl font-bold text-yellow-dark">{activeWorkflows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {databaseModules.map((module) => (
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