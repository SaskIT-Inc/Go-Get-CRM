import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCan, useCurrentUser } from '@/lib/permissions';

export default function WhatsNew() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const can = useCan();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'General' });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.entities.Announcement.list('-created_date'),
  });

  const postMutation = useMutation({
    mutationFn: () => api.entities.Announcement.create({ ...form, published_by: user?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement posted');
      setForm({ title: '', body: '', category: 'General' });
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to post'),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">What's New</h1>
          <p className="text-muted-foreground">Product updates and firm-wide announcements</p>
        </div>
        {can('announcements', 'create') && (
          <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
            <Plus className="w-4 h-4" /> Post
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="pt-6 space-y-3">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              placeholder="What's the update?"
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => postMutation.mutate()}
                disabled={!form.title || postMutation.isPending}
                className="gap-2"
              >
                {postMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Publish
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mt-12" />
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
          Nothing posted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  {a.title}
                  {a.category && <Badge variant="outline">{a.category}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-slate-400 mt-3">
                  {a.published_by} · {new Date(a.created_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
