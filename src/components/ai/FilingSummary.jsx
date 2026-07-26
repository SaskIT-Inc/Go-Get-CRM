import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function FilingSummary({ filingName, filingYear, status, documents = [], notes = '', open, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const response = await api.functions.invoke('generateFilingSummary', {
        filing_name: filingName,
        filing_year: filingYear,
        status,
        documents,
        notes
      });
      setSummary(response.data);
    } catch (error) {
      toast.error('Failed to generate summary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Filing Summary
          </DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Generate an AI summary of this filing</p>
            <Button onClick={handleGenerateSummary} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed">
                  {summary.summary}
                </p>
              </CardContent>
            </Card>

            <div>
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </h4>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {summary.estimated_timeline}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm">Next Steps</h4>
              <ul className="space-y-2">
                {summary.next_steps?.map((step, idx) => (
                  <li key={idx} className="text-sm p-2 bg-slate-50 rounded-lg">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {summary.risks?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  Risks to Monitor
                </h4>
                <ul className="space-y-1">
                  {summary.risks.map((risk, idx) => (
                    <li key={idx} className="text-sm text-amber-600">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}