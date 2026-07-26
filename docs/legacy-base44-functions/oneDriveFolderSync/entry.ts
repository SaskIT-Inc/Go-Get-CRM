import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'Director') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { accessToken, connectionConfig } = await base44.asServiceRole.connectors.getConnection('one_drive');

    if (!accessToken) {
      return Response.json({ error: 'OneDrive not connected' }, { status: 400 });
    }

    // Fetch all clients
    const clients = await base44.asServiceRole.entities.Client.list();

    // Root folder name for CRM
    const rootFolderName = 'GoGet-CRM-Clients';

    // Get or create root folder
    let rootFolderId = await getOrCreateFolder(accessToken, null, rootFolderName);

    const results = [];

    // Create folder per client
    for (const client of clients) {
      const clientFolderName = `${client.company_name || client.contact_name}`;
      const clientFolderId = await getOrCreateFolder(accessToken, rootFolderId, clientFolderName);

      // Create subfolders for different filing types
      const subfolders = ['Filings', 'Documents', 'Correspondence', 'Signatures'];
      for (const subfolder of subfolders) {
        await getOrCreateFolder(accessToken, clientFolderId, subfolder);
      }

      // Store folder mapping in client record (optional custom field)
      results.push({
        clientId: client.id,
        clientName: clientFolderName,
        folderId: clientFolderId,
        status: 'created'
      });
    }

    return Response.json({
      success: true,
      message: 'Client folder structure created in OneDrive',
      rootFolderId,
      clientFolders: results,
      totalCreated: results.length
    });
  } catch (error) {
    console.error('OneDrive Folder Sync Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

// Helper: Get or create folder
async function getOrCreateFolder(accessToken, parentFolderId, folderName) {
  try {
    // Search for existing folder
    let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
    if (parentFolderId) {
      url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();
    const items = data.value || [];
    const existingFolder = items.find((item) => item.name === folderName && item.folder);

    if (existingFolder) {
      return existingFolder.id;
    }

    // Create new folder
    const createUrl = parentFolderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`
      : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

    const createResponse = await fetch(createUrl, {
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

    const newFolder = await createResponse.json();
    return newFolder.id;
  } catch (error) {
    console.error(`Error managing folder ${folderName}:`, error);
    throw error;
  }
}