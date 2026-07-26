import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filing_id, client_id } = await req.json();

    if (!filing_id || !client_id) {
      return Response.json(
        { error: 'filing_id and client_id are required' },
        { status: 400 }
      );
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    if (!accessToken) {
      return Response.json({ error: 'OneDrive not connected' }, { status: 400 });
    }

    // Fetch filing and client info
    const filing = await base44.asServiceRole.entities.ServiceFiling.get(filing_id);
    const client = await base44.asServiceRole.entities.Client.get(client_id);

    if (!filing || !client) {
      return Response.json({ error: 'Filing or Client not found' }, { status: 404 });
    }

    // Get client folder ID from root
    const rootFolderId = await findFolderByName(accessToken, 'GoGet-CRM-Clients');
    if (!rootFolderId) {
      return Response.json(
        { error: 'Client root folder not found. Run folder sync first.' },
        { status: 400 }
      );
    }

    const clientFolderName = client.company_name || client.contact_name;
    const clientFolderId = await findFolderByName(accessToken, clientFolderName, rootFolderId);

    if (!clientFolderId) {
      return Response.json(
        { error: `Client folder not found for ${clientFolderName}` },
        { status: 404 }
      );
    }

    // Determine filing type folder
    const filingTypeMap = {
      'T2 Corporate Tax': 'Filings',
      'GST/HST Filing': 'Filings',
      'PST Filing': 'Filings',
      'T4 Preparation & Filing': 'Filings',
      'Personal Tax Return': 'Filings'
    };

    const subfolderName = filingTypeMap[filing.filing_type] || 'Filings';
    const targetFolderId = await findFolderByName(accessToken, subfolderName, clientFolderId);

    if (!targetFolderId) {
      return Response.json(
        { error: `Target folder '${subfolderName}' not found` },
        { status: 404 }
      );
    }

    // Create filing folder within target folder
    const filingFolderName = `${filing.filing_type} - ${new Date(filing.created_date).toISOString().split('T')[0]}`;
    const filingFolderId = await getOrCreateFolder(accessToken, targetFolderId, filingFolderName);

    // Fetch related documents
    const documents = await base44.asServiceRole.entities.Document.filter({
      filing_id: filing_id
    });

    let uploadedCount = 0;

    // Upload documents to OneDrive
    for (const doc of documents) {
      if (doc.file_url) {
        try {
          const uploaded = await uploadFileToOneDrive(
            accessToken,
            filingFolderId,
            doc.file_url,
            doc.file_name || `Document-${doc.id}`
          );

          if (uploaded) {
            uploadedCount++;
          }
        } catch (docError) {
          console.error(`Failed to upload document ${doc.id}:`, docError);
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Filing synced to OneDrive',
      filing_id,
      client_name: clientFolderName,
      filing_folder: filingFolderName,
      documentsUploaded: uploadedCount,
      totalDocuments: documents.length
    });
  } catch (error) {
    console.error('Filing Sync to OneDrive Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper: Find folder by name within parent
async function findFolderByName(accessToken, folderName, parentFolderId = null) {
  try {
    let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
    if (parentFolderId) {
      url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();
    const items = data.value || [];
    const folder = items.find((item) => item.name === folderName && item.folder);

    return folder ? folder.id : null;
  } catch (error) {
    console.error(`Error finding folder ${folderName}:`, error);
    return null;
  }
}

// Helper: Get or create folder
async function getOrCreateFolder(accessToken, parentFolderId, folderName) {
  try {
    // Check if already exists
    const existing = await findFolderByName(accessToken, folderName, parentFolderId);
    if (existing) return existing;

    // Create new folder
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    });

    const newFolder = await response.json();
    return newFolder.id;
  } catch (error) {
    console.error(`Error creating folder ${folderName}:`, error);
    throw error;
  }
}

// Helper: Upload file from URL to OneDrive
async function uploadFileToOneDrive(accessToken, folderId, fileUrl, fileName) {
  try {
    // Fetch file from URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // Upload to OneDrive
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    return true;
  } catch (error) {
    console.error(`Error uploading file ${fileName}:`, error);
    return false;
  }
}