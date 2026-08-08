import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, CheckCircle, Clock, Target, User } from 'lucide-react';

export default function DailyAccountability() {
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list()
  });

  // Check if user has access permissions
  // Access granted to: management roles (accountant, manager, CEM, director), the user viewing their own data, or supervisors
  const isManager = ['director', 'admin', 'manager'].includes(user?.role?.toLowerCase());
  const canAccess = isManager;

  // If user is not a manager, only show their own data
  const viewingUserEmail = !isManager ? user?.email : selectedEmployee === 'all' ? null : selectedEmployee;
  const employeeFilter = viewingUserEmail ? (task) => task.assigned_to === viewingUserEmail : () => true;

  // Filter tasks by date range and user permissions
  const tasksInRange = tasks.filter(t => {
    const taskDate = new Date(t.created_date);
    const dateMatch = taskDate >= new Date(dateRange.start) && taskDate <= new Date(dateRange.end);
    const userMatch = employeeFilter(t);
    return dateMatch && userMatch;
  });

  // Calculate performance metrics by employee
  const employeePerformance = users.map(emp => {
    const empTasks = selectedEmployee === 'all' 
      ? tasksInRange.filter(t => t.assigned_to === emp.email)
      : tasksInRange.filter(t => t.assigned_to === emp.email && emp.email === selectedEmployee);

    const completed = empTasks.filter(t => t.status === 'Complete');
    const total = empTasks.length;
    const onTime = completed.filter(t => {
      if (!t.due_date || !t.completed_date) return true;
      return new Date(t.completed_date) <= new Date(t.due_date);
    });

    return {
      name: emp.full_name || emp.email,
      email: emp.email,
      totalTasks: total,
      completed: completed.length,
      completionRate: total > 0 ? ((completed.length / total) * 100).toFixed(1) : 0,
      onTimeRate: completed.length > 0 ? ((onTime.length / completed.length) * 100).toFixed(1) : 0,
      avgHoursPerTask: completed.length > 0 
        ? (completed.reduce((sum, t) => sum + (t.actual_hours || t.estimated_hours || 0), 0) / completed.length).toFixed(1)
        : 0
    };
  }).filter(emp => emp.totalTasks > 0);

  // Category-wise performance
  const categoryPerformance = tasks.reduce((acc, task) => {
    const category = task.tags && task.tags.length > 0 ? task.tags[0] : 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, onTime: 0 };
    }
    acc[category].total++;
    if (task.status === 'Complete') {
      acc[category].completed++;
      if (task.due_date && task.completed_date && new Date(task.completed_date) <= new Date(task.due_date)) {
        acc[category].onTime++;
      }
    }
    return acc;
  }, {});

  const categoryData = Object.entries(categoryPerformance).map(([category, data]) => ({
    category,
    total: data.total,
    completed: data.completed,
    completionRate: ((data.completed / data.total) * 100).toFixed(1)
  }));

  // Daily trend
  const dailyTrend = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayTasks = tasksInRange.filter(t => t.completed_date?.startsWith(dateStr));
    dailyTrend.push({
      date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: dayTasks.length
    });
  }

  if (!canAccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-md">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Daily Accountability dashboard is available for Manager, Director, Accountant, CEM roles, or to view your own accountability.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Daily Accountability Dashboard</h1>
        <p className="text-muted-foreground">Team performance metrics and productivity analytics</p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-md mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isManager && <SelectItem value="all">All Employees</SelectItem>}
                  {isManager ? (
                    users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={user?.email}>{user?.full_name || user?.email}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-green-700">
                  {tasksInRange.filter(t => t.status === 'Complete').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Completion Rate</p>
                <p className="text-3xl font-bold text-blue-700">
                  {tasksInRange.length > 0 
                    ? ((tasksInRange.filter(t => t.status === 'Complete').length / tasksInRange.length) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">On-Time Delivery</p>
                <p className="text-3xl font-bold text-purple-700">
                  {(() => {
                    const completed = tasksInRange.filter(t => t.status === 'Complete' && t.due_date && t.completed_date);
                    const onTime = completed.filter(t => new Date(t.completed_date) <= new Date(t.due_date));
                    return completed.length > 0 ? ((onTime.length / completed.length) * 100).toFixed(0) : 0;
                  })()}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Team</p>
                <p className="text-3xl font-bold text-orange-700">{employeePerformance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance */}
      <Card className="border-none shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Employee Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#059669" name="Completed" />
              <Bar dataKey="totalTasks" fill="#2563eb" name="Total" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeePerformance.map((emp, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-navy mb-2">{emp.name}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion Rate:</span>
                    <span className="font-semibold text-green-600">{emp.completionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">On-Time Rate:</span>
                    <span className="font-semibold text-blue-600">{emp.onTimeRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Hours/Task:</span>
                    <span className="font-semibold text-purple-600">{emp.avgHoursPerTask}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Performance & Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Category-Wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.map((cat, idx) => (
                <div key={idx} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-navy">{cat.category}</span>
                    <span className="text-sm text-muted-foreground">{cat.completed}/{cat.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${cat.completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cat.completionRate}% completion</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Daily Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}