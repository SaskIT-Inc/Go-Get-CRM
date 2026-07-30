import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Cloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { can } from '@/lib/permissions';

export default function OneDriveSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilings, setSelectedFilings] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: oneDriveStatus } = useQuery({
    queryKey: ['oneDriveStatus'],
    queryFn: () => api.integrations.getOneDriveStatus(),
  });

  const { data: filings = [] } = useQuery({
    queryKey: ['oneDriveSyncFilings'],
    queryFn: () => api.entities.ServiceFiling.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['oneDriveSyncClients'],
    queryFn: () => api.entities.Client.list()
  });

  // Sync individual filing
  const syncFilingMutation = useMutation({
    mutationFn: async (filing_id) => {
      const filing = filings.find((f) => f.id === filing_id);
      if (!filing) throw new Error('Filing not found');

      const response = await api.functions.invoke('syncFilingToOneDrive', {
        filing_id,
        client_id: filing.client_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Synced',
        description: `${data.documentsUploaded} documents uploaded to OneDrive`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Sync multiple filings
  const syncMultipleMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const filing_id of selectedFilings) {
        try {
          const filing = filings.find((f) => f.id === filing_id);
          const response = await api.functions.invoke('syncFilingToOneDrive', {
            filing_id,
            client_id: filing.client_id
          });
          results.push({ filing_id, success: true, data: response.data });
        } catch (error) {
          results.push({ filing_id, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      toast({
        title: 'Batch Sync Complete',
        description: `Successfully synced ${successCount} of ${results.length} filings`,
      });
      setSelectedFilings([]);
      queryClient.invalidateQueries({ queryKey: ['oneDriveSyncFilings'] });
    }
  });

  // Check access
  const hasAccess = can(user, 'settings', 'edit');

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Access Restricted</h3>
                <p className="text-red-700">
                  OneDrive sync management is only available to Directors and Admins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unsyncedFilings = filings.filter((f) => !f.onedrive_synced);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">OneDrive Integration</h1>
        <p className="text-muted-foreground">
          Sync filing documents to your own connected OneDrive — each staff member connects their own
          personal, work, or school account; there's no shared firm-wide drive.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Total Filings</p>
                <p className="text-4xl font-bold text-blue-900">{filings.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-200">
                <Cloud className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-2">Synced</p>
                <p className="text-4xl font-bold text-green-900">
                  {filings.filter((f) => f.onedrive_synced).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-200">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-2">Pending Sync</p>
                <p className="text-4xl font-bold text-orange-900">{unsyncedFilings.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-200">
                <RefreshCw className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      {!oneDriveStatus?.connected && (
        <Card className="border-none shadow-md mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 mb-1">Connect your OneDrive</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Sync uploads documents into <strong>your own</strong> connected OneDrive — connect it once in
                  Email Settings, then folders are created automatically as you sync each filing.
                </p>
                <Link to={createPageUrl('EmailSettings')}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Go to Email Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filings List */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-navy">Service Filings</CardTitle>
            {selectedFilings.length > 0 && (
              <Button
                onClick={() => syncMultipleMutation.mutate()}
                disabled={syncMultipleMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {syncMultipleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    Sync {selectedFilings.length} Filing{selectedFilings.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-navy">
                    <input
                      type="checkbox"
                      checked={selectedFilings.length === unsyncedFilings.length && unsyncedFilings.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFilings(unsyncedFilings.map((f) => f.id));
                        } else {
                          setSelectedFilings([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-navy">Filing Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-navy">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-navy">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-navy">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-navy">Action</th>
                </tr>
              </thead>
              <tbody>
                {filings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 px-4 text-center text-slate-500">
                      No filings found
                    </td>
                  </tr>
                ) : (
                  filings.map((filing) => {
                    const client = clients.find((c) => c.id === filing.client_id);
                    const isSynced = filing.onedrive_synced;

                    return (
                      <tr key={filing.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedFilings.includes(filing.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFilings([...selectedFilings, filing.id]);
                              } else {
                                setSelectedFilings(selectedFilings.filter((id) => id !== filing.id));
                              }
                            }}
                            disabled={isSynced}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-navy">{filing.filing_type}</td>
                        <td className="py-3 px-4 text-slate-600">{client?.company_name || client?.contact_name || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          <Badge className={isSynced ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                            {isSynced ? 'Synced' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {new Date(filing.created_date).toLocaleDateString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          <Button
                            onClick={() => syncFilingMutation.mutate(filing.id)}
                            disabled={syncFilingMutation.isPending || isSynced}
                            variant="outline"
                            size="sm"
                          >
                            {syncFilingMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Cloud className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}