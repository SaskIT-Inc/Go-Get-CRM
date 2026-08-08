import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskSuggestions({ taskTitle, taskDescription, clientContext, open, onClose, onApply }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.functions.invoke('suggestTaskImprovements', {
        task_title: taskTitle,
        task_description: taskDescription,
        client_context: clientContext
      });
      setSuggestions(response.data);
    } catch (error) {
      toast.error('Failed to generate suggestions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(suggestions);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Task Suggestions
          </DialogTitle>
        </DialogHeader>

        {!suggestions ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Get AI-powered suggestions to improve your task definition</p>
            <Button onClick={handleGenerateSuggestions} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Improved Description</h3>
              <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
                {suggestions.improved_description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm">Recommended Priority</h4>
                <Badge className="bg-blue-100 text-blue-800">
                  {suggestions.recommended_priority}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">Estimated Hours</h4>
                <Badge variant="outline">
                  {suggestions.estimated_hours}h
                </Badge>
              </div>
            </div>

            {suggestions.dependencies?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Dependencies
                </h4>
                <ul className="space-y-1">
                  {suggestions.dependencies.map((dep, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {dep}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.sub_tasks?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Suggested Sub-tasks
                </h4>
                <ul className="space-y-1">
                  {suggestions.sub_tasks.map((subtask, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {subtask}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Apply Suggestions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}