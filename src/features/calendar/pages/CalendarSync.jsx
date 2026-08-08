import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle, AlertCircle, RefreshCw, Clock, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { PROVINCES_WITH_PST } from '@/lib/canada';

export default function CalendarSync() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [shareWithClient, setShareWithClient] = useState(false);
  const [syncTasks, setSyncTasks] = useState(true);
  const [syncDeadlines, setSyncDeadlines] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => api.entities.Task.filter({ assigned_to: user?.email })
  });

  const syncFilingsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.functions.invoke('syncFilingDeadlinesToCalendar', {
        clientId: selectedClient,
        calendarProvider: selectedProvider,
        shareWithClient
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Calendar sync successful!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sync calendar');
    }
  });

  const syncTasksMutation = useMutation({
    mutationFn: async () => {
      const response = await api.functions.invoke('syncTasksToCalendar', {
        calendarProvider: selectedProvider,
        userEmail: user?.email
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Tasks synced to calendar!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sync tasks');
    }
  });

  const handleSyncAll = () => {
    if (syncDeadlines && selectedClient) {
      syncFilingsMutation.mutate();
    }
    if (syncTasks) {
      syncTasksMutation.mutate();
    }
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const clientFilings = selectedClientData ? 
    ['T2 Corporate Tax', 'T4 Slips', 'GST/HST', 'PST', 'Payroll Remittance'].filter(filing => {
      if (filing.includes('T2') && selectedClientData.client_type === 'Business') return true;
      if (filing.includes('T4') && selectedClientData.number_of_employees > 0) return true;
      if (filing.includes('GST') && selectedClientData.gst_hst_number) return true;
      if (filing.includes('PST') && PROVINCES_WITH_PST.includes(selectedClientData.province)) return true;
      if (filing.includes('Payroll') && selectedClientData.number_of_employees > 0) return true;
      return false;
    }) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Calendar Synchronization</h1>
        <p className="text-muted-foreground">
          Sync filing deadlines and tasks to Google Calendar or Outlook
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Calendar Configuration
              </CardTitle>
              <CardDescription>
                Select client and calendar provider to sync deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Calendar Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="outlook" disabled>Outlook (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-sm">Sync Options</p>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sync-deadlines" 
                    checked={syncDeadlines}
                    onCheckedChange={setSyncDeadlines}
                  />
                  <Label htmlFor="sync-deadlines" className="cursor-pointer">
                    Filing Deadlines (T2, T4, GST/PST, Payroll)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sync-tasks" 
                    checked={syncTasks}
                    onCheckedChange={setSyncTasks}
                  />
                  <Label htmlFor="sync-tasks" className="cursor-pointer">
                    My Assigned Tasks ({tasks.length})
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="share-client" 
                    checked={shareWithClient}
                    onCheckedChange={setShareWithClient}
                  />
                  <Label htmlFor="share-client" className="cursor-pointer">
                    Share calendar with client
                  </Label>
                </div>
              </div>

              <Button 
                onClick={handleSyncAll}
                disabled={(!syncDeadlines && !syncTasks) || (syncDeadlines && !selectedClient) || syncFilingsMutation.isPending || syncTasksMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                <RefreshCw className={`w-5 h-5 ${(syncFilingsMutation.isPending || syncTasksMutation.isPending) ? 'animate-spin' : ''}`} />
                {syncFilingsMutation.isPending || syncTasksMutation.isPending ? 'Syncing...' : 'Sync to Calendar'}
              </Button>
            </CardContent>
          </Card>

          {/* Client Tax Cycle Info */}
          {selectedClientData && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Client Tax Cycle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client Type</p>
                    <p className="font-semibold">{selectedClientData.client_type}</p>
                  </div>
                  
                  {selectedClientData.fiscal_year_end && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fiscal Year End</p>
                      <p className="font-semibold">{selectedClientData.fiscal_year_end}</p>
                    </div>
                  )}

                  {selectedClientData.number_of_employees > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Employees</p>
                      <p className="font-semibold">{selectedClientData.number_of_employees}</p>
                    </div>
                  )}

                  {selectedClientData.gst_hst_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">GST/HST Number</p>
                      <p className="font-semibold">{selectedClientData.gst_hst_number}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Filing Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    {clientFilings.map(filing => (
                      <Badge key={filing} variant="outline" className="bg-blue-50">
                        {filing}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg">What Gets Synced?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">T2 Corporate Tax</p>
                  <p className="text-xs text-muted-foreground">6 months after fiscal year end</p>
                </div>
              </div>

              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">T4 Slips</p>
                  <p className="text-xs text-muted-foreground">February 28 annually</p>
                </div>
              </div>

              <div className="flex gap-3">
                <DollarSign className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">GST/HST Filing</p>
                  <p className="text-xs text-muted-foreground">Monthly, Quarterly, or Annual</p>
                </div>
              </div>

              <div className="flex gap-3">
                <DollarSign className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">PST Filing</p>
                  <p className="text-xs text-muted-foreground">For clients in PST provinces (SK, BC, MB, QC)</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Payroll Remittance</p>
                  <p className="text-xs text-muted-foreground">15th of following month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Deadlines are calculated based on client fiscal year and tax cycle</p>
              <p>• Automatic reminders are set 7 days before each deadline</p>
              <p>• GST/PST frequencies are based on client registration</p>
              <p>• Payroll deadlines apply to clients with employees</p>
              <p>• Client sharing requires their calendar consent</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}