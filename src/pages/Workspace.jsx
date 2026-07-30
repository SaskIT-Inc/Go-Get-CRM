import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  CheckSquare,
  Users as UsersIcon,
  GitBranch,
  Calendar,
  FileText,
  BarChart3,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const workspaceModules = [
  {
    title: 'My Tasks',
    description: 'Your personal task list and assignments',
    icon: CheckSquare,
    color: 'bg-blue-500/10 text-blue-700',
    page: 'MyTasks',
    features: ['Personal assignments', 'Priorities', 'Dependencies']
  },
  {
    title: 'Team Tasks',
    description: 'Collaborative task management',
    icon: UsersIcon,
    color: 'bg-purple-500/10 text-purple-700',
    page: 'TeamTasks',
    features: ['Team visibility', 'Workload distribution', 'Progress tracking']
  },
  {
    title: 'Task Timeline',
    description: 'Visual dependency timeline view',
    icon: GitBranch,
    color: 'bg-green-500/10 text-green-700',
    page: 'TaskTimeline',
    features: ['Dependency graph', 'Blocked tasks', 'Critical path']
  },
  {
    title: 'Processes',
    description: 'Workflow templates and automation',
    icon: GitBranch,
    color: 'bg-teal-500/10 text-teal-700',
    page: 'Processes',
    features: ['Workflow templates', 'Process steps', 'Automation']
  },
  {
    title: 'Calendar',
    description: 'Schedule and deadline management',
    icon: Calendar,
    color: 'bg-yellow/10 text-yellow-dark',
    page: 'Calendar',
    features: ['Deadlines', 'Meetings', 'Milestones']
  },
  {
    title: 'Documents',
    description: 'Team document library',
    icon: FileText,
    color: 'bg-red/10 text-red',
    page: 'Documents',
    features: ['Shared files', 'Templates', 'Version control']
  },
  {
    title: 'Daily Accountability',
    description: 'Track daily progress and activities',
    icon: BarChart3,
    color: 'bg-indigo-500/10 text-indigo-700',
    page: 'DailyAccountability',
    features: ['Daily reports', 'Activity logs', 'Performance metrics']
  }
];

export default function Workspace() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const myTasks = serviceFilings.filter(f => f.assigned_to === user?.email && !['Filed', 'Completed'].includes(f.status));
  const dueSoon = myTasks.filter(f => {
    if (!f.due_date) return false;
    const daysUntil = Math.ceil((new Date(f.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  });
  const overdue = myTasks.filter(f => f.due_date && new Date(f.due_date) < new Date());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Workspace</h1>
        <p className="text-muted-foreground">
          Your personal productivity hub and team collaboration center
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Active Tasks</p>
                <p className="text-3xl font-bold text-navy">{myTasks.length}</p>
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
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-3xl font-bold text-yellow-dark">{dueSoon.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red">{overdue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaceModules.map((module) => (
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