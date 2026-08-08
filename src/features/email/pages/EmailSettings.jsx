import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle, Trash2, Cloud } from 'lucide-react';
import { toast } from 'sonner';

const CONNECT_ERROR_MESSAGES = {
  google_oauth_failed: 'Could not connect your Google account. Please try again.',
  google_oauth_no_refresh_token: 'Google did not grant lasting access. Please try connecting again.',
  outlook_oauth_failed: 'Could not connect your Outlook account. Please try again.',
  outlook_oauth_no_refresh_token: 'Microsoft did not grant lasting access. Please try connecting again.',
  onedrive_oauth_failed: 'Could not connect your OneDrive account. Please try again.',
  onedrive_oauth_no_refresh_token: 'Microsoft did not grant lasting access. Please try connecting again.',
};

export default function EmailSettings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['connectedEmailAccounts'],
    queryFn: () => api.integrations.getConnectedAccounts(),
  });
  const googleAccount = accounts.find((a) => a.provider === 'google');
  const microsoftAccount = accounts.find((a) => a.provider === 'microsoft');

  const { data: oneDriveStatus, isLoading: isLoadingOneDrive } = useQuery({
    queryKey: ['oneDriveStatus'],
    queryFn: () => api.integrations.getOneDriveStatus(),
  });

  useEffect(() => {
    if (searchParams.get('email_connected')) {
      toast.success('Mailbox connected');
      queryClient.invalidateQueries(['connectedEmailAccounts']);
      navigate(createPageUrl('EmailSettings'), { replace: true });
    } else if (searchParams.get('onedrive_connected')) {
      toast.success('OneDrive account connected');
      queryClient.invalidateQueries(['oneDriveStatus']);
      navigate(createPageUrl('EmailSettings'), { replace: true });
    } else if (searchParams.get('email_connect_error') || searchParams.get('onedrive_connect_error')) {
      const code = searchParams.get('email_connect_error') || searchParams.get('onedrive_connect_error');
      toast.error(CONNECT_ERROR_MESSAGES[code] || 'Could not connect your account.');
      navigate(createPageUrl('EmailSettings'), { replace: true });
    }
  }, [searchParams]);

  const connectMutation = useMutation({
    mutationFn: () => api.integrations.getGoogleConnectUrl(),
    onSuccess: ({ authorize_url }) => {
      window.location.href = authorize_url;
    },
    onError: (error) => toast.error('Could not start Google connection: ' + error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.integrations.disconnectGoogle(),
    onSuccess: () => {
      queryClient.invalidateQueries(['connectedEmailAccounts']);
      toast.success('Gmail account disconnected');
    },
    onError: (error) => toast.error('Failed to disconnect: ' + error.message),
  });

  const connectOutlookMutation = useMutation({
    mutationFn: () => api.integrations.getOutlookConnectUrl(),
    onSuccess: ({ authorize_url }) => {
      window.location.href = authorize_url;
    },
    onError: (error) => toast.error('Could not start Outlook connection: ' + error.message),
  });

  const disconnectOutlookMutation = useMutation({
    mutationFn: () => api.integrations.disconnectOutlook(),
    onSuccess: () => {
      queryClient.invalidateQueries(['connectedEmailAccounts']);
      toast.success('Outlook account disconnected');
    },
    onError: (error) => toast.error('Failed to disconnect: ' + error.message),
  });

  const connectOneDriveMutation = useMutation({
    mutationFn: () => api.integrations.getOneDriveConnectUrl(),
    onSuccess: ({ authorize_url }) => {
      window.location.href = authorize_url;
    },
    onError: (error) => toast.error('Could not start OneDrive connection: ' + error.message),
  });

  const disconnectOneDriveMutation = useMutation({
    mutationFn: () => api.integrations.disconnectOneDrive(),
    onSuccess: () => {
      queryClient.invalidateQueries(['oneDriveStatus']);
      toast.success('OneDrive account disconnected');
    },
    onError: (error) => toast.error('Failed to disconnect: ' + error.message),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Email Settings</h1>
          <p className="text-muted-foreground">Connect your own mailbox to send CRM email as yourself</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Settings')}>
            <Button variant="outline" size="sm">Settings</Button>
          </Link>
          <Link to={createPageUrl('UserManagement')}>
            <Button variant="outline" size="sm">Users</Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Connected Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-muted-foreground mb-2">
            Emails sent from the CRM's Compose screen go out through your own connected mailbox, not a shared
            company address. Nothing here affects your login or team invitations. You can connect one mailbox at
            a time — connecting Outlook while Gmail is connected (or vice versa) replaces the previous one.
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Google / Gmail</p>
                    {googleAccount ? (
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected: {googleAccount.email_address}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </div>
                {googleAccount ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={disconnectMutation.isPending}
                    onClick={() => disconnectMutation.mutate()}
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={connectMutation.isPending}
                    onClick={() => connectMutation.mutate()}
                  >
                    {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Connect Gmail
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Microsoft / Outlook</p>
                    {microsoftAccount ? (
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected: {microsoftAccount.email_address}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </div>
                {microsoftAccount ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={disconnectOutlookMutation.isPending}
                    onClick={() => disconnectOutlookMutation.mutate()}
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={connectOutlookMutation.isPending}
                    onClick={() => connectOutlookMutation.mutate()}
                  >
                    {connectOutlookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Connect Outlook
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg mt-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            Connected Cloud Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-muted-foreground mb-2">
            Connect your own OneDrive (personal, work, or school Microsoft account) so filing documents and signed
            documents you sync land in your own storage — not a shared company drive.
          </p>

          {isLoadingOneDrive ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-navy">Microsoft OneDrive</p>
                  {oneDriveStatus?.connected ? (
                    <span className="text-sm text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Connected: {oneDriveStatus.email_address}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not connected</span>
                  )}
                </div>
              </div>
              {oneDriveStatus?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={disconnectOneDriveMutation.isPending}
                  onClick={() => disconnectOneDriveMutation.mutate()}
                >
                  <Trash2 className="w-4 h-4" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={connectOneDriveMutation.isPending}
                  onClick={() => connectOneDriveMutation.mutate()}
                >
                  {connectOneDriveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Connect OneDrive
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
