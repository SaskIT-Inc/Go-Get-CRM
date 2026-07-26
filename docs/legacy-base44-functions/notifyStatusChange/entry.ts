import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    console.log(`Processing status change notification for ${event.entity_name} ${event.entity_id}`);

    // Handle Invoice Payment Notification
    if (event.entity_name === 'Invoice') {
      const invoice = data || await base44.asServiceRole.entities.Invoice.get(event.entity_id);
      
      // Only send if status changed to Paid
      if (old_data?.payment_status !== 'Paid' && invoice.payment_status === 'Paid') {
        const client = await base44.asServiceRole.entities.Client.get(invoice.client_id);
        
        if (client?.primary_email) {
          const emailContent = generateInvoicePaidEmail(client, invoice);
          
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: client.primary_email,
            subject: emailContent.subject,
            body: emailContent.body,
            from_name: 'GoGet Accounting'
          });

          console.log(`Paid invoice notification sent to ${client.primary_email} for invoice ${invoice.invoice_number}`);
        }
      }
    }

    // Handle Task Completion Notification
    if (event.entity_name === 'Task') {
      const task = data || await base44.asServiceRole.entities.Task.get(event.entity_id);
      
      // Only send if status changed to Complete
      if (old_data?.status !== 'Complete' && task.status === 'Complete') {
        let notificationEmails = [];

        // Notify assigned team member if applicable
        if (task.assigned_to) {
          notificationEmails.push({
            email: task.assigned_to,
            type: 'internal'
          });
        }

        // Notify client if task is linked to client
        if (task.client_id) {
          const client = await base44.asServiceRole.entities.Client.get(task.client_id);
          if (client?.primary_email) {
            notificationEmails.push({
              email: client.primary_email,
              type: 'client',
              clientName: client.legal_name
            });
          }
        }

        // Send notifications
        for (const recipient of notificationEmails) {
          const emailContent = recipient.type === 'client' 
            ? generateTaskCompletionClientEmail(recipient.clientName, task)
            : generateTaskCompletionInternalEmail(task);

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipient.email,
            subject: emailContent.subject,
            body: emailContent.body,
            from_name: 'GoGet Accounting'
          });

          console.log(`Task completion notification sent to ${recipient.email} for task ${task.title}`);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Notification processed successfully' 
    });

  } catch (error) {
    console.error('Error processing status change notification:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function generateInvoicePaidEmail(client, invoice) {
  return {
    subject: `Payment Received - Invoice #${invoice.invoice_number}`,
    body: `Dear ${client.legal_name},

Thank you for your payment! We have received your payment for the following invoice:

**Payment Confirmation:**
- Invoice Number: ${invoice.invoice_number}
- Amount Paid: $${(invoice.amount_paid || invoice.total_amount).toFixed(2)}
- Payment Date: ${new Date().toLocaleDateString()}
- Payment Method: ${invoice.payment_method || 'Credit Card'}

**Invoice Details:**
- Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
- Services: ${invoice.line_items?.map(item => item.description).join(', ') || 'Services rendered'}

Your account is now up to date. If you have any questions or need a receipt, please let us know.

Thank you for your business!

Best regards,
GoGet Accounting Team
${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}`
  };
}

function generateTaskCompletionClientEmail(clientName, task) {
  return {
    subject: `Task Complete: ${task.title}`,
    body: `Dear ${clientName},

Great news! We have successfully completed the following task for your account:

**Task Completion Confirmation:**
- Task: ${task.title}
- Completed On: ${new Date().toLocaleDateString()}
- Priority: ${task.priority || 'Standard'}

**Description:**
${task.description || 'Service completed as requested'}

Next steps will be communicated shortly. If you have any questions or need additional information, please don't hesitate to reach out.

Thank you for your continued business!

Best regards,
GoGet Accounting Team`
  };
}

function generateTaskCompletionInternalEmail(task) {
  return {
    subject: `Task Completed: ${task.title}`,
    body: `Hi,

The following task has been marked as complete:

**Task Details:**
- Title: ${task.title}
- Status: Complete
- Priority: ${task.priority || 'Medium'}
- Completed: ${new Date().toLocaleDateString()}

**Description:**
${task.description || 'Task completed'}

If this task blocks other tasks or requires follow-up actions, please ensure those are scheduled.

Thanks,
GoGet Accounting System`
  };
}