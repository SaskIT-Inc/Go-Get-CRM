import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  'Pending Review': 'bg-yellow/10 text-yellow-dark border-yellow/20',
  'Reviewed': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'Processed': 'bg-green-500/10 text-green-700 border-green-500/20',
  'Archived': 'bg-gray-500/10 text-gray-700 border-gray-500/20'
};

const typeIcons = {
  'Tax Slip': '📄',
  'Receipt': '🧾',
  'Bank Statement': '🏦',
  'Invoice': '📋',
  'Financial Statement': '💰',
  'Corporate Document': '🏢',
  'ID Document': '🪪',
  'Other': '📎'
};

export default function DocumentCard({ document, clientName, onView, onDelete }) {
  const getTypeIcon = (docType) => {
    for (const [key, icon] of Object.entries(typeIcons)) {
      if (docType.includes(key)) return icon;
    }
    return typeIcons.Other;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon & Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-3xl flex-shrink-0">
              {getTypeIcon(document.document_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-navy truncate mb-1">
                {document.document_name}
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                {document.document_type}
              </p>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                {document.file_size && (
                  <span>{formatFileSize(document.file_size)}</span>
                )}
                {document.tax_year && (
                  <span>• {document.tax_year}</span>
                )}
                {document.created_date && (
                  <span>• {formatDate(document.created_date)}</span>
                )}
              </div>

              {/* Tags & Folder */}
              <div className="flex flex-wrap gap-1">
                {document.folder && (
                  <Badge variant="secondary" className="text-xs bg-navy/5 text-navy">
                    📁 {document.folder}
                  </Badge>
                )}
                {document.is_verified && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <Badge variant="secondary" className={`${statusColors[document.status]} border flex-shrink-0`}>
            {document.status}
          </Badge>
        </div>

        {/* Description */}
        {document.description && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
            {document.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView?.(document)}
            className="flex-1 gap-1"
          >
            <Eye className="w-3 h-3" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = document.file_url;
              link.download = document.document_name;
              link.click();
            }}
            className="flex-1 gap-1"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(document)}
            className="text-red border-red hover:bg-red hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}