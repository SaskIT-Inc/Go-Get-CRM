import React from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CommentInput from './CommentInput';
import CommentThread from './CommentThread';
import { MessageSquare } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function TaskCommentSection({ taskId }) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => api.entities.TaskComment.filter({ task_id: taskId }, '-created_date'),
    staleTime: 1000 * 60
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.User.list(),
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ comment_text, mentioned_emails, attachments }) => {
      let attachmentUrls = [];

      for (const att of attachments) {
        if (att.file) {
          const { file_url } = await api.integrations.Core.UploadFile({ file: att.file });
          attachmentUrls.push({
            file_url,
            file_name: att.name,
            file_size: att.size
          });
        }
      }

      return api.entities.TaskComment.create({
        task_id: taskId,
        commenter_email: user.email,
        commenter_name: user.full_name,
        comment_text,
        mentioned_emails,
        attachments: attachmentUrls
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Comments ({comments.length})</h3>
      </div>

      <CommentInput
        onSubmit={(data) => createCommentMutation.mutate(data)}
        isLoading={createCommentMutation.isPending}
        teamMembers={users}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CommentThread
          comments={comments}
          taskId={taskId}
          currentUserEmail={user?.email}
          onDelete={() => queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] })}
        />
      )}
    </div>
  );
}