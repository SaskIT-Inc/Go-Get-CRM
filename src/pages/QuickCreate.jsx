import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  UserPlus,
  Users,
  FileText,
  DollarSign,
  CheckSquare,
  Workflow,
  FileUp,
  Building,
  Briefcase,
  Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function QuickCreate() {
  const createOptions = [
    { name: 'Lead', icon: Target, page: 'LeadCapture', color: 'bg-yellow' },
    { name: 'Client', icon: Users, page: 'ClientOnboarding', color: 'bg-navy' },
    { name: 'Estimate', icon: FileText, page: 'EstimateBuilder', color: 'bg-navy' },
    { name: 'Retainer', icon: DollarSign, page: 'RetainerManagement', color: 'bg-yellow' },
    { name: 'Task', icon: CheckSquare, page: 'MyTasks', color: 'bg-navy' },
    { name: 'Process', icon: Workflow, page: 'Processes', color: 'bg-yellow' },
    { name: 'Document', icon: FileUp, page: 'Documents', color: 'bg-navy' },
    { name: 'Vendor', icon: Building, page: 'Vendors', color: 'bg-yellow' },
    { name: 'Service', icon: Briefcase, page: 'ServiceCatalog', color: 'bg-navy' }
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Create New</h1>
        <p className="text-muted-foreground">
          Quickly create leads, clients, tasks, and more
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {createOptions.map((option) => (
          <Link key={option.name} to={createPageUrl(option.page)}>
            <Card className="border-none shadow-md hover:shadow-xl transition-all group cursor-pointer">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center gap-4">
                  <div
                    className={`p-6 rounded-2xl ${option.color} group-hover:scale-110 transition-transform`}
                  >
                    <option.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy">New {option.name}</h3>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}