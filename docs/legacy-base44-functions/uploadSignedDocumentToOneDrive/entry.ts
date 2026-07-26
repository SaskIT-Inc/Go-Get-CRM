import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signature_id } = await req.json();

    if (!signature_id) {
      return Response.json({ error: 'Missing signature_id' }, { status: 400 });
    }

    // Fetch signature details
    const signature = await base44.asServiceRole.entities.Signature.get(signature_id);
    
    if (!signature || signature.status !== 'signed') {
      return Response.json({ error: 'Signature not found or not signed' }, { status: 404 });
    }

    // Fetch document details
    const document = await base44.asServiceRole.entities.Document.get(signature.document_id);
    
    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch service filing to get client folder structure
    const serviceFiling = await base44.asServiceRole.entities.ServiceFiling.get(signature.service_filing_id);
    
    if (!serviceFiling) {
      return Response.json({ error: 'Service filing not found' }, { status: 404 });
    }

    // Get OneDrive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    // Construct OneDrive folder path: /Clients/{ClientID}/{ServiceFilingID}/Signed Documents/
    const folderPath = `/Clients/${serviceFiling.client_id}/${signature.service_filing_id}/Signed Documents`;

    // Upload signed document to OneDrive
    const fileName = `${document.document_name || document.file_name}_SIGNED_${new Date().toISOString().split('T')[0]}.pdf`;

    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${folderPath}/${fileName}:/content`;

    // Fetch the signed document from storage
    const signedDocUrl = signature.signed_document_url;
    
    if (!signedDocUrl) {
      return Response.json({ error: 'No signed document URL available' }, { status: 400 });
    }

    const docResponse = await fetch(signedDocUrl);
    const docBuffer = await docResponse.arrayBuffer();

    // Upload to OneDrive
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf'
      },
      body: docBuffer
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('OneDrive upload error:', errorData);
      return Response.json({ error: 'Failed to upload to OneDrive' }, { status: uploadResponse.status });
    }

    // Update signature record with OneDrive upload confirmation
    await base44.asServiceRole.entities.Signature.update(signature_id, {
      onedrive_uploaded: true,
      onedrive_upload_date: new Date().toISOString(),
      onedrive_path: folderPath
    });

    return Response.json({
      success: true,
      message: 'Signed document uploaded to OneDrive',
      file_name: fileName,
      folder_path: folderPath
    });

  } catch (error) {
    console.error('Error uploading signed document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});