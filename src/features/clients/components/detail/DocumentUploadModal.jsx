import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';

export default function DocumentUploadModal({ filing, client, onClose }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const { data: checklist } = useQuery({
    queryKey: ['checklist', filing.id],
    queryFn: async () => {
      const lists = await api.entities.DocumentChecklist.filter({ service_filing_id: filing.id });
      return lists[0];
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      // Upload file
      const { file_url } = await api.integrations.Core.UploadFile({ file });

      // Create document record
      const doc = await api.entities.Document.create({
        client_id: client.id,
        service_filing_id: filing.id,
        document_name: file.name,
        document_type: documentType,
        file_url,
        status: 'Pending Review',
        uploaded_by: client.primary_email
      });

      if (comment.trim()) {
        await api.entities.DocumentComment.create({
          document_id: doc.id,
          body: comment.trim(),
        });
      }

      // Update checklist if exists
      if (checklist) {
        const updatedItems = checklist.checklist_items.map(item => {
          if (item.document_name === documentType && item.status === 'Missing') {
            return {
              ...item,
              status: 'Uploaded',
              document_id: doc.id,
              uploaded_date: new Date().toISOString()
            };
          }
          return item;
        });

        const completedCount = updatedItems.filter(i => i.status !== 'Missing').length;
        const completionPct = Math.round((completedCount / updatedItems.length) * 100);

        await api.entities.DocumentChecklist.update(checklist.id, {
          checklist_items: updatedItems,
          completion_percentage: completionPct,
          all_documents_received: completionPct === 100,
          last_updated: new Date().toISOString()
        });

        // Notify team if filing status should change
        if (completionPct === 100 && filing.status === 'Documents Pending') {
          await api.entities.ServiceFiling.update(filing.id, {
            status: 'In Progress'
          });
        }
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myDocuments']);
      queryClient.invalidateQueries(['myChecklists']);
      queryClient.invalidateQueries(['myFilings']);
      onClose();
    }
  });

  const missingDocuments = checklist?.checklist_items?.filter(i => i.status === 'Missing') || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {missingDocuments.map((item, idx) => (
                  <SelectItem key={idx} value={item.document_name}>
                    {item.document_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select File</Label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full mt-2 text-sm"
            />
          </div>

          <div>
            <Label>Note for your firm (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any context about this document…"
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !documentType || uploadMutation.isPending}
              className="flex-1 gap-2"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}