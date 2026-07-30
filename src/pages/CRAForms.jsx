import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Loader2 } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function CRAForms() {
  const { data: craForms = [], isLoading } = useQuery({
    queryKey: ['cra-forms'],
    queryFn: () => api.craForms.list(),
  });

  const groups = useMemo(() => {
    const byJurisdiction = craForms.reduce((acc, form) => {
      const key = form.jurisdiction || 'Federal';
      (acc[key] = acc[key] || []).push(form);
      return acc;
    }, {});
    // Federal first, then provinces/territories alphabetically.
    return Object.entries(byJurisdiction).sort(([a], [b]) => {
      if (a === 'Federal') return -1;
      if (b === 'Federal') return 1;
      return a.localeCompare(b);
    });
  }, [craForms]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Tax & Compliance Forms</h1>
        <p className="text-muted-foreground">
          Federal (CRA) and provincial filing requirements and deadlines, grouped by jurisdiction
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading forms...
        </div>
      ) : craForms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No forms on file yet.</div>
      ) : (
        <div className="space-y-10">
          {groups.map(([jurisdiction, forms]) => (
            <div key={jurisdiction}>
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                {jurisdiction}
                <Badge variant="secondary">{forms.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.map(form => (
                  <Card key={form.id} className="border-none shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{form.code}</CardTitle>
                            {form.category && <Badge variant="secondary" className="mt-1">{form.category}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold text-navy mb-3">{form.name}</h4>
                      {form.deadline && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Deadline: {form.deadline}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
