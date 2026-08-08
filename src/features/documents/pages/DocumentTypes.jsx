import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderOpen, FileText, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_DOCUMENT_TYPE = { name: '', category: '', description: '' };

export default function DocumentTypes() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newDocType, setNewDocType] = useState(EMPTY_DOCUMENT_TYPE);

  const { data: documentTypes = [], isLoading } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => api.entities.DocumentType.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.DocumentType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type added');
      setShowAdd(false);
      setNewDocType(EMPTY_DOCUMENT_TYPE);
    },
    onError: (error) => toast.error('Failed to add document type: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.DocumentType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type removed');
    },
    onError: (error) => toast.error('Failed to remove document type: ' + error.message),
  });

  const categories = [...new Set(documentTypes.map(d => d.category || 'Uncategorized'))];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Document Types</h1>
          <p className="text-muted-foreground">
            Document classification system and categories
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Document Type</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading document types...
        </div>
      ) : documentTypes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No document types yet. Add your first one above.
        </div>
      ) : (
        categories.map(category => (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-navy" />
              <h2 className="text-xl font-bold text-navy">{category}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTypes
                .filter(doc => (doc.category || 'Uncategorized') === category)
                .map(doc => (
                  <Card key={doc.id} className="border-none shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-navy mb-1">{doc.name}</h4>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc_type_name">Name</Label>
              <Input
                id="doc_type_name"
                value={newDocType.name}
                onChange={(e) => setNewDocType({ ...newDocType, name: e.target.value })}
                placeholder="Tax Slip - T4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc_type_category">Category</Label>
              <Input
                id="doc_type_category"
                value={newDocType.category}
                onChange={(e) => setNewDocType({ ...newDocType, category: e.target.value })}
                placeholder="Tax Documents"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc_type_description">Description</Label>
              <Textarea
                id="doc_type_description"
                value={newDocType.description}
                onChange={(e) => setNewDocType({ ...newDocType, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newDocType)}
              disabled={!newDocType.name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding…' : 'Add Document Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
