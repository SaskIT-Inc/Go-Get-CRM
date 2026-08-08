import React from 'react';
import { format } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function CommentThread({ comments, taskId, currentUserEmail, onDelete }) {
  const queryClient = useQueryClient();
  
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => api.entities.TaskComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      onDelete?.();
    }
  });

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No comments yet. Start the conversation!
        </div>
      ) : (
        comments.map(comment => (
          <div key={comment.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">{comment.commenter_name || comment.commenter_email}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_date), 'MMM d, yyyy h:mm a')}
                  {comment.edited && ' (edited)'}
                </p>
              </div>
              {comment.commenter_email === currentUserEmail && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => deleteCommentMutation.mutate(comment.id)}
                  disabled={deleteCommentMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>

            <p className="text-sm text-foreground mb-3 whitespace-pre-wrap break-words">
              {comment.comment_text}
            </p>

            {comment.mentioned_emails && comment.mentioned_emails.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {comment.mentioned_emails.map(email => (
                  <span key={email} className="inline-block bg-accent/20 text-accent px-2 py-0.5 rounded text-xs">
                    @{email.split('@')[0]}
                  </span>
                ))}
              </div>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Attachments</p>
                {comment.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    <span className="truncate">{att.file_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(att.file_size / 1024).toFixed(1)} KB)
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}