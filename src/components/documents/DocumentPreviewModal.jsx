import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, ZoomIn, ZoomOut, RotateCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DocumentPreviewModal({ document, clientName, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!document) return null;

  const fileUrl = document.file_url;
  const fileType = document.file_type || '';
  const fileName = document.document_name;

  const isPDF = fileType.includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf');
  const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileUrl);

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate">{fileName}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{document.document_type}</Badge>
                {clientName && <Badge variant="secondary">{clientName}</Badge>}
                {document.tax_year && <Badge variant="secondary">Tax Year: {document.tax_year}</Badge>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        {(isPDF || isImage) && (
          <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div className="h-full flex items-center justify-center">
            {isPDF ? (
              <iframe
                src={`${fileUrl}#view=FitH`}
                className="w-full h-full bg-white rounded-lg shadow-lg"
                title={fileName}
              />
            ) : isImage ? (
              <div className="max-w-full max-h-full flex items-center justify-center">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className={cn(
                    "max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white",
                    "transition-transform duration-200"
                  )}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Preview Not Available
                </h3>
                <p className="text-slate-500 mb-4">
                  This file type cannot be previewed in the browser
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => window.open(fileUrl, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with metadata */}
        {document.description && (
          <div className="px-6 py-4 border-t bg-slate-50">
            <p className="text-sm text-muted-foreground">
              <strong>Description:</strong> {document.description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}