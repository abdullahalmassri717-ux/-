// Notifications on the phone's screen (Web Push), through the service worker.
// iPhone: works only from the app installed on the home screen (iOS 16.4 and later).
import { supabase } from './supabase';
import { isInstalled, isIos } from './pwa';

export type PushState =
  | 'unsupported' // this browser can't receive them
  | 'needs_install' // iPhone in Safari: install on the home screen first
  | 'denied' // the person blocked notifications in settings
  | 'off' // possible, not turned on yet on this device
  | 'on'; // turned on on this device

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  // The worker is registered on the live site; register here too in case it isn't yet.
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (isIos() && !isInstalled()) return 'needs_install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Asks permission (must follow a tap) and registers this device. Returns an Arabic error or null. */
export async function enablePush(): Promise<string | null> {
  if (!supabase) return 'الإشعارات تعمل في النسخة الحقيقية فقط.';
  const state = await getPushState();
  if (state === 'needs_install') return 'على الآيفون: ثبّت دقة على الشاشة الرئيسية أولاً، ثم افتحها من الأيقونة.';
  if (state === 'unsupported') return 'هذا المتصفح لا يدعم الإشعارات. جرّب Chrome أو Safari بنسخة حديثة.';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'لم تسمح بالإشعارات. يمكنك السماح بها من إعدادات الجوال.';

  const reg = await registration();
  if (!reg) return 'تعذّر تجهيز الإشعارات على هذا الجهاز.';
  await navigator.serviceWorker.ready;

  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'key' } });
  const publicKey = (data as { publicKey?: string } | null)?.publicKey;
  if (error || !publicKey) return 'تعذّر الاتصال بالخادم. حاول مرة أخرى بعد قليل.';

  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    // A subscription made with an older key can't receive our messages: renew it.
    const current = sub.options?.applicationServerKey;
    const same =
      current && new Uint8Array(current).join(',') === keyBytes(publicKey).join(',');
    if (!same) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
  }
  try {
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  } catch {
    return 'تعذّر تفعيل الإشعارات على هذا الجهاز.';
  }

  const json = sub.toJSON();
  const { error: saveError } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  return saveError ? 'تعذّر حفظ الجهاز. حاول مرة أخرى.' : null;
}

/** Stops notifications on this device. */
export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase?.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => {});
}

/** Sends a test notification to the person's own devices. Returns an Arabic error or null. */
export async function sendTestPush(): Promise<string | null> {
  if (!supabase) return 'الإشعارات تعمل في النسخة الحقيقية فقط.';
  const { error } = await supabase.functions.invoke('push', { body: { action: 'test' } });
  return error ? 'تعذّر إرسال إشعار التجربة. أوقف الإشعارات وفعّلها من جديد.' : null;
}
