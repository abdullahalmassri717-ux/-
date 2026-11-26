// POST { task, organizationId, ...input } with the teacher's sign-in token.
// Runs one of the teacher's AI tools on the server, so the AI key never
// reaches the browser. Lessons are read with the teacher's own permissions,
// so only published curriculum can be used.
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, corsHeaders, env, json, logFunctionError, runInBackground, userClient } from '../_shared/http.ts';
import { ClaudeToolModel, EscalatingToolModel, ToolError, toolConfigFromEnv, type Usage } from '../_shared/aiTools/model.ts';
import { asNumerals } from '../_shared/numerals.ts';
import {
  assistantChat,
  extractExam,
  generateQuestions,
  mapStudentColumns,
  parentReply,
  studyPlan,
  suggestAnswerLines,
  suggestRubric,
  type LessonContext,
} from '../_shared/aiTools/tools.ts';

type Body = Record<string, unknown>;

const UUID = /^[0-9a-f-]{36}$/i;
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const ids = (v: unknown, max = 40) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && UUID.test(x)).slice(0, max) : []);

async function loadLessons(db: SupabaseClient, lessonIds: string[], subjectId: string): Promise<LessonContext[]> {
  if (!lessonIds.length) return [];
  const { data, error } = await db
    .from('lessons')
    .select('id, title, content, units!inner(title, subject_id), learning_outcomes(text, sort_order), lesson_terms(kind, text, sort_order)')
    .in('id', lessonIds)
    .eq('units.subject_id', subjectId);
  if (error) throw new ToolError(error.message, 'تعذّر قراءة الدروس.', 500);
  type Row = {
    id: string; title: string; content: string | null;
    units: { title: string } | { title: string }[];
    learning_outcomes: { text: string; sort_order: number }[];
    lesson_terms: { kind: string; text: string; sort_order: number }[];
  };
  const order = new Map(lessonIds.map((id, i) => [id, i]));
  // A midterm or final can cover many lessons. Keep the whole prompt about the
  // same size (and cost) by giving each lesson a share of a fixed budget.
  const perLesson = Math.max(1500, Math.min(12000, Math.floor(60000 / Math.max(1, (data ?? []).length))));
  return ((data ?? []) as Row[])
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((l) => {
      const unit = Array.isArray(l.units) ? l.units[0] : l.units;
      const terms = [...l.lesson_terms].sort((a, b) => a.sort_order - b.sort_order);
      return {
        id: l.id,
        title: l.title,
        unit: unit?.title ?? '',
        content: (l.content ?? '').slice(0, perLesson),
        outcomes: [...l.learning_outcomes].sort((a, b) => a.sort_order - b.sort_order).map((o) => o.text),
        terms: terms.filter((t) => t.kind === 'term').map((t) => t.text),
        symbols: terms.filter((t) => t.kind === 'symbol').map((t) => t.text),
      };
    });
}

