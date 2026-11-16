// Sends queued parent reports on WhatsApp.
//
// Two ways to send, picked by which secrets are set (never in the browser):
// 1. Twilio (preferred, the same account sends the login codes):
//   TWILIO_ACCOUNT_SID         account id (starts with AC)
//   TWILIO_AUTH_TOKEN          account auth token
//   TWILIO_WHATSAPP_FROM       the approved WhatsApp sender, e.g. +970599000000
//   TWILIO_REPORT_CONTENT_SID  approved Content template (starts with HX) with ONE variable {{1}}
// 2. WhatsApp Business Cloud API by Meta directly:
//   WHATSAPP_TOKEN            permanent access token
//   WHATSAPP_PHONE_NUMBER_ID  the sender number id
//   WHATSAPP_REPORT_TEMPLATE  approved template name with ONE body variable {{1}}
//   WHATSAPP_TEMPLATE_LANG    template language code (default "ar")
// 3. When WhatsApp is not ready but SMS is (../_shared/sms.ts), each parent gets a
//    short text message with a link to the full report page (dequa.study/r/<code>).
// Without any of them the reports stay "queued".
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSms, smsReady } from './sms.ts';

const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://dequa.study').replace(/\/+$/, '');

const GRAPH = 'https://graph.facebook.com/v21.0';

function twilioReady(): boolean {
  return Boolean(
    Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') &&
      Deno.env.get('TWILIO_WHATSAPP_FROM') && Deno.env.get('TWILIO_REPORT_CONTENT_SID'),
  );
}

function metaReady(): boolean {
  return Boolean(Deno.env.get('WHATSAPP_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') && Deno.env.get('WHATSAPP_REPORT_TEMPLATE'));
}

export function whatsappReady(): boolean {
  return twilioReady() || metaReady();
}

/** True when reports can go out by WhatsApp or by SMS. */
export function messagingReady(): boolean {
  return whatsappReady() || smsReady();
}

/** One Arabic SMS part holds 70 characters; longer texts cost two messages. */
const SMS_ONE_PART = 70;

/**
 * The parent SMS, kept to ONE message (owner's rule): student's first + family
 * name, their 4-digit code, the school/teacher name when it still fits, and the
 * report link. The report page itself always shows the school name.
 */
export function reportSmsText(fullName: string, studentCode: string, orgName: string, shareCode: string): string {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : (parts[0] ?? '');
  const code = /^\d{4}$/.test(String(studentCode ?? '').trim()) ? ` (${String(studentCode).trim()})` : '';
  const org = String(orgName ?? '').trim();
  const link = `${SITE_URL}/r/${shareCode}`;
  const who = `${name}${code}`.trim();
  const options = [
    `تقرير ${who} - ${org}\n${link}`,
    `${who} - ${org}\n${link}`,
    `تقرير ${who}\n${link}`,
    `${who}\n${link}`,
  ].filter((t) => org || !t.includes(' - '));
  return options.find((t) => t.length <= SMS_ONE_PART) ?? options[options.length - 1];
}

function waNumber(phone: string): string {
  const digits = String(phone).replace(/[^\d]/g, '');
  return `whatsapp:+${digits}`;
}

/** Sends one report through Twilio. Returns null on success, else the error text. */
async function sendTwilio(phone: string, text: string): Promise<string | null> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const form = new URLSearchParams({
    From: waNumber(Deno.env.get('TWILIO_WHATSAPP_FROM')!),
    To: waNumber(phone),
    ContentSid: Deno.env.get('TWILIO_REPORT_CONTENT_SID')!,
    ContentVariables: JSON.stringify({ '1': text }),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  return res.ok ? null : await res.text().catch(() => `HTTP ${res.status}`);
}

/** Sends one report through Meta's Cloud API. Returns null on success, else the error text. */
async function sendMeta(phone: string, text: string): Promise<string | null> {
  const res = await fetch(`${GRAPH}/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: String(phone).replace(/[^\d]/g, ''),
      type: 'template',
      template: {
        name: Deno.env.get('WHATSAPP_REPORT_TEMPLATE'),
        language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'ar' },
        components: [{ type: 'body', parameters: [{ type: 'text', text }] }],
      },
    }),
  });
  return res.ok ? null : await res.text().catch(() => `HTTP ${res.status}`);
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
  if (!messagingReady() || !ids.length) return 0;
  const bySms = !whatsappReady();
  const send = twilioReady() ? sendTwilio : sendMeta;

  let sent = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data: reports } = await admin
      .from('reports')
      .select('id, recipient_phone, body, status, share_code, student_id, organization_id')
      .in('id', ids.slice(i, i + 200))
      .eq('status', 'queued');
    const names = new Map<string, string>();
    const codes = new Map<string, string>();
    const orgNames = new Map<string, string>();
    if (bySms && reports?.length) {
      const { data: students } = await admin
        .from('students')
        .select('id, full_name, student_code')
        .in('id', [...new Set(reports.map((r) => String(r.student_id)))]);
      for (const st of students ?? []) {
        names.set(String(st.id), String(st.full_name ?? ''));
        codes.set(String(st.id), String(st.student_code ?? ''));
      }
      const { data: orgs } = await admin
        .from('organizations')
        .select('id, name')
        .in('id', [...new Set(reports.map((r) => String(r.organization_id)))]);
      for (const o of orgs ?? []) orgNames.set(String(o.id), String(o.name ?? ''));
    }
    for (const r of reports ?? []) {
      if (!r.recipient_phone) continue;
      const error = bySms
        ? await sendSms(String(r.recipient_phone), reportSmsText(
            names.get(String(r.student_id)) ?? '',
            codes.get(String(r.student_id)) ?? '',
            orgNames.get(String(r.organization_id)) ?? '',
            String(r.share_code),
          ))
        : await send(String(r.recipient_phone), templateText(String(r.body ?? '')));
      if (!error) {
        sent++;
        await admin.from('reports').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', r.id);
      } else {
        await admin.from('reports').update({ status: 'failed', error: error.slice(0, 500) }).eq('id', r.id);
      }
    }
  }
  return sent;
}
