// Small helpers shared by the Edge Functions.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function env(): Record<string, string | undefined> {
  return Deno.env.toObject();
}

/** Server-only client with full access. Never send its key anywhere. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client acting as the signed-in caller, so the database's access rules apply. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Runs work after the response is sent, when the platform supports it. */
export function runInBackground(task: Promise<unknown>) {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime) runtime.waitUntil(task);
  else task.catch((e) => console.error(e));
}

/** Saves an unexpected server error for the platform admin (table app_errors). Never throws. */
export async function logFunctionError(admin: SupabaseClient, where: string, error: unknown): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const detail = error instanceof Error ? error.stack ?? null : null;
    await admin.from('app_errors').insert({
      source: 'function',
      message: `${where}: ${message}`.slice(0, 300),
      detail: detail?.slice(0, 1500) ?? null,
      page: where,
      user_id: null,
    });
  } catch {
    // Logging must never break the request.
  }
}
