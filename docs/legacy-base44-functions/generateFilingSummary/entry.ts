import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { filing_name, filing_year, status, documents = [], notes = '' } = await req.json();

    if (!filing_name) {
      return Response.json({ error: 'Filing name required' }, { status: 400 });
    }

    const prompt = `You are a tax and accounting filing expert. Generate a concise executive summary for the following filing.

Filing: ${filing_name}
Year: ${filing_year}
Status: ${status}
${documents.length > 0 ? `Documents Received: ${documents.join(', ')}` : 'Documents: None received yet'}
${notes ? `Additional Notes: ${notes}` : ''}

Provide:
1. A 2-3 sentence summary of the filing requirements
2. Key next steps (3-4 bullet points)
3. Estimated timeline to completion
4. Any risks or concerns to watch for

Be professional and concise.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          next_steps: { type: 'array', items: { type: 'string' } },
          estimated_timeline: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    console.error('Error in generateFilingSummary:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});