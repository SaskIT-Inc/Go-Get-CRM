import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all users, tasks, and clients as service role (scheduled job, no end-user auth)
    const [users, tasks, clients] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.Client.list(),
    ]);

    const now = new Date();
    const todayStr = toDateStr(now);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = toDateStr(weekEnd);

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) { skipped++; continue; }

      // Tasks assigned to this user that are not complete
      const myTasks = tasks.filter(
        t => t.assigned_to === user.email && t.status !== 'Complete'
      );

      if (myTasks.length === 0) { skipped++; continue; }

      // Today's tasks: due today or overdue
      const todayTasks = myTasks.filter(t => {
        if (!t.due_date) return false;
        return t.due_date <= todayStr;
      });

      // This week's tasks: due within the next 7 days (excludes today/overdue)
      const weekTasks = myTasks.filter(t => {
        if (!t.due_date) return false;
        return t.due_date > todayStr && t.due_date <= weekEndStr;
      });

      // No upcoming tasks at all → skip
      if (todayTasks.length === 0 && weekTasks.length === 0) { skipped++; continue; }

      const clientMap = {};
      clients.forEach(c => { clientMap[c.id] = c.legal_name || c.primary_contact_name || 'Client'; });

      const emailBody = buildEmailBody(
        user.full_name || user.email,
        todayTasks,
        weekTasks,
        clientMap,
        todayStr
      );

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `📋 Your Daily Task Digest – ${formatDisplayDate(now)}`,
        body: emailBody,
        from_name: 'GoGet CRM'
      });

      sent++;
      console.log(`Sent digest to ${user.email} (today: ${todayTasks.length}, week: ${weekTasks.length})`);
    }

    console.log(`Daily digest complete. Sent: ${sent}, Skipped: ${skipped}`);
    return Response.json({ ok: true, sent, skipped });

  } catch (error) {
    console.error('sendDailyTaskDigest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

function priorityEmoji(p) {
  if (p === 'Critical') return '🔴';
  if (p === 'High')     return '🟠';
  if (p === 'Medium')   return '🟡';
  return '🔵';
}

function groupByPriority(taskList) {
  const order = ['Critical', 'High', 'Medium', 'Low'];
  const groups = {};
  taskList.forEach(t => {
    const p = t.priority || 'Medium';
    if (!groups[p]) groups[p] = [];
    groups[p].push(t);
  });
  return order.filter(p => groups[p]).map(p => ({ priority: p, tasks: groups[p] }));
}

function renderTaskRows(taskList, clientMap, todayStr) {
  if (taskList.length === 0) return '<p style="color:#6b7280;font-style:italic;margin:0 0 8px">No tasks in this category.</p>';

  const groups = groupByPriority(taskList);
  let html = '';

  for (const group of groups) {
    html += `<p style="margin:12px 0 4px;font-size:13px;font-weight:700;color:#374151;">
      ${priorityEmoji(group.priority)} ${group.priority} Priority
    </p>`;

    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">';
    html += `<tr style="background:#f3f4f6;font-size:12px;color:#6b7280;">
      <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Task</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Client</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Due</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;">Status</th>
    </tr>`;

    for (const task of group.tasks) {
      const isOverdue = task.due_date && task.due_date < todayStr;
      const dueBg = isOverdue ? '#fee2e2' : 'transparent';
      const dueColor = isOverdue ? '#dc2626' : '#374151';
      const clientName = task.client_id ? (clientMap[task.client_id] || '—') : '—';

      html += `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:7px 8px;font-size:13px;color:#111827;">${task.title}</td>
        <td style="padding:7px 8px;font-size:13px;color:#6b7280;">${clientName}</td>
        <td style="padding:7px 8px;font-size:13px;background:${dueBg};color:${dueColor};">${task.due_date ? formatDate(task.due_date) : '—'}${isOverdue ? ' ⚠️' : ''}</td>
        <td style="padding:7px 8px;font-size:13px;color:#6b7280;">${task.status}</td>
      </tr>`;
    }

    html += '</table>';
  }
  return html;
}

function buildEmailBody(userName, todayTasks, weekTasks, clientMap, todayStr) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#7c3aed);border-radius:12px;padding:24px 28px;margin-bottom:20px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">📋 Daily Task Digest</h1>
      <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Hi ${userName} — here's your task summary for today</p>
    </div>

    <!-- Today's Tasks -->
    <div style="background:#ffffff;border-radius:10px;padding:20px 24px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e3a8a;display:flex;align-items:center;gap:8px;">
        🗓️ Today's Tasks
        <span style="font-size:12px;font-weight:600;background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:999px;">${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''}</span>
      </h2>
      ${renderTaskRows(todayTasks, clientMap, todayStr)}
    </div>

    <!-- This Week's Tasks -->
    <div style="background:#ffffff;border-radius:10px;padding:20px 24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e3a8a;">
        📅 This Week's Tasks
        <span style="font-size:12px;font-weight:600;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:999px;margin-left:8px;">${weekTasks.length} task${weekTasks.length !== 1 ? 's' : ''}</span>
      </h2>
      ${renderTaskRows(weekTasks, clientMap, todayStr)}
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0;">
      GoGet CRM · This digest is sent daily at 6:00 AM
    </p>

  </div>
</body>
</html>`;
}