async function subjectInfo(db: SupabaseClient, subjectId: string) {
  const { data } = await db.from('subjects').select('name, numerals, grades(name)').eq('id', subjectId).maybeSingle();
  if (!data) throw new ToolError('Subject not visible', 'المادة غير متاحة.', 404);
  const row = data as { name: string; numerals: string | null; grades: { name: string } | { name: string }[] | null };
  const grade = Array.isArray(row.grades) ? row.grades[0] : row.grades;
  // Arabic or Western digits, as in the subject's textbook (set per subject by the platform admin).
  return { subjectName: row.name, gradeName: grade?.name ?? '', numerals: asNumerals(row.numerals) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'الطلب غير صالح.' }, 400);
  }
  const task = str(body.task, 40);
  const orgId = str(body.organizationId, 40);
  if (!UUID.test(orgId)) return json({ error: 'الطلب غير صالح.' }, 400);

  const db = userClient(req);
  const { data: auth } = await db.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return json({ error: 'سجّل الدخول أولاً.' }, 401);
  const { data: member } = await db
    .from('memberships')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (!member) return json({ error: 'ليس لديك صلاحية على هذه الجهة.' }, 403);

  const apiKey = env().ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'أدوات الذكاء الاصطناعي غير مفعّلة بعد. أبلغ مدير المنصة.' }, 503);

  const admin = adminClient();
  // A daily cap per teacher keeps a stuck screen or a mistake from running up the bill.
  const { data: setting } = await admin.from('platform_settings').select('value').eq('key', 'ai_tools').maybeSingle();
  const limit = Number((setting?.value as { daily_limit_per_user?: number } | null)?.daily_limit_per_user ?? 200);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from('ai_tool_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  if ((count ?? 0) >= limit) return json({ error: 'وصلت للحد اليومي لاستخدام أدوات الذكاء الاصطناعي. حاول غداً.' }, 429);

  const config = toolConfigFromEnv(env());
  // Cheap model first; the stronger one only when the cheap one fails.
  const model = new EscalatingToolModel(new ClaudeToolModel(apiKey), config.strongModel);
  const log = (ran: Usage[], ok = true) => {
    const usage = [...model.takeFailedUsage(), ...ran];
    return usage.length
      ? admin.from('ai_tool_runs').insert(
          usage.map((u) => ({
            organization_id: orgId, user_id: userId, task, model: u.model,
            input_tokens: u.inputTokens, output_tokens: u.outputTokens, cost_usd: u.costUsd, ok,
          })),
        )
      : Promise.resolve();
  };

  try {
    switch (task) {
      case 'generate_questions':
      case 'extract_exam':
      case 'study_plan':
      case 'suggest_rubric': {
        const subjectId = str(body.subjectId, 40);
        if (!UUID.test(subjectId)) return json({ error: 'اختر المادة أولاً.' }, 400);
        const info = await subjectInfo(db, subjectId);

        if (task === 'generate_questions') {
          const groupId = str(body.groupId, 40);
          if (groupId) {
            const { data: g } = await db.from('groups').select('subject_id').eq('id', groupId).maybeSingle();
            if (!g) return json({ error: 'ليس لديك صلاحية على هذه المجموعة.' }, 403);
          }
          const lessons = await loadLessons(db, ids(body.lessonIds), subjectId);
          if (!lessons.length) return json({ error: 'اختر درساً واحداً على الأقل من المادة.' }, 400);
          const difficulty = (['easy', 'medium', 'hard'] as const).find((d) => d === body.difficulty) ?? 'medium';
          const run = () => generateQuestions(model, config, {
            lessons,
            count: Number(body.count) || 5,
            difficulty,
            purpose: body.purpose === 'remedial' ? 'remedial' : 'exam',
            note: str(body.note, 1000),
            avoid: Array.isArray(body.avoid) ? body.avoid.map((x) => str(x, 500)).filter(Boolean) : [],
            totalScore: Number(body.totalScore) > 0 ? Math.min(Math.round(Number(body.totalScore) * 2) / 2, 1000) : undefined,
            ...info,
          });
          if (body.background !== true) {
            const result = await run();
            await log(result.usage);
            return json(result.data);
          }
          // Background: answer at once with a job id; the work goes on even if
          // the teacher leaves the page, and the browser reads public.ai_jobs.
          await admin.from('ai_jobs').delete().eq('user_id', userId).lt('created_at', new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString());
          const { data: job, error: jobError } = await admin
            .from('ai_jobs')
            .insert({ organization_id: orgId, user_id: userId, task })
            .select('id')
            .single();
          if (jobError || !job) throw new Error(jobError?.message ?? 'ai_jobs insert failed');
          const finish = (patch: Record<string, unknown>) =>
            admin.from('ai_jobs').update({ ...patch, finished_at: new Date().toISOString() }).eq('id', job.id);
          runInBackground(
            (async () => {
              try {
                const result = await run();
                await log(result.usage);
                await finish({ status: 'done', result: result.data });
              } catch (e) {
                await log(e instanceof ToolError && e.usage ? [e.usage] : [], false);
                if (!(e instanceof ToolError)) await logFunctionError(admin, `ai-tools/${task}`, e);
                console.error(task, e);
                await finish({ status: 'failed', error: e instanceof ToolError ? e.userMessage : 'حدث خطأ غير متوقع أثناء التوليد.' });
              }
            })(),
          );
          return json({ jobId: job.id });
        }

        if (task === 'suggest_rubric') {
          const text = str(body.text, 4000).trim();
          if (!text) return json({ error: 'اكتب نص السؤال أولاً.' }, 400);
          const lessonId = str(body.lessonId, 40);
          const [lesson] = UUID.test(lessonId) ? await loadLessons(db, [lessonId], subjectId) : [];
          const result = await suggestRubric(model, config, {
            text,
            maxScore: Math.min(Math.max(Number(body.maxScore) || 10, 1), 100),
            lesson: lesson ?? null,
            ...info,
          });
          await log(result.usage);
          return json(result.data);
        }

        if (task === 'extract_exam') {
          const raw = Array.isArray(body.pages) ? body.pages.slice(0, 6) : [];
          const pages = raw
            .map((p) => p as { data?: unknown; mediaType?: unknown })
            .filter((p) => typeof p.data === 'string' && p.data.length < 7_000_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(String(p.mediaType)))
            .map((p) => ({ type: 'image' as const, data: p.data as string, mediaType: p.mediaType as 'image/jpeg' }));
          if (!pages.length) return json({ error: 'أرفق صورة واحدة على الأقل للورقة.' }, 400);
          const { data: list } = await db.from('lessons').select('id, units!inner(subject_id)').eq('units.subject_id', subjectId).limit(200);
          const lessons = await loadLessons(db, ((list ?? []) as { id: string }[]).map((l) => l.id), subjectId);
          const result = await extractExam(model, config, { pages, lessons: lessons.map((l) => ({ ...l, content: '' })), numerals: info.numerals });
          await log(result.usage);
          return json(result.data);
        }

        const weak = Array.isArray(body.lessons) ? body.lessons.slice(0, 12) : [];
        const mastery = new Map(
          weak.map((l) => l as { id?: unknown; mastery?: unknown }).filter((l) => typeof l.id === 'string').map((l) => [l.id as string, typeof l.mastery === 'number' ? l.mastery : null]),
        );
        const lessons = await loadLessons(db, ids([...mastery.keys()]), subjectId);
        if (!lessons.length) return json({ error: 'لا توجد دروس كافية لبناء خطة.' }, 400);
        const result = await studyPlan(model, config, {
          lessons: lessons.map((l) => ({ ...l, content: l.content.slice(0, 3000), mastery: mastery.get(l.id) ?? null })),
          days: Number(body.days) || 7,
          ...info,
        });
        await log(result.usage);
        return json(result.data);
      }

      case 'suggest_answer_lines': {
        // Read with the teacher's own permissions, so only their org's exams.
        const examId = str(body.examId, 40);
        if (!UUID.test(examId)) return json({ error: 'الطلب غير صالح.' }, 400);
        const { data: exam } = await db
          .from('assessments')
          .select('id, organization_id, subject_id, questions(number, text, type, max_score, model_answer)')
          .eq('id', examId)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (!exam) return json({ error: 'الامتحان غير موجود.' }, 404);
        type Q = { number: number; text: string; type: string; max_score: number; model_answer: string | null };
        const questions = ((exam.questions ?? []) as Q[])
          .sort((a, b) => a.number - b.number)
          .slice(0, 60)
          .map((q) => ({ number: q.number, text: q.text, type: q.type, maxScore: Number(q.max_score), modelAnswer: q.model_answer ?? '' }));
        if (!questions.length) return json({ lines: {} });
        const info = exam.subject_id ? await subjectInfo(db, exam.subject_id as string).catch(() => null) : null;
        const result = await suggestAnswerLines(model, config, {
          questions,
          subjectName: info?.subjectName ?? '',
          gradeName: info?.gradeName ?? '',
        });
        await log(result.usage);
        return json(result.data);
      }

      case 'parent_reply': {
        const message = str(body.message, 2000).trim();
        if (!message) return json({ error: 'الصق رسالة ولي الأمر أولاً.' }, 400);
        const { data: profile } = await db.from('profiles').select('full_name').eq('id', userId).maybeSingle();
        const result = await parentReply(model, config, {
          message,
          teacherName: (profile as { full_name?: string } | null)?.full_name ?? 'المدرّس',
          studentFirstName: str(body.studentFirstName, 40).split(' ')[0] || 'الطالب',
          facts: Array.isArray(body.facts) ? body.facts.map((f) => str(f, 300)).filter(Boolean).slice(0, 10) : [],
        });
        await log(result.usage);
        return json(result.data);
      }

      case 'map_student_columns': {
        // Rows arrive with names and phone numbers already hidden by the browser.
        const rows = (Array.isArray(body.rows) ? body.rows : [])
          .slice(0, 10)
          .map((r) => (Array.isArray(r) ? r.slice(0, 15).map((c) => str(c, 60)) : []));
        if (!rows.some((r) => r.some(Boolean))) return json({ error: 'الملف فارغ.' }, 400);
        const result = await mapStudentColumns(model, config, { rows });
        await log(result.usage);
        return json(result.data);
      }

      case 'assistant': {
        const turns = (Array.isArray(body.turns) ? body.turns : [])
          .map((t) => t as { role?: unknown; text?: unknown })
          .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
          .map((t) => ({ role: t.role as 'user' | 'assistant', text: t.text as string }));
        const result = await assistantChat(model, config, { turns });
        await log(result.usage);
        return json(result.data);
      }

      default:
        return json({ error: 'أداة غير معروفة.' }, 400);
    }
  } catch (e) {
    await log(e instanceof ToolError && e.usage ? [e.usage] : [], false);
    if (e instanceof ToolError) {
      console.error(task, e.message);
      return json({ error: e.userMessage }, e.status);
    }
    console.error(task, e);
    await logFunctionError(adminClient(), `ai-tools/${task}`, e);
    return json({ error: 'حدث خطأ غير متوقع.' }, 500);
  }
});
