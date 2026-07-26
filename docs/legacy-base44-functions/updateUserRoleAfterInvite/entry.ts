import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins can call this
    const user = await base44.auth.me();
    if (!user || !['admin', 'director', 'cem'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, role, page_access, job_title } = await req.json();

    if (!email || !role) {
      return Response.json({ error: 'Missing email or role' }, { status: 400 });
    }

    // Find the user by email
    const users = await base44.asServiceRole.entities.User.filter({ email });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found — they may not have accepted the invite yet' }, { status: 404 });
    }

    const targetUser = users[0];

    // Update role, page_access, job_title
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      role,
      page_access: page_access || [],
      job_title: job_title || ''
    });

    return Response.json({ success: true, updated: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});