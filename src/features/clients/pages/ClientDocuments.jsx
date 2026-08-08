import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Filter,
  Upload,
  FolderOpen,
  FileText,
  Calendar
} from 'lucide-react';
import DocumentUploader from '@/features/documents/components/DocumentUploader';
import DocumentCard from '@/features/documents/components/DocumentCard';
import { toast } from 'sonner';

export default function ClientDocuments() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.filter({ status: 'Active' })
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => api.entities.DocumentType.list(),
  });
  const categoryByName = documentTypes.reduce((map, dt) => {
    map[dt.name] = dt.category || 'Other';
    return map;
  }, {});
  const categories = [...new Set(documentTypes.map((dt) => dt.category || 'Other'))];

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedClient?.id],
    queryFn: () =>
      selectedClient
        ? api.entities.Document.filter({ client_id: selectedClient.id })
        : Promise.resolve([]),
    enabled: !!selectedClient
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => api.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    }
  });

  const handleDelete = (document) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.folder?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const docCategory = categoryByName[doc.document_type];
    const matchesType =
      filterType === 'all' ||
      (docCategory ? docCategory === filterType : doc.document_type.includes(filterType));
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group by folder
  const documentsByFolder = filteredDocuments.reduce((acc, doc) => {
    const folder = doc.folder || 'Uncategorized';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(doc);
    return acc;
  }, {});

  // Stats
  const totalDocuments = documents.length;
  const pendingReview = documents.filter(d => d.status === 'Pending Review').length;
  const currentYear = new Date().getFullYear().toString();
  const currentYearDocs = documents.filter(d => d.tax_year === currentYear).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Document Management</h1>
        <p className="text-muted-foreground">
          Upload and manage client documents, tax slips, and receipts
        </p>
      </div>

      {/* Client Selection */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-navy">Select Client</label>
            <select
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setSelectedClient(client);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value="">Choose a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.legal_name} - {client.primary_email}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {!selectedClient ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">Select a Client</h3>
            <p className="text-muted-foreground">
              Choose a client from the dropdown above to view and manage their documents
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-3xl font-bold text-navy">{totalDocuments}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-dark">{pendingReview}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{currentYear} Documents</p>
                <p className="text-3xl font-bold text-navy">{currentYearDocs}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-yellow/10">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Quick Upload</p>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="w-full bg-yellow text-navy hover:bg-yellow-dark gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={filterType} onValueChange={setFilterType}>
                  <TabsList className="bg-muted">
                    <TabsTrigger value="all">All Types</TabsTrigger>
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                  <TabsList className="bg-muted">
                    <TabsTrigger value="all">All Status</TabsTrigger>
                    <TabsTrigger value="Pending Review">Pending</TabsTrigger>
                    <TabsTrigger value="Processed">Processed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Documents by Folder */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-navy mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload documents for {selectedClient.legal_name}
                </p>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-yellow text-navy hover:bg-yellow-dark"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.keys(documentsByFolder).map(folder => (
                <div key={folder}>
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="w-5 h-5 text-navy" />
                    <h2 className="text-xl font-bold text-navy">{folder}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({documentsByFolder[folder].length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentsByFolder[folder].map(doc => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload documents for {selectedClient?.legal_name}
            </DialogDescription>
          </DialogHeader>
          <DocumentUploader
            clientId={selectedClient?.id}
            onSuccess={() => setShowUploadDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}