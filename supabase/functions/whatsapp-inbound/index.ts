// Twilio calls this when someone sends a WhatsApp message to the platform number.
// If that number asked for a login code on the site in the last 10 minutes, we
// reply with the code. A reply to the person's own message needs no Meta
// template, so login works before the business is verified by Meta.
//
// Twilio signs every call (X-Twilio-Signature, HMAC-SHA1 with the auth token);
// anything without a valid signature is refused.
//
// Secrets: TWILIO_AUTH_TOKEN (set by the "Set Twilio" workflow).
// The sender's webhook is pointed here by Set Twilio ops=inbound.
import { adminClient } from '../_shared/http.ts';
import { codeText } from '../_shared/login-code.ts';

const SITE = 'dequa.study';

function bytesToB64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Twilio request validation: HMAC-SHA1 over the URL + sorted POST params. */
async function validTwilioSignature(url: string, params: URLSearchParams, signature: string | null): Promise<boolean> {
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!token || !signature) return false;
  const data = url + [...params.keys()].sort().map((k) => k + params.getAll(k).join('')).join('');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const expected = bytesToB64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return expected === signature;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function twiml(reply?: string): Response {
  const body = reply ? `<Message>${xmlEscape(reply)}</Message>` : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const params = new URLSearchParams(await req.text());
  // Twilio signs the public URL it was given, not the internal one this function sees.
  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-inbound`;
  if (!(await validTwilioSignature(publicUrl, params, req.headers.get('X-Twilio-Signature')))) {
    return new Response('Invalid signature', { status: 403 });
  }

  const phone = String(params.get('From') ?? '').replace(/[^\d]/g, '');
  if (!phone) return twiml();
  const text = String(params.get('Body') ?? '');

  const db = adminClient();
  await db.from('whatsapp_contacts').upsert({ phone, last_inbound_at: new Date().toISOString() });

  const { data: pending } = await db
    .from('whatsapp_login_codes')
    .select('code, expires_at')
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (pending) return twiml(codeText(pending.code));

  // Asked for a code without requesting one on the site first.
  if (/رمز|كود|code|otp/i.test(text)) {
    return twiml(`أهلاً بك في دقة. لطلب رمز الدخول: افتح ${SITE}، اكتب رقمك، ثم اضغط «افتح واتساب واطلب الرمز».`);
  }
  return twiml();
});
