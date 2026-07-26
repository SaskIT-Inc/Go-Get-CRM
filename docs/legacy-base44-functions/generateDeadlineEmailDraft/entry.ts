import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { task_id, client_id, task_title, due_date, filing_type, days_until_due } = await req.json();

    if (!task_id || !client_id) {
      return Response.json({ error: 'task_id and client_id required' }, { status: 400 });
    }

    // Fetch client and task details
    const [client, task] = await Promise.all([
      base44.entities.Client.filter({ id: client_id }).then(results => results[0]),
      base44.entities.Task.filter({ id: task_id }).then(results => results[0])
    ]);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const prompt = `You are a professional accounting firm account manager. Generate a personalized, friendly email draft to send to a client reminding them of an upcoming deadline.

Client Information:
- Name: ${client.legal_name || client.operating_name}
- Contact: ${client.primary_contact_name}
- Email: ${client.primary_email}

Task Details:
- Task: ${task_title}
- Filing Type: ${filing_type || 'Filing'}
- Due Date: ${due_date}
- Days Until Due: ${days_until_due}
${task.description ? `- Description: ${task.description}` : ''}

Requirements:
1. Keep the tone professional but friendly
2. Clearly state the deadline
3. Mention what documents or information might be needed
4. Provide a clear call-to-action
5. Include a line for the account manager's name/signature

Generate the email body only (no subject line in the body). Format it as a proper business email.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          email_body: { type: 'string' },
          subject_line: { type: 'string' },
          key_points: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Store draft in database
    const draft = await base44.asServiceRole.entities.EmailDraft.create({
      task_id,
      client_id,
      client_name: client.legal_name || client.operating_name,
      client_email: client.primary_email,
      subject_line: response.data.subject_line,
      email_body: response.data.email_body,
      key_points: response.data.key_points,
      status: 'draft',
      created_at: new Date().toISOString(),
      due_date
    });

    return Response.json({
      success: true,
      draft_id: draft.id,
      subject_line: response.data.subject_line,
      email_body: response.data.email_body
    });
  } catch (error) {
    console.error('Error in generateDeadlineEmailDraft:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});