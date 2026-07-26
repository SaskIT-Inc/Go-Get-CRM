import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUploader({ clientId, serviceFilingId, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => api.entities.DocumentType.list(),
  });
  const documentTypesByCategory = documentTypes
    .filter((d) => d.is_active !== false)
    .reduce((groups, docType) => {
      const category = docType.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(docType);
      return groups;
    }, {});

  const [formData, setFormData] = useState({
    document_type: '',
    folder: '',
    tax_year: new Date().getFullYear().toString(),
    description: '',
    tags: []
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await api.integrations.Core.UploadFile({ file });
      return result;
    },
    onSuccess: (uploadResult) => {
      createDocumentMutation.mutate(uploadResult);
    },
    onError: () => {
      toast.error('Failed to upload file');
    }
  });

  const createDocumentMutation = useMutation({
    mutationFn: (uploadResult) => {
      return api.entities.Document.create({
        client_id: clientId,
        service_filing_id: serviceFilingId,
        document_name: selectedFile.name,
        document_type: formData.document_type,
        file_url: uploadResult.file_url,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        folder: formData.folder,
        tax_year: formData.tax_year,
        description: formData.description,
        tags: formData.tags,
        status: 'Pending Review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clientId] });
      toast.success('Document uploaded successfully');
      setSelectedFile(null);
      setFormData({
        document_type: '',
        folder: '',
        tax_year: new Date().getFullYear().toString(),
        description: '',
        tags: []
      });
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to save document');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    if (!formData.document_type) {
      toast.error('Please select document type');
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const isUploading = uploadMutation.isPending || createDocumentMutation.isPending;

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div className="space-y-2">
        <Label>Select File</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            disabled={isUploading}
          />
          {selectedFile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <Label htmlFor="document_type">Document Type *</Label>
        <select
          id="document_type"
          value={formData.document_type}
          onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
          disabled={isUploading}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
        >
          <option value="">Select type...</option>
          {Object.entries(documentTypesByCategory).map(([category, types]) => (
            <optgroup key={category} label={category}>
              {types.map((docType) => (
                <option key={docType.id} value={docType.name}>
                  {docType.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {documentTypes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No document types configured yet — add some under Settings &gt; Document Types.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Folder */}
        <div className="space-y-2">
          <Label htmlFor="folder">Folder</Label>
          <Input
            id="folder"
            value={formData.folder}
            onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
            placeholder="e.g., 2025 Tax Return"
            disabled={isUploading}
          />
        </div>

        {/* Tax Year */}
        <div className="space-y-2">
          <Label htmlFor="tax_year">Tax Year</Label>
          <Input
            id="tax_year"
            value={formData.tax_year}
            onChange={(e) => setFormData({ ...formData, tax_year: e.target.value })}
            placeholder="2025"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add notes about this document..."
          rows={3}
          disabled={isUploading}
        />
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className="w-full bg-yellow text-navy hover:bg-yellow-dark"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </>
        )}
      </Button>
    </div>
  );
}