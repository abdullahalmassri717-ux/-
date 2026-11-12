// POST { reportIds } with the teacher's sign-in token.
// Sends queued parent reports on WhatsApp. The secrets it needs are listed in
// ../_shared/whatsapp.ts. Without them the reports stay "queued" and the screen
// says WhatsApp is not connected yet.
import { adminClient, corsHeaders, json, userClient } from '../_shared/http.ts';
import { sendQueuedReports, whatsappReady } from '../_shared/whatsapp.ts';

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

  if (!whatsappReady()) {
    return json({ sent: 0, error: 'التقارير محفوظة في قائمة الانتظار. إرسال واتساب الآلي لم يُفعَّل بعد على الخادم.' });
  }
  return json({ sent: await sendQueuedReports(adminClient(), allowed) });
});
