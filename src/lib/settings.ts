// Public platform settings (prices, currency, support contact, landing page…)
// live in the platform_settings table and are edited by the platform admin.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const cache = new Map<string, Promise<unknown>>();

/** Reads one public setting; null when it isn't set or there is no backend. */
export function getPublicSetting<T>(key: string): Promise<T | null> {
  if (!supabase) return Promise.resolve(null);
  if (!cache.has(key)) {
    const p = (async () => {
      const { data, error } = await supabase!.from('platform_settings').select('value').eq('key', key).maybeSingle();
      if (error) {
        cache.delete(key);
        return null;
      }
      return (data?.value ?? null) as T | null;
    })();
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T | null>;
}

/** Saves a setting (platform admin only; the database refuses anyone else). */
export async function savePlatformSetting(key: string, value: unknown, isPublic = true): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('platform_settings').upsert({ key, value, is_public: isPublic });
  if (error) throw new Error(/[؀-ۿ]/.test(error.message) ? error.message : 'تعذّر حفظ الإعدادات.');
  cache.delete(key);
}

/** React helper: the setting's value, the demo fallback until (or unless) the real one loads. */
export function usePublicSetting<T>(key: string, demoFallback: T): T {
  const [value, setValue] = useState<T>(supabase ? ({} as T) : demoFallback);
  useEffect(() => {
    let alive = true;
    getPublicSetting<T>(key).then((v) => alive && v && setValue(v));
    return () => {
      alive = false;
    };
  }, [key]);
  return value;
}

/**
 * How login codes reach people right now: 'sms' when the platform admin turned on
 * text-message codes (platform_settings.login_sms = { enabled: true }), else 'whatsapp'.
 */
export function useCodeChannel(): 'sms' | 'whatsapp' {
  const setting = usePublicSetting<{ enabled?: boolean }>('login_sms', {});
  return setting?.enabled ? 'sms' : 'whatsapp';
}

/** Words for the code channel, e.g. «على واتساب» or «برسالة نصية (SMS)». */
export function codeChannelWords(channel: 'sms' | 'whatsapp') {
  return channel === 'sms'
    ? { by: 'برسالة نصية (SMS)', phoneLabel: 'رقم الجوال' }
    : { by: 'على واتساب', phoneLabel: 'رقم الواتساب' };
}
