// Supabase "Send SMS" auth hook: Supabase makes the 6-digit login code and
// calls this function to deliver it. We deliver it on WhatsApp only (owner's
// rule: no SMS), through Twilio, with the approved WhatsApp authentication
// template. Supabase still checks the code itself.
//
// Secrets (set by the "Set Twilio" workflow, never in the browser):
//   SEND_SMS_HOOK_SECRET     "v1,whsec_<base64>" shared with Supabase Auth
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM     the platform's WhatsApp sender, e.g. +970595353012
//   TWILIO_OTP_CONTENT_SID   approved authentication template (HX...), variable {{1}} = code

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
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

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = (Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '').replace(/[^\d]/g, '');
  const contentSid = Deno.env.get('TWILIO_OTP_CONTENT_SID');
  if (!sid || !token || !from || !contentSid) return hookError('WhatsApp is not connected yet');

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: `whatsapp:+${from}`,
      To: `whatsapp:+${phone}`,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify({ '1': otp }),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Twilio WhatsApp send failed', res.status, detail.slice(0, 300));
    return hookError('Could not send the WhatsApp code');
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
