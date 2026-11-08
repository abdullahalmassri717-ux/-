// Student submission link /s/<code>. No account needed.
//
// GET  ?code=<link code>            -> exam title and organization name only.
//                                      Never returns the list of students (minors).
// POST { code, studentCode, pages } -> checks the student's private 4-digit code,
//                                      stores the photos privately, starts grading.
//
// Guessing codes is limited: 5 wrong codes from one device in 15 minutes blocks it.
import { adminClient, corsHeaders, env, json, runInBackground } from '../_shared/http.ts';
import { gradeSubmission } from '../_shared/gradeSubmission.ts';

const MAX_PAGES = 6;
const MAX_PAGE_BYTES = 4 * 1024 * 1024;
const WRONG_CODE_LIMIT = 5;
const WINDOW_MINUTES = 15;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function clientHash(req: Request, assessmentId: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const salt = Deno.env.get('LINK_ATTEMPT_SALT') ?? Deno.env.get('SUPABASE_URL') ?? '';
  const bytes = new TextEncoder().encode(`${salt}:${assessmentId}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromBase64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = adminClient();

  const findAssessment = async (code: string) => {
    if (!/^[a-z0-9]{6,20}$/i.test(code)) return null;
    const { data } = await admin
      .from('assessments')
      .select('id, organization_id, group_id, title, kind, submission_open, submission_mode, organizations(name)')
      .eq('submission_code', code.toLowerCase())
      .maybeSingle();
    return data;
  };

  if (req.method === 'GET') {
    const code = new URL(req.url).searchParams.get('code') ?? '';
    const a = await findAssessment(code);
    if (!a) return json({ error: 'الرابط غير صحيح أو انتهت صلاحيته.' }, 404);
    const org = Array.isArray(a.organizations) ? a.organizations[0] : a.organizations;
    return json({ title: a.title, kind: a.kind, organizationName: org?.name ?? '', open: a.submission_open, maxPages: MAX_PAGES });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { code?: string; studentCode?: string; pages?: { data: string; mediaType: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'الطلب غير صالح أو الصور كبيرة جداً.' }, 400);
  }

  const a = await findAssessment(String(body.code ?? ''));
  if (!a) return json({ error: 'الرابط غير صحيح أو انتهت صلاحيته.' }, 404);
  if (!a.submission_open) return json({ error: 'أغلق المدرّس التسليم لهذا الامتحان.' }, 403);

  const hash = await clientHash(req, a.id);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from('submission_link_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', a.id)
    .eq('client_hash', hash)
    .eq('succeeded', false)
    .gte('created_at', since);
  if ((count ?? 0) >= WRONG_CODE_LIMIT) {
    return json({ error: `محاولات خاطئة كثيرة. انتظر ${WINDOW_MINUTES} دقيقة ثم حاول مرة أخرى.` }, 429);
  }

  const studentCode = String(body.studentCode ?? '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (!/^[0-9]{4}$/.test(studentCode)) return json({ error: 'رمز الطالب 4 أرقام.' }, 400);
  if (!pages.length) return json({ error: 'أضف صورة ورقتك أولاً.' }, 400);
  if (pages.length > MAX_PAGES) return json({ error: `الحد الأقصى ${MAX_PAGES} صفحات.` }, 400);

  // The student must be active and in the exam's group.
  const { data: student } = await admin
    .from('students')
    .select('id, full_name, group_students!inner(group_id, left_at)')
    .eq('organization_id', a.organization_id)
    .eq('student_code', studentCode)
    .eq('status', 'active')
    .eq('group_students.group_id', a.group_id)
    .is('group_students.left_at', null)
    .maybeSingle();

  await admin.from('submission_link_attempts').insert({ assessment_id: a.id, client_hash: hash, succeeded: !!student });
  if (!student) return json({ error: 'رمز الطالب غير صحيح. تأكد منه مع المدرّس.' }, 404);

  const decoded: { bytes: Uint8Array; ext: string; mediaType: string }[] = [];
  for (const p of pages) {
    const ext = EXT[p.mediaType];
    if (!ext || typeof p.data !== 'string') return json({ error: 'ارفع الصور بصيغة JPG أو PNG.' }, 400);
    const bytes = fromBase64(p.data);
    if (bytes.length > MAX_PAGE_BYTES) return json({ error: 'إحدى الصور كبيرة جداً.' }, 400);
    decoded.push({ bytes, ext, mediaType: p.mediaType });
  }

  // One paper per student per exam: a new upload replaces an earlier one (unless approved).
  const { data: existing } = await admin
    .from('submissions')
    .select('id, status, submission_pages(storage_path)')
    .eq('assessment_id', a.id)
    .eq('student_id', student.id)
    .maybeSingle();
  if (existing?.status === 'approved') {
    return json({ error: 'ورقتك صُحّحت واعتمدها المدرّس. تواصل معه إذا أردت تعديلاً.' }, 409);
  }

  let submissionId = existing?.id as string | undefined;
  if (existing) {
    const oldPaths = (existing.submission_pages ?? []).map((p: { storage_path: string }) => p.storage_path);
    if (oldPaths.length) await admin.storage.from('submission-pages').remove(oldPaths);
    await admin.from('submission_pages').delete().eq('submission_id', existing.id);
    await admin.from('submissions').update({ status: 'uploaded', submitted_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    const { data: created, error } = await admin
      .from('submissions')
      .insert({ organization_id: a.organization_id, assessment_id: a.id, student_id: student.id, source: 'student_link' })
      .select('id')
      .single();
    if (error || !created) return json({ error: 'تعذّر حفظ التسليم. حاول مرة أخرى.' }, 500);
    submissionId = created.id as string;
  }

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < decoded.length; i++) {
    const path = `${a.organization_id}/${a.id}/${submissionId}/${i + 1}-${crypto.randomUUID().slice(0, 8)}.${decoded[i].ext}`;
    const { error } = await admin.storage
      .from('submission-pages')
      .upload(path, decoded[i].bytes, { contentType: decoded[i].mediaType, upsert: true });
    if (error) return json({ error: 'تعذّر رفع الصور. حاول مرة أخرى.' }, 500);
    rows.push({ submission_id: submissionId, organization_id: a.organization_id, page_number: i + 1, storage_path: path });
  }
  const { error: pagesError } = await admin.from('submission_pages').insert(rows);
  if (pagesError) return json({ error: 'تعذّر حفظ الصور. حاول مرة أخرى.' }, 500);

  // Grade right away; the teacher still reviews before any grade reaches the family.
  runInBackground(gradeSubmission(admin, submissionId!, env()));

  const firstName = String(student.full_name).split(/\s+/)[0];
  return json({ ok: true, firstName, pages: rows.length });
});
