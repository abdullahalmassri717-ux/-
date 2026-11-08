// POST { reportIds } with the teacher's sign-in token.
// Sends queued parent reports on WhatsApp (WhatsApp Business Cloud API by Meta).
//
// Needs these secrets on the server (never in the browser):
//   WHATSAPP_TOKEN            permanent access token
//   WHATSAPP_PHONE_NUMBER_ID  the sender number id
//   WHATSAPP_REPORT_TEMPLATE  approved template name with ONE body variable {{1}}
//   WHATSAPP_TEMPLATE_LANG    template language code (default "ar")
// Without them the reports stay "queued" and the screen says WhatsApp is not connected yet.
import { adminClient, corsHeaders, json, userClient } from '../_shared/http.ts';

const GRAPH = 'https://graph.facebook.com/v21.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let ids: string[] = [];
  try {
    ids = ((await req.json()).reportIds ?? []).map(String).slice(0, 500);
  } catch {
    return json({ error: 'الطلب غير صالح.' }, 400);
  }
  if (!ids.length) return json({ sent: 0 });

  // Only reports the caller can see (Row Level Security).
  const { data: visible, error } = await userClient(req).from('reports').select('id').in('id', ids);
  if (error) return json({ error: 'ليس لديك صلاحية.' }, 403);
  const allowed = (visible ?? []).map((r) => r.id as string);

  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const template = Deno.env.get('WHATSAPP_REPORT_TEMPLATE');
  if (!token || !phoneId || !template) {
    return json({ sent: 0, error: 'التقارير محفوظة في قائمة الانتظار. إرسال واتساب الآلي لم يُفعَّل بعد على الخادم.' });
  }

  const admin = adminClient();
  const { data: reports } = await admin
    .from('reports')
    .select('id, recipient_phone, body, status')
    .in('id', allowed)
    .eq('status', 'queued');

  let sent = 0;
  for (const r of reports ?? []) {
    const text = String(r.body ?? '').replace(/\s*\n\s*/g, ' | ').replace(/ {4,}/g, ' ').slice(0, 1000);
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(r.recipient_phone).replace(/^\+/, ''),
        type: 'template',
        template: {
          name: template,
          language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'ar' },
          components: [{ type: 'body', parameters: [{ type: 'text', text }] }],
        },
      }),
    });
    if (res.ok) {
      sent++;
      await admin.from('reports').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', r.id);
    } else {
      const detail = await res.text().catch(() => '');
      await admin.from('reports').update({ status: 'failed', error: detail.slice(0, 500) }).eq('id', r.id);
    }
  }
  return json({ sent });
});
