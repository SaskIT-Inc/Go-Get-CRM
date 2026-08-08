import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Search, Filter, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DocumentCard from '@/features/documents/components/DocumentCard';
import DocumentUploader from '@/features/documents/components/DocumentUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploader, setShowUploader] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.entities.Document.list()
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => api.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete document');
    }
  });

  const handleDelete = (document) => {
    if (window.confirm(`Delete "${document.document_name}"? This cannot be undone.`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list()
  });

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const docTypes = [...new Set(documents.map(d => d.document_type))];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Document Library</h1>
          <p className="text-muted-foreground">
            Centralized repository - automatically linked to clients and filings
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/ClientDirectory">
            <Button variant="outline" size="sm">View by Client</Button>
          </Link>
          <Button onClick={() => setShowUploader(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            className="flex-1 p-2 border rounded-md"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types ({documents.length})</option>
            {docTypes.map(type => (
              <option key={type} value={type}>
                {type} ({documents.filter(d => d.document_type === type).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map(doc => {
          const client = clients.find(c => c.id === doc.client_id);
          return (
            <DocumentCard
              key={doc.id}
              document={doc}
              clientName={client?.legal_name || 'Unknown Client'}
              onView={(document) => window.open(document.file_url, '_blank')}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      {filteredDocs.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No Documents Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search term' : 'Upload your first document'}
            </p>
            <Button onClick={() => setShowUploader(true)} className="bg-navy hover:bg-navy-light">
              <FileUp className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <DocumentUploader onComplete={() => setShowUploader(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}