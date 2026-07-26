import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only trigger on ServiceFiling creation
    if (event.type !== 'create' || event.entity_name !== 'ServiceFiling') {
      return Response.json({ success: true, message: 'Not applicable' });
    }

    const filing = data;

    // Define document checklists by service category
    const checklistTemplates = {
      'Personal Tax': [
        { document_name: 'T4 Slip - Employment', is_required: true, status: 'Missing' },
        { document_name: 'T5 Slip - Investment Income', is_required: false, status: 'Missing' },
        { document_name: 'RRSP Contribution Receipts', is_required: false, status: 'Missing' },
        { document_name: 'Medical Expense Receipts', is_required: false, status: 'Missing' },
        { document_name: 'Donation Receipts', is_required: false, status: 'Missing' }
      ],
      'Corporate Tax': [
        { document_name: 'Financial Statements', is_required: true, status: 'Missing' },
        { document_name: 'General Ledger', is_required: true, status: 'Missing' },
        { document_name: 'Trial Balance', is_required: true, status: 'Missing' },
        { document_name: 'Bank Statements', is_required: true, status: 'Missing' },
        { document_name: 'Payroll Records', is_required: false, status: 'Missing' }
      ],
      'Bookkeeping': [
        { document_name: 'Bank Statements', is_required: true, status: 'Missing' },
        { document_name: 'Credit Card Statements', is_required: true, status: 'Missing' },
        { document_name: 'Invoices', is_required: true, status: 'Missing' },
        { document_name: 'Expense Receipts', is_required: true, status: 'Missing' }
      ],
      'GST/HST': [
        { document_name: 'Sales Records', is_required: true, status: 'Missing' },
        { document_name: 'Purchase Invoices', is_required: true, status: 'Missing' },
        { document_name: 'GST/HST Collected Records', is_required: true, status: 'Missing' },
        { document_name: 'Input Tax Credit Records', is_required: true, status: 'Missing' }
      ],
      'Incorporation': [
        { document_name: 'Articles of Incorporation', is_required: true, status: 'Missing' },
        { document_name: 'Initial Directors Resolution', is_required: true, status: 'Missing' },
        { document_name: 'Share Certificate', is_required: true, status: 'Missing' },
        { document_name: 'Corporate Bylaws', is_required: true, status: 'Missing' }
      ]
    };

    // Get service details to determine category
    const service = await base44.asServiceRole.entities.Service.filter({
      service_name: filing.service_name
    });

    const serviceCategory = service[0]?.service_category || 'Personal Tax';
    const checklistItems = checklistTemplates[serviceCategory] || checklistTemplates['Personal Tax'];

    // Create document checklist
    await base44.asServiceRole.entities.DocumentChecklist.create({
      service_filing_id: filing.id,
      client_id: filing.client_id,
      checklist_items: checklistItems,
      completion_percentage: 0,
      all_documents_received: false,
      last_updated: new Date().toISOString()
    });

    // Update filing status to Documents Pending
    await base44.asServiceRole.entities.ServiceFiling.update(filing.id, {
      status: 'Documents Pending'
    });

    return Response.json({
      success: true,
      message: 'Document checklist created',
      itemCount: checklistItems.length
    });
  } catch (error) {
    console.error('Error generating checklist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});