import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'director' && user?.role !== 'cem') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const invitations = [
      { email: 'bookkeeping@go-get.ca', name: 'Rezaul', role: 'user' },
      { email: 'info@ggpm.ca', name: 'Tinni', role: 'user' },
      { email: 'mazaman@go-get.ca', name: 'Suriya', role: 'user' },
      { email: 'kamalpreet@canesl.ca', name: 'Nitika', role: 'user' },
      { email: 'labib@saskits.ca', name: 'Labib', role: 'user' },
      { email: 'dm@saskits.ca', name: 'Urmi', role: 'user' },
      { email: 'aminapatuary6@gmail.com', name: 'Amina', role: 'user' }
    ];

    const results = [];
    for (const inv of invitations) {
      try {
        await base44.users.inviteUser(inv.email, inv.role);
        results.push({ email: inv.email, status: 'invited' });
      } catch (err) {
        results.push({ email: inv.email, status: 'failed', error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});