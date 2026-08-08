import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import SignatureCanvas from '@/features/signatures/components/SignatureCanvas';

export default function SignatureModal({ filing, client, onClose }) {
  const [signatureData, setSignatureData] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const signature = await api.entities.Signature.create({
        client_id: client.id,
        service_filing_id: filing.id,
        signer_name: client.legal_name,
        signer_email: client.primary_email,
        signature_data: signatureData,
        signed_date: new Date().toISOString(),
        document_type: `${filing.service_name} Authorization`,
        consent_text: 'I authorize GoGet CRM to file on my behalf and agree to the terms.',
        is_valid: true
      });

      // Update filing status
      await api.entities.ServiceFiling.update(filing.id, {
        status: 'In Progress'
      });

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mySignatures']);
      queryClient.invalidateQueries(['myFilings']);
      onClose();
    }
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sign Authorization Form</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-2">Authorization Agreement</h3>
            <p className="text-sm text-muted-foreground">
              I, {client.legal_name}, authorize GoGet CRM and its representatives to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
              <li>• Prepare and file {filing.service_name} on my behalf</li>
              <li>• Communicate with the CRA regarding this filing</li>
              <li>• Access necessary tax information</li>
              <li>• Represent me in matters related to this filing</li>
            </ul>
          </div>

          <div>
            <Label className="mb-2 block">Your Signature</Label>
            <SignatureCanvas onSave={setSignatureData} />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={consentAgreed}
              onCheckedChange={setConsentAgreed}
            />
            <label htmlFor="consent" className="text-sm text-muted-foreground">
              I confirm that I have read and agree to the authorization terms above, and that the signature provided is legally binding.
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!signatureData || !consentAgreed || saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending ? 'Saving...' : 'Submit Signature'}
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