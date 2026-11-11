// Sends queued parent reports on WhatsApp (WhatsApp Business Cloud API by Meta).
//
// Needs these secrets on the server (never in the browser):
//   WHATSAPP_TOKEN            permanent access token
//   WHATSAPP_PHONE_NUMBER_ID  the sender number id
//   WHATSAPP_REPORT_TEMPLATE  approved template name with ONE body variable {{1}}
//   WHATSAPP_TEMPLATE_LANG    template language code (default "ar")
// Without them the reports stay "queued".
import type { SupabaseClient } from '@supabase/supabase-js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function whatsappReady(): boolean {
  return Boolean(Deno.env.get('WHATSAPP_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') && Deno.env.get('WHATSAPP_REPORT_TEMPLATE'));
}

/** A template variable may not hold new lines or long runs of spaces, and has a length limit. */
export function templateText(body: string): string {
  const flat = String(body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' | ')
    .replace(/ {4,}/g, ' ');
  return flat.length > 1000 ? `${flat.slice(0, 997)}...` : flat;
}

/** Sends the given queued reports with the admin client and records the result on each row. */
export async function sendQueuedReports(admin: SupabaseClient, ids: string[]): Promise<number> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const template = Deno.env.get('WHATSAPP_REPORT_TEMPLATE');
  if (!token || !phoneId || !template || !ids.length) return 0;

  let sent = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data: reports } = await admin
      .from('reports')
      .select('id, recipient_phone, body, status')
      .in('id', ids.slice(i, i + 200))
      .eq('status', 'queued');
    for (const r of reports ?? []) {
      if (!r.recipient_phone) continue;
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
            components: [{ type: 'body', parameters: [{ type: 'text', text: templateText(String(r.body ?? '')) }] }],
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
  }
  return sent;
}
