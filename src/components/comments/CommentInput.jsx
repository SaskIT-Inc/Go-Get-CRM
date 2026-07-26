import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentInput({ onSubmit, isLoading, teamMembers = [] }) {
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleMentionSelect = (email, name) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = comment.substring(0, cursorPos);
    const lastAtSign = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSign !== -1) {
      const beforeMention = comment.substring(0, lastAtSign);
      const afterMention = comment.substring(cursorPos);
      const newComment = `${beforeMention}@${name} ${afterMention}`;
      setComment(newComment);
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        continue;
      }
      setAttachments(prev => [...prev, { file, name: file.name, size: file.size }]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!comment.trim() && attachments.length === 0) return;
    
    const mentionedNames = (comment.match(/@[\w\s]+/g) || [])
      .map(m => m.slice(1).trim())
      .filter(Boolean);
    
    const mentionedEmails = teamMembers
      .filter(member => mentionedNames.some(name => 
        member.full_name?.includes(name) || member.email.includes(name)
      ))
      .map(m => m.email);

    await onSubmit({
      comment_text: comment,
      mentioned_emails: mentionedEmails,
      attachments
    });

    setComment('');
    setAttachments([]);
  };

  const filteredMembers = teamMembers.filter(member =>
    mentionSearch === '' || 
    member.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Add a comment... (Use @name to mention colleagues)"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            const atIndex = e.target.value.lastIndexOf('@');
            if (atIndex !== -1) {
              const afterAt = e.target.value.substring(atIndex + 1);
              const spaceIndex = afterAt.indexOf(' ');
              const search = spaceIndex === -1 ? afterAt : afterAt.substring(0, spaceIndex);
              setMentionSearch(search);
              setShowMentions(search.length > 0);
            } else {
              setShowMentions(false);
            }
          }}
          className="min-h-20 resize-none"
        />

        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-2 w-full bg-white border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredMembers.map(member => (
              <button
                key={member.email}
                onClick={() => handleMentionSelect(member.email, member.full_name || member.email)}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
              >
                <p className="font-medium">{member.full_name || member.email}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm">
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Paperclip className="w-4 h-4" />
          Attach
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!comment.trim() && attachments.length === 0 || isLoading}
          size="sm"
          className="gap-2 ml-auto"
        >
          <Send className="w-4 h-4" />
          Post
        </Button>
      </div>
    </div>
  );
}