import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

export default function Calendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: serviceFilings = [] } = useQuery({
    queryKey: ['serviceFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const filingsWithDates = serviceFilings.filter(f => f.due_date);
  
  const upcomingDeadlines = filingsWithDates
    .filter(f => new Date(f.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 10);

  const overdueFilings = filingsWithDates
    .filter(f => new Date(f.due_date) < new Date() && !['Filed', 'Completed'].includes(f.status));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Calendar & Deadlines</h1>
        <p className="text-muted-foreground">
          Track all filing deadlines and important dates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-navy" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map(filing => {
                  const daysUntil = Math.ceil((new Date(filing.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                  const isDueSoon = daysUntil <= 7;

                  return (
                    <div
                      key={filing.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        isDueSoon ? 'bg-yellow/10 border-l-yellow' : 'bg-muted border-l-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-navy">{filing.service_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {filing.filing_year} • Client: {filing.client_id}
                          </p>
                        </div>
                        {isDueSoon && (
                          <Badge variant="outline" className="border-yellow text-yellow-dark">
                            <Clock className="w-3 h-3 mr-1" />
                            Due Soon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className={isDueSoon ? 'text-yellow-dark font-semibold' : 'text-muted-foreground'}>
                          {new Date(filing.due_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          ({daysUntil} {daysUntil === 1 ? 'day' : 'days'} remaining)
                        </span>
                      </div>
                    </div>
                  );
                })}

                {upcomingDeadlines.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Items */}
        <div>
          <Card className="border-none shadow-md border-l-4 border-l-red">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red">
                <AlertCircle className="w-5 h-5" />
                Overdue ({overdueFilings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueFilings.map(filing => {
                  const daysOverdue = Math.abs(Math.ceil((new Date(filing.due_date) - new Date()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={filing.id} className="p-3 bg-red/10 rounded-lg">
                      <h4 className="font-semibold text-navy mb-1">{filing.service_name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {filing.filing_year}
                      </p>
                      <p className="text-sm text-red font-semibold">
                        {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                      </p>
                    </div>
                  );
                })}

                {overdueFilings.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-green-600 font-semibold">✓ No overdue items</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}