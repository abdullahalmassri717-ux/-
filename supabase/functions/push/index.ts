// Phone/browser notifications (Web Push).
//   POST {action:'key'}   anyone: the public key the browser needs to subscribe.
//                          The key pair is made the first time and kept in the database.
//   POST {action:'test'}  signed-in person: sends a test notification to their own devices.
//   POST (x-daqa-cron)     the database schedule (every 10 minutes, daytime only):
//                          sends the notifications that are not pushed yet.
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, corsHeaders, json, logFunctionError, userClient } from '../_shared/http.ts';
import { generateVapidKeys, sendPush, type VapidKeys } from '../_shared/webpush.ts';

const SUBJECT = 'https://dequa.study';

async function vapidKeys(admin: SupabaseClient): Promise<VapidKeys> {
  const { data, error } = await admin.rpc('push_vapid_keys', { p_new: null });
  if (error) throw new Error(error.message);
  if (data) return JSON.parse(data as string) as VapidKeys;
  // First time: make the pair. If two requests race, the database keeps the first.
  const fresh = await generateVapidKeys();
  const { data: kept, error: e2 } = await admin.rpc('push_vapid_keys', { p_new: JSON.stringify(fresh) });
  if (e2) throw new Error(e2.message);
  return JSON.parse(kept as string) as VapidKeys;
}

type PendingRow = {
  notification_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function sendPending(admin: SupabaseClient): Promise<{ sent: number; failed: number }> {
  const { data, error } = await admin.rpc('claim_pending_pushes', { p_limit: 200 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PendingRow[];
  if (rows.length === 0) return { sent: 0, failed: 0 };
  const keys = await vapidKeys(admin);
  let sent = 0;
  let failed = 0;
  // A few at a time, so one slow push service doesn't hold up everything.
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows.slice(i, i + 10).map(async (r) => {
        try {
          const res = await sendPush(
            r,
            { title: r.title, body: r.body ?? '', url: r.link ?? '/', tag: r.kind, id: r.notification_id },
            keys,
            SUBJECT,
            { topic: r.kind },
          );
          await admin.rpc('record_push_result', { p_subscription: r.subscription_id, p_ok: res.ok, p_gone: res.gone });
          if (res.ok) sent++;
          else {
            failed++;
            if (!res.gone) console.warn('push failed', res.status, new URL(r.endpoint).host);
          }
        } catch (e) {
          failed++;
          console.warn('push error', e);
          await admin.rpc('record_push_result', { p_subscription: r.subscription_id, p_ok: false, p_gone: false });
        }
      }),
    );
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = adminClient();

  try {
    const cronToken = req.headers.get('x-daqa-cron');
    if (cronToken !== null) {
      const { data: ok } = await admin.rpc('check_weekly_reports_token', { p_token: cronToken });
      if (!cronToken || ok !== true) return json({ error: 'Forbidden' }, 403);
      return json(await sendPending(admin));
    }

    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === 'key') {
      const keys = await vapidKeys(admin);
      return json({ publicKey: keys.publicKey });
    }

    if (body.action === 'test') {
      const { data: auth } = await userClient(req).auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return json({ error: 'سجّل الدخول أولاً' }, 401);
      const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
      if (!subs?.length) return json({ error: 'لا يوجد جهاز مفعّل للإشعارات بعد' }, 404);
      const keys = await vapidKeys(admin);
      let sent = 0;
      for (const s of subs) {
        const res = await sendPush(
          s,
          { title: 'الإشعارات تعمل ✓', body: 'هكذا ستصلك تنبيهات دقة على هذا الجهاز.', url: '/app', tag: 'test' },
          keys,
          SUBJECT,
          { ttlSeconds: 600 },
        );
        await admin.rpc('record_push_result', { p_subscription: s.id, p_ok: res.ok, p_gone: res.gone });
        if (res.ok) sent++;
      }
      return sent > 0 ? json({ sent }) : json({ error: 'تعذّر إرسال الإشعار. فعّل الإشعارات من جديد.' }, 502);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('push', e);
    await logFunctionError(admin, 'push', e);
    return json({ error: 'تعذّر إرسال الإشعارات الآن' }, 500);
  }
});
