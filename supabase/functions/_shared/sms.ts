// Text messages (SMS) through TweetSMS (Tweet tec Company, Gaza): login codes and
// short weekly-report messages with a link, while WhatsApp is not available.
//
// Secrets (set by the "Set SMS" workflow, never in the browser):
//   TWEETSMS_API_KEY   the account's API key from tweetsms.ps
//   TWEETSMS_SENDER    the approved sender name, e.g. "Dequa" (2 to 11 English letters/digits)
// Without both, nothing is sent by SMS.
//
// API (https://documenter.getpostman.com/view/1142337/TzzGJE52):
//   POST https://www.tweetsms.ps/api.php/office/sendsms
//   JSON { api_key, sender, message, to: "0599123456,0599..." }
//   The answer holds a code: 999 = sent; negative = error (see SMS_ERRORS).

const SEND_URL = 'https://www.tweetsms.ps/api.php/office/sendsms';

export const SMS_ERRORS: Record<string, string> = {
  '-100': 'missing parameters',
  '-110': 'wrong API key',
  '-111': 'account not activated',
  '-112': 'account blocked',
  '-114': 'sending is stopped by the provider',
  '-115': 'invalid sender name',
  '-116': 'invalid sender name',
  '-120': 'no valid number',
  '-124': 'not enough credit',
  '-126': 'cannot send right now',
};

export function smsReady(): boolean {
  return Boolean(Deno.env.get('TWEETSMS_API_KEY') && Deno.env.get('TWEETSMS_SENDER'));
}

/**
 * Palestinian mobiles (+970 / +972 then 5xxxxxxxx) go in the local form 05xxxxxxxx,
 * which the provider accepts for both Jawwal and Ooredoo. Other numbers keep all digits.
 */
export function smsNumber(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const m = digits.match(/^(?:00)?97[02](5\d{8})$/);
  if (m) return `0${m[1]}`;
  if (/^5\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}

/** Reads the provider's result code from its answer (JSON or plain text). */
export function smsResultCode(answer: string): string | null {
  const text = String(answer ?? '').trim();
  try {
    const data = JSON.parse(text);
    if (typeof data === 'number') return String(data);
    if (data && typeof data === 'object') {
      for (const k of ['code', 'status', 'result', 'error_code', 'Code', 'Status', 'Result']) {
        const v = (data as Record<string, unknown>)[k];
        if (v !== undefined && /^-?\d+$/.test(String(v).trim())) return String(v).trim();
      }
    }
  } catch {
    // plain text answer
  }
  const m = text.match(/(^|[^\d-])(999|-1\d\d)(?!\d)/);
  return m ? m[2] : null;
}

/** Sends one SMS. Returns null when sent, otherwise the error text. */
export async function sendSms(phone: string, message: string): Promise<string | null> {
  if (!smsReady()) return 'SMS is not connected';
  const to = smsNumber(phone);
  if (!to) return 'no phone number';
  let res: Response;
  try {
    res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        api_key: Deno.env.get('TWEETSMS_API_KEY'),
        sender: Deno.env.get('TWEETSMS_SENDER'),
        message,
        to,
      }),
    });
  } catch (e) {
    return `SMS provider unreachable: ${e instanceof Error ? e.message : String(e)}`;
  }
  const answer = await res.text().catch(() => '');
  const code = smsResultCode(answer);
  if (res.ok && code === '999') return null;
  const reason = code ? (SMS_ERRORS[code] ?? `code ${code}`) : `HTTP ${res.status}`;
  return `SMS failed: ${reason} ${answer.slice(0, 200)}`.trim();
}
