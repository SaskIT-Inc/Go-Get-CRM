import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessagesSquare, Plus, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/lib/permissions';
import useLiveChat from '@/hooks/useLiveChat';

export default function Conversations() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [selectedId, setSelectedId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newParticipants, setNewParticipants] = useState([]);
  const [draft, setDraft] = useState('');

  useLiveChat();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.entities.Conversation.list('-last_message_at'),
    refetchInterval: 5000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => api.entities.Message.filter({ conversation_id: selectedId }),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  const createConversationMutation = useMutation({
    mutationFn: () =>
      api.entities.Conversation.create({ subject: newSubject, participant_emails: newParticipants }),
    onSuccess: (convo) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedId(convo.id);
      setComposing(false);
      setNewSubject('');
      setNewParticipants([]);
    },
    onError: (err) => toast.error(err.message || 'Failed to start conversation'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (body) => api.entities.Message.create({ conversation_id: selectedId, body }),
    onMutate: async (body) => {
      const key = ['messages', selectedId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => [
        ...old,
        { id: `optimistic-${Date.now()}`, conversation_id: selectedId, sender_email: user?.email, body, created_date: new Date().toISOString() },
      ]);
      setDraft('');
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      api.entities.Conversation.update(selectedId, { last_message_at: new Date().toISOString() });
    },
    onError: (err, _body, context) => {
      if (context?.previous) queryClient.setQueryData(['messages', selectedId], context.previous);
      toast.error(err.message || 'Failed to send');
    },
  });

  const toggleParticipant = (email) => {
    setNewParticipants((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const otherStaff = teamMembers.filter((m) => m.email !== user?.email);
  const selected = conversations.find((c) => c.id === selectedId);

  const nameForEmail = (email) =>
    teamMembers.find((m) => m.email === email)?.full_name || email;

  const displayTitle = (c) =>
    c.subject || (c.participant_emails || []).filter((e) => e !== user?.email).map(nameForEmail).join(', ') || 'Conversation';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-[calc(100vh-70px)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-navy">Conversations</h1>
        <Button onClick={() => setComposing(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100%-80px)]">
        <Card className="border-none shadow-lg overflow-y-auto md:col-span-1">
          <CardContent className="p-2">
            {composing && (
              <div className="p-3 mb-2 border rounded-lg bg-slate-50 space-y-2">
                <Input
                  placeholder="Name this conversation (optional)"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {otherStaff.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={newParticipants.includes(m.email)}
                        onChange={() => toggleParticipant(m.email)}
                      />
                      {m.full_name || m.email}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={newParticipants.length === 0 || createConversationMutation.isPending}
                    onClick={() => createConversationMutation.mutate()}
                  >
                    Start
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {conversations.length === 0 && !composing && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessagesSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                No conversations yet
              </div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                  selectedId === c.id ? 'bg-primary text-white' : 'hover:bg-slate-50'
                )}
              >
                <p className="font-semibold truncate">{displayTitle(c)}</p>
                <p className={cn('text-xs truncate', selectedId === c.id ? 'text-white/80' : 'text-slate-400')}>
                  {(c.participant_emails || []).filter((e) => e !== user?.email).map(nameForEmail).join(', ')}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg md:col-span-2 flex flex-col">
          {!selected ? (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation
            </CardContent>
          ) : (
            <>
              <div className="p-4 border-b font-semibold text-navy">{displayTitle(selected)}</div>
              <CardContent className="flex-1 overflow-y-auto space-y-3 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[75%] p-3 rounded-xl text-sm',
                      m.sender_email === user?.email
                        ? 'ml-auto bg-primary text-white'
                        : 'bg-slate-100 text-slate-800'
                    )}
                  >
                    {m.sender_email !== user?.email && (
                      <p className="text-xs font-semibold mb-1 opacity-70">{nameForEmail(m.sender_email)}</p>
                    )}
                    {m.body}
                  </div>
                ))}
              </CardContent>
              <div className="p-3 border-t flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  rows={1}
                  className="resize-none"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate(draft)}
                  disabled={!draft.trim() || sendMessageMutation.isPending}
                  className="gap-1"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
