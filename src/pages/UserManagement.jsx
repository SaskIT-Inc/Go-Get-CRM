import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { INVITABLE, useCurrentUser } from '@/lib/permissions';
import PermissionMatrixEditor from '@/components/user/PermissionMatrixEditor';
import UserCard from '@/components/user/UserCard';

const ROLE_LABEL = (role) => role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || role;

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [invite, setInvite] = useState({ email: '', full_name: '', role: '', permissions: {} });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list(),
  });

  const invitableRoles = INVITABLE[user?.role] || [];

  const inviteMutation = useMutation({
    mutationFn: (data) => api.users.inviteUser(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Invitation sent to ${data.email}`);
      if (data.accept_url) {
        toast.info(`No email set up yet — share this invite link manually: ${data.accept_url}`);
      }
      setInvite({ email: '', full_name: '', role: '', permissions: {} });
    },
    onError: (error) => toast.error(`Failed to invite: ${error.message}`),
  });

  const accessMutation = useMutation({
    mutationFn: ({ userId, data }) => api.users.updateAccess(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
    onError: (error) => toast.error(`Failed to update user: ${error.message}`),
  });

  const handleInvite = () => {
    if (!invite.email || !invite.role) {
      toast.error('Email and role are required');
      return;
    }
    inviteMutation.mutate(invite);
  };

  if (user && user.role === 'client') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">User management isn't part of the client portal.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">User Management</h1>
        <p className="text-muted-foreground">Invite team members and manage their access</p>
      </div>

      {invitableRoles.length > 0 && (
        <Card className="border-none shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Invite Someone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  placeholder="Full name"
                  value={invite.full_name}
                  onChange={(e) => setInvite({ ...invite, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="person@example.com"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Role *</Label>
                <Select value={invite.role} onValueChange={(value) => setInvite({ ...invite, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {invite.role && invite.role !== 'client' && (
              <div>
                <Label className="mb-2 block">Module Access</Label>
                <PermissionMatrixEditor
                  value={invite.permissions}
                  onChange={(permissions) => setInvite({ ...invite, permissions })}
                />
              </div>
            )}

            <Button onClick={handleInvite} disabled={inviteMutation.isPending} className="gap-2">
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Invite
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Team ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                currentUser={user}
                onSave={(userId, data) => accessMutation.mutate({ userId, data })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
