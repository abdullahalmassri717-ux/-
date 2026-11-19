// Gives the nightly backup (GitHub workflow backup-database.yml) short-lived
// download links for stored files (paper photos, payment receipts, logos), so
// they can be copied into the encrypted backup. Only callable with the internal
// token that lives inside the database (the workflow reads it with the
// database password). Links expire after 10 minutes.
import { adminClient, json } from '../_shared/http.ts';

const BUCKETS = new Set(['submission-pages', 'payment-receipts', 'org-assets']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const admin = adminClient();

  const token = req.headers.get('x-daqa-cron') ?? '';
  const { data: ok } = await admin.rpc('check_weekly_reports_token', { p_token: token });
  if (!token || ok !== true) return json({ error: 'Forbidden' }, 403);

  let body: { bucket?: string; paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const bucket = String(body.bucket ?? '');
  const paths = Array.isArray(body.paths) ? body.paths.map(String).slice(0, 500) : [];
  if (!BUCKETS.has(bucket) || !paths.length) return json({ error: 'Bad request' }, 400);

  const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 600);
  if (error) return json({ error: error.message }, 500);
  return json({ urls: (data ?? []).map((d) => ({ path: d.path, url: d.signedUrl, error: d.error })) });
});
