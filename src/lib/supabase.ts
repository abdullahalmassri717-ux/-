import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The browser only ever gets the public "anon" key. The service_role key must
// never appear here. Both values come from .env.local (not in Git) or from the
// hosting settings (Vercel).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the app is connected to a real Supabase project. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// «صفحتي كأستاذ»: a school owner who also teaches sees only the classes assigned to
// them. Database requests then carry this header, and the database rules treat the
// owner like any other teacher. It only ever narrows what can be seen.
let teacherView = false;
export function setTeacherViewHeader(on: boolean) {
  teacherView = on;
}

const fetchWithView: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!teacherView || !url.includes('/rest/v1/')) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set('x-daqa-view', 'teacher');
  return fetch(input, { ...init, headers });
};

/**
 * The shared Supabase client, or null when no project is configured.
 * With no project the app stays in demo mode (mock data, any 6-digit code works).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: fetchWithView },
    })
  : null;
