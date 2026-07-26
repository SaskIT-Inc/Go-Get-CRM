import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from './SignatureCanvas';
import { CheckCircle, FileSignature, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentSigningModal({ document, client, open, onClose }) {
  const [step, setStep] = useState(1);
  const [signerName, setSignerName] = useState(client?.primary_contact_name || '');
  const [consent, setConsent] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const queryClient = useQueryClient();

  const signMutation = useMutation({
    mutationFn: async (data) => {
      // Create signature record
      const signature = await api.entities.Signature.create({
        document_id: document.id,
        client_id: client.id,
        service_filing_id: document.service_filing_id,
        signer_name: data.signerName,
        signer_email: client.primary_email,
        signature_data: data.signatureData,
        signed_date: new Date().toISOString(),
        document_type: document.document_type,
        consent_text: data.consentText,
        ip_address: 'client_portal',
        is_valid: true
      });

      // Update document status to Signed
      await api.entities.Document.update(document.id, {
        status: 'Processed',
        is_verified: true,
        description: `${document.description || ''}\n\nSigned digitally on ${new Date().toLocaleDateString()} by ${data.signerName}`.trim()
      });

      // If linked to a service filing, update its status
      if (document.service_filing_id) {
        const filing = await api.entities.ServiceFiling.get(document.service_filing_id);
        
        // Move filing forward if it's waiting on documents
        if (filing.status === 'Documents Pending') {
          await api.entities.ServiceFiling.update(document.service_filing_id, {
            status: 'In Progress'
          });
        }
      }

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientDocuments']);
      queryClient.invalidateQueries(['clientFilings']);
      toast.success('Document signed successfully!');
      setStep(3);
    },
    onError: (error) => {
      toast.error('Failed to sign document: ' + error.message);
    }
  });

  const handleSignature = (data) => {
    setSignatureData(data);
    setStep(2);
  };

  const handleConfirm = () => {
    const consentText = `I, ${signerName}, hereby consent to electronically sign this document (${document.document_name}). I understand that my electronic signature has the same legal effect as a handwritten signature.`;
    
    signMutation.mutate({
      signerName,
      signatureData,
      consentText
    });
  };

  const handleClose = () => {
    setStep(1);
    setSignatureData(null);
    setConsent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-navy" />
            Electronic Signature
          </DialogTitle>
          <DialogDescription>
            Sign {document?.document_name} digitally
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-navy mb-2">Document Details</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Document:</span> {document?.document_name}</p>
                <p><span className="font-medium">Type:</span> {document?.document_type}</p>
                {document?.tax_year && <p><span className="font-medium">Tax Year:</span> {document?.tax_year}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signerName">Full Legal Name *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>

            <div className="border-2 border-yellow/30 bg-yellow/5 rounded-lg p-4">
              <h4 className="font-semibold text-navy mb-2">Legal Notice</h4>
              <p className="text-sm text-muted-foreground mb-3">
                By signing this document electronically, you agree that your electronic signature 
                is the legal equivalent of your manual signature and has the same legal effect. 
                You consent to be legally bound by the document's terms and conditions.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={setConsent}
                />
                <Label htmlFor="consent" className="text-sm cursor-pointer">
                  I have read and agree to the terms of electronic signature
                </Label>
              </div>
            </div>

            <SignatureCanvas
              onSave={handleSignature}
              onCancel={handleClose}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!consent || !signerName.trim()}
                className="bg-navy hover:bg-navy-light"
              >
                Continue to Review
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-semibold text-navy mb-3">Review Your Signature</h4>
              
              <div className="bg-white border-2 border-navy/20 rounded-lg p-4 mb-4">
                <img src={signatureData} alt="Signature" className="max-w-full h-auto" />
              </div>

              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Signer:</span> {signerName}</p>
                <p><span className="font-medium">Document:</span> {document?.document_name}</p>
                <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>

            <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-4">
              <p className="text-sm text-navy">
                <strong>Final Confirmation:</strong> By clicking "Sign Document" below, you confirm that 
                the signature above is accurate and you agree to electronically sign this document.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={signMutation.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={signMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Sign Document
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-navy mb-2">Document Signed Successfully!</h3>
            <p className="text-muted-foreground mb-6">
              Your signature has been recorded and the document has been marked as signed.
            </p>
            <Button onClick={handleClose} className="bg-navy hover:bg-navy-light">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}