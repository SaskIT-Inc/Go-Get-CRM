import { useState } from 'react';
import SendDocumentModal from './SendDocumentModal';

export function useSendDocument() {
  const [isOpen, setIsOpen] = useState(false);
  const [documentConfig, setDocumentConfig] = useState(null);

  const openSendDialog = (config) => {
    setDocumentConfig({
      documentType: config.documentType || 'document',
      documentData: config.documentData || {},
      clientEmail: config.clientEmail,
      clientName: config.clientName,
      documentFileName: config.documentFileName || 'Document'
    });
    setIsOpen(true);
  };

  const SendModal = documentConfig ? (
    <SendDocumentModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      {...documentConfig}
    />
  ) : null;

  return {
    openSendDialog,
    SendModal,
    isOpen
  };
}