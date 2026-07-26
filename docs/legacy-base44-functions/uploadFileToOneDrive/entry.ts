import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url, folder_path, file_name, client_id } = await req.json();

    if (!file_url || !file_name) {
      return Response.json({ error: 'file_url and file_name required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    // Download file from URL
    const fileResponse = await fetch(file_url);
    const fileBuffer = await fileResponse.arrayBuffer();

    // Determine folder structure
    const finalPath = folder_path || `GoGet CRM/Client Documents/${client_id || 'General'}`;

    // Upload to OneDrive
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${finalPath}/${file_name}:/content`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      throw new Error(`OneDrive upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();

    return Response.json({
      success: true,
      file_name: uploadResult.name,
      onedrive_id: uploadResult.id,
      web_url: uploadResult.webUrl
    });
  } catch (error) {
    console.error('Error in uploadFileToOneDrive:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});