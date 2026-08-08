import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, MessageCircle, Copy, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SendDocumentModal({
  isOpen,
  onClose,
  documentType,
  documentData,
  clientEmail,
  clientName,
  documentFileName
}) {
  const [sendMethod, setSendMethod] = useState('email');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate template based on document type
  const generateTemplate = () => {
    const templates = {
      estimate: {
        subject: `Estimate for Your Review - ${documentData?.estimate_number || 'REQ'}`,
        body: `Dear ${clientName || 'Valued Client'},

We have prepared an estimate for your review and approval.

**Estimate Details:**
- Estimate Number: ${documentData?.estimate_number || 'N/A'}
- Total Amount: $${(documentData?.total_amount || 0).toFixed(2)}
- Valid Until: ${documentData?.valid_until || 'Upon agreement'}
- Description: ${documentData?.description || ''}

**Next Steps:**
Please review the attached estimate and confirm your approval. Once you approve, we can proceed with implementation.

If you have any questions or need clarification on any items, please don't hesitate to reach out.

Thank you for considering our services!

Best regards,
GoGet Accounting Team`
      },
      retainer: {
        subject: `Retainer Agreement for Your Signature - ${documentData?.retainer_number || 'RET'}`,
        body: `Dear ${clientName || 'Valued Client'},

We are pleased to present our Retainer Agreement for your review and signature.

**Retainer Details:**
- Retainer Number: ${documentData?.retainer_number || 'N/A'}
- Monthly Fee: $${(documentData?.total_monthly_fee || 0).toFixed(2)}
- Annual Value: $${(documentData?.total_annual_fee || 0).toFixed(2)}
- Services Included: ${documentData?.services?.map(s => s.service_name).join(', ') || 'Professional services'}
- Start Date: ${documentData?.start_date || 'TBD'}

**What Happens Next:**
1. Review the agreement carefully
2. Sign electronically through the provided link
3. We'll process and confirm once signed

If you have any questions about the terms or services, please contact us.

Thank you for partnering with us!

Best regards,
GoGet Accounting Team`
      },
      taxdocument: {
        subject: `Tax Documentation Ready for Your Review - ${documentData?.service_name || 'TAX'}`,
        body: `Dear ${clientName || 'Valued Client'},

Your tax documentation for ${documentData?.filing_year || 'the specified year'} is ready for your review.

**Filing Details:**
- Service: ${documentData?.service_name || 'Tax Filing'}
- Tax Year: ${documentData?.filing_year || 'N/A'}
- Status: Ready for Review
- Required Action: Client signature/approval

**Important Documents:**
${documentData?.required_documents?.map(doc => `• ${doc}`).join('\n') || '• Please review attached documents'}

**Next Steps:**
1. Carefully review all documents
2. Verify accuracy of information
3. Sign and return by the deadline to ensure timely filing

**Filing Deadline:** ${documentData?.due_date || 'TBD'}

Please let us know if you have any questions or need to make any corrections.

Best regards,
GoGet Accounting Team`
      },
      form: {
        subject: `Form Ready for Completion - ${documentData?.form_name || 'FORM'}`,
        body: `Dear ${clientName || 'Valued Client'},

We have prepared the following form for your completion:

**Form Details:**
- Form Type: ${documentData?.form_name || 'N/A'}
- Reference: ${documentData?.reference || 'N/A'}
- Deadline: ${documentData?.due_date || 'TBD'}

**What You Need to Do:**
1. Download and review the attached form
2. Complete all required fields
3. Return signed/completed form to us

**Questions?**
If you need clarification on any fields or have questions, please contact us at your earliest convenience.

Thank you for your prompt attention to this matter!

Best regards,
GoGet Accounting Team`
      },
      document: {
        subject: `Document for Your Review - ${documentFileName || 'DOC'}`,
        body: `Dear ${clientName || 'Valued Client'},

Please find attached the document for your review.

**Document Details:**
- Document: ${documentFileName || 'N/A'}
- Date: ${new Date().toLocaleDateString()}

**Please Review:**
We kindly request that you review the attached document and provide feedback if necessary.

If you have any questions or need further information, please don't hesitate to contact us.

Thank you!

Best regards,
GoGet Accounting Team`
      }
    };

    const template = templates[documentType] || templates.document;
    setEmailSubject(template.subject);
    setEmailBody(template.body);
  };

  React.useEffect(() => {
    if (isOpen) {
      generateTemplate();
    }
  }, [isOpen, documentType]);

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Please fill in subject and body');
      return;
    }

    setIsSending(true);
    try {
      await api.functions.invoke('sendDocumentEmail', {
        to: clientEmail,
        subject: emailSubject,
        body: emailBody,
        documentType,
        documentFileName
      });
      toast.success('Email sent successfully!');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!emailBody.trim()) {
      toast.error('Please prepare a message');
      return;
    }

    setIsSending(true);
    try {
      await api.functions.invoke('sendDocumentWhatsApp', {
        clientName,
        clientEmail,
        message: emailBody,
        documentType,
        documentFileName
      });
      toast.success('WhatsApp message prepared! Opening WhatsApp Web...');
      onClose();
    } catch (error) {
      console.error('Error preparing WhatsApp:', error);
      toast.error('Failed to prepare WhatsApp message');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyEmail = () => {
    const fullEmail = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Email copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send {documentType === 'estimate' ? 'Estimate' : documentType === 'retainer' ? 'Retainer Agreement' : documentType === 'taxdocument' ? 'Tax Document' : 'Document'} to Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Sending to</p>
              <p className="font-semibold text-navy">{clientName}</p>
              <p className="text-sm text-muted-foreground">{clientEmail}</p>
            </CardContent>
          </Card>

          {/* Send Method Tabs */}
          <Tabs value={sendMethod} onValueChange={setSendMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy block mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-navy block mb-2">
                  Email Body
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Email'}
                </Button>
                <Button
                  onClick={generateTemplate}
                  variant="outline"
                  size="sm"
                >
                  Reset Template
                </Button>
              </div>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy block mb-2">
                  Message Preview
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  placeholder="Message for WhatsApp..."
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  💡 <strong>Tip:</strong> Click "Send via WhatsApp" to open WhatsApp Web with your pre-filled message. You can add the client's phone number and send.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {sendMethod === 'email' ? (
            <Button
              onClick={handleSendEmail}
              disabled={isSending}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSendWhatsApp}
              disabled={isSending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Send via WhatsApp
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}