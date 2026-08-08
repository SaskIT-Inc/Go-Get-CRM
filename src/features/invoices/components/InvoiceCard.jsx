import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Download, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const statusColors = {
  'Pending': 'bg-yellow/10 text-yellow-dark border-yellow/20',
  'Paid': 'bg-green-500/10 text-green-700 border-green-500/20',
  'Partial': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'Overdue': 'bg-red/10 text-red border-red/20'
};

export default function InvoiceCard({ invoice, client, onView, onRecordPayment }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = invoice.payment_status !== 'Paid' && 
    new Date(invoice.due_date) < new Date();

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-navy" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-navy text-lg mb-1">
                {invoice.invoice_number}
              </h3>
              <p className="text-sm text-muted-foreground">
                {client?.legal_name || 'Loading...'}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`${statusColors[invoice.payment_status]} border`}
          >
            {invoice.payment_status}
          </Badge>
        </div>

        {/* Amount Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
            <p className="text-lg font-bold text-navy">
              ${invoice.total_amount?.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
            <p className={`text-lg font-bold ${invoice.balance_due > 0 ? 'text-red' : 'text-green-600'}`}>
              ${invoice.balance_due?.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Issued:</span>
            <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Due:</span>
            <span className={`font-medium ${isOverdue ? 'text-red' : ''}`}>
              {formatDate(invoice.due_date)}
            </span>
            {isOverdue && (
              <AlertCircle className="w-4 h-4 text-red ml-auto" />
            )}
          </div>
          {invoice.payment_date && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">Paid:</span>
              <span className="font-medium text-green-600">
                {formatDate(invoice.payment_date)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(invoice)}
            className="flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          {invoice.payment_status !== 'Paid' && (
            <Button
              size="sm"
              onClick={() => onRecordPayment(invoice)}
              className="flex-1 bg-yellow text-navy hover:bg-yellow-dark"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Record Payment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}