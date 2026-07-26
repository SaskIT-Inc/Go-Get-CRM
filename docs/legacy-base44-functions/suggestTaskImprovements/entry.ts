import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { task_title, task_description, client_context } = await req.json();

    if (!task_title) {
      return Response.json({ error: 'Task title required' }, { status: 400 });
    }

    const prompt = `You are a CRM task optimization assistant. Analyze the following task and provide actionable suggestions for improvement.

Task Title: ${task_title}
${task_description ? `Description: ${task_description}` : ''}
${client_context ? `Client Context: ${client_context}` : ''}

Provide:
1. A more detailed, clear task description (if needed)
2. Suggested priority level (Low, Medium, High, Critical)
3. Estimated hours to complete
4. Key dependencies or prerequisites
5. Recommended sub-tasks to break this down

Format your response as a structured JSON object.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          improved_description: { type: 'string' },
          recommended_priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          estimated_hours: { type: 'number' },
          dependencies: { type: 'array', items: { type: 'string' } },
          sub_tasks: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    console.error('Error in suggestTaskImprovements:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});