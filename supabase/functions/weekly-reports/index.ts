// Weekly parent reports. Called every Thursday evening by the database's own
// schedule (pg_cron, see migration 20261111000300_weekly_reports.sql), with an
// internal token that lives only inside the database.
//
// 1. Makes sure this week's reports are prepared (one per student; one per
//    subject for a private teacher). Safe to run twice: a week is never doubled.
// 2. Sends every queued weekly report from the last 7 days on WhatsApp, when
//    WhatsApp Business is connected (secrets in ../_shared/whatsapp.ts).
//    Otherwise they stay queued and teachers can still send them by hand.
import { adminClient, json } from '../_shared/http.ts';
import { sendQueuedReports, whatsappReady } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = adminClient();

  const token = req.headers.get('x-daqa-cron') ?? '';
  const { data: ok } = await admin.rpc('check_weekly_reports_token', { p_token: token });
  if (!token || ok !== true) return json({ error: 'Forbidden' }, 403);

  const { data: queued, error: qErr } = await admin.rpc('queue_weekly_reports');
  if (qErr) console.error('queue_weekly_reports', qErr.message);

  if (!whatsappReady()) return json({ prepared: queued ?? 0, sent: 0, note: 'WhatsApp is not connected yet.' });

  const since = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from('reports')
      .select('id')
      .eq('kind', 'progress')
      .eq('status', 'queued')
      .gte('period_end', since)
      .range(from, from + 999);
    ids.push(...(data ?? []).map((r) => r.id as string));
    if (!data || data.length < 1000) break;
  }
  const sent = await sendQueuedReports(admin, ids);
  return json({ prepared: queued ?? 0, sent });
});
