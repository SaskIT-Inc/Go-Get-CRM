import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can invite
    if (!['admin', 'director', 'cem'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, full_name, role } = await req.json();

    if (!email || !full_name || !role) {
      return Response.json({ error: 'Missing required fields: email, full_name, role' }, { status: 400 });
    }

    // Invite the user
    await base44.users.inviteUser(email, role);

    return Response.json({
      success: true,
      message: `Invited ${full_name} (${email}) as ${role}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});