// Corrected papers for the parent's report page dequa.study/r/<code>. No account:
// the random report code is the key (same rules as the report: 60 days).
//
// POST { code } -> { papers: [{ id, title, subject, score, total, approvedAt,
//                               questions: [{ number, lesson, score, max, note }],
//                               pageUrls: [signed image links, valid 30 minutes] }] }
// Only the approved papers of that report's student and week (one subject for a
// private teacher's report). The photos stay in the private bucket; the links expire.
import { adminClient, corsHeaders, json } from '../_shared/http.ts';

interface Paper {
  id: string;
  pages?: string[];
  [key: string]: unknown;
}

const CODE = /^[0-9a-f]{12}([0-9a-f]{4})?$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let code = '';
  try {
    code = String((await req.json()).code ?? '').trim().toLowerCase();
  } catch {
    return json({ error: 'الطلب غير صالح.' }, 400);
  }
  if (!CODE.test(code)) return json({ papers: [] });

  const admin = adminClient();
  const { data, error } = await admin.rpc('shared_report_papers', { p_code: code });
  if (error) {
    console.error('shared_report_papers', error.message);
    return json({ error: 'تعذّر تحميل الأوراق.' }, 500);
  }
  const papers = (Array.isArray(data) ? data : []) as Paper[];

  const paths = [...new Set(papers.flatMap((p) => p.pages ?? []))];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signError } = await admin.storage.from('submission-pages').createSignedUrls(paths, 60 * 30);
    if (signError) console.error('sign', signError.message);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  return json({
    papers: papers.map(({ pages, ...p }) => ({
      ...p,
      pageUrls: (pages ?? []).map((path) => urls.get(path)).filter(Boolean),
    })),
  });
});
