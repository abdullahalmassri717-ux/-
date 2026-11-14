// Supabase "Send SMS" auth hook: Supabase makes the 6-digit login code and
// calls this function to deliver it. We deliver it on WhatsApp only (owner's
// rule: no SMS), through Twilio. Supabase still checks the code itself.
//
// How it reaches the person:
//   1. The code is kept for 10 minutes in whatsapp_login_codes. The login screen
//      shows "open WhatsApp and ask for the code": the person sends «رمز» to the
//      platform number and whatsapp-inbound replies with the code. No Meta
//      template or business verification is needed for that.
//   2. If the person wrote to us in the last 24 hours, we send it right away.
//   3. Once a WhatsApp authentication template is approved (TWILIO_OTP_CONTENT_SID),
//      we send it right away to everyone.
//
// Secrets (set by the "Set Twilio" workflow, never in the browser):
//   SEND_SMS_HOOK_SECRET     "v1,whsec_<base64>" shared with Supabase Auth
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM     the platform's WhatsApp sender, e.g. +970595353012
//   TWILIO_OTP_CONTENT_SID   optional: approved authentication template (HX...), {{1}} = code

import { adminClient } from '../_shared/http.ts';
import { CODE_MINUTES, codeText } from '../_shared/login-code.ts';

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Standard Webhooks signature check (what Supabase Auth hooks use). */
async function validSignature(req: Request, body: string): Promise<boolean> {
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace(/^v1,/, '').replace(/^whsec_/, '');
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sigs = req.headers.get('webhook-signature');
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', b64ToBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = bytesToB64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return sigs.split(' ').some((s) => s.split(',')[1] === expected);
}

function ok(): Response {
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function hookError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return hookError('Method not allowed', 405);
  const body = await req.text();
  if (!(await validSignature(req, body))) return hookError('Invalid signature', 401);

  let phone = '';
  let otp = '';
  try {
    const payload = JSON.parse(body);
    phone = String(payload?.user?.phone ?? '').replace(/[^\d]/g, '');
    otp = String(payload?.sms?.otp ?? '');
  } catch {
    return hookError('Bad payload', 400);
  }
  if (!phone || !otp) return hookError('Missing phone or code', 400);

  // Keep the code for 10 minutes: when the person sends «رمز» to the platform's
  // WhatsApp number, whatsapp-inbound replies with it (no Meta template needed).
  const db = adminClient();
  await db.from('whatsapp_login_codes').delete().lt('expires_at', new Date().toISOString());
  const { error: saveError } = await db.from('whatsapp_login_codes').upsert({
    phone,
    code: otp,
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (saveError) {
    console.error('Could not keep the login code', saveError.message);
    return hookError('Could not prepare the WhatsApp code');
  }

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = (Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '').replace(/[^\d]/g, '');
  const contentSid = Deno.env.get('TWILIO_OTP_CONTENT_SID');
  if (!sid || !token || !from) return ok(); // it waits for the person's «رمز» message

  // Send it right away when WhatsApp allows it: a plain reply inside the 24-hour
  // window after the person's last message, or the approved template if we have one.
  const { data: contact } = await db.from('whatsapp_contacts').select('last_inbound_at').eq('phone', phone).maybeSingle();
  const windowOpen = contact && Date.now() - new Date(contact.last_inbound_at).getTime() < 23 * 3600_000;
  const message: Record<string, string> | null = windowOpen
    ? { Body: codeText(otp) }
    : contentSid
      ? { ContentSid: contentSid, ContentVariables: JSON.stringify({ '1': otp }) }
      : null;
  if (!message) return ok();

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: `whatsapp:+${from}`, To: `whatsapp:+${phone}`, ...message }),
  });
  if (!res.ok) {
    // Not fatal: the code is kept, and the «رمز» message still gets it.
    const detail = await res.text().catch(() => '');
    console.error('Twilio WhatsApp send failed', res.status, detail.slice(0, 300));
  }
  return ok();
});
