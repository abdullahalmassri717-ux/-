// The real data store: reads and writes the Supabase database.
// Row Level Security in the database decides what each person may see; this
// file only shapes the rows for the screens.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Curriculum, Exam, Group } from '../types';
import { toInternationalPhone } from '../lib/phone';
import { PLATFORM_CONFIG } from '../mockData';
import { createSupabaseBilling } from './billing';
import { createSupabaseAi } from './ai';
import { createSupabaseSchool, type SchoolStore } from './school';
import type {
  AssessmentDetail,
  AssessmentRow,
  DashboardSummary,
  DataStore,
  MoodleIdKind,
  NewAssessmentInput,
  NewGroupInput,
  QuestionGradeRow,
  ReportStatus,
  StudentInput,
  StudentRow,
  SubmissionRow,
  TaughtLessons,
  WeeklyReportRow,
} from './types';

/** Error with a short Arabic message the screen can show as-is. */
export class DataError extends Error {}

function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const msg = error?.message ?? '';
  if (msg.toLowerCase().includes('failed to fetch')) throw new DataError('تعذّر الاتصال بالإنترنت. حاول مرة أخرى.');
  if (error?.code === '23505') throw new DataError('هذا العنصر موجود من قبل.');
  if (error?.code === '42501') throw new DataError('ليس لديك صلاحية لهذا الإجراء.');
  // Messages raised by our own database rules are already in Arabic.
  if (/[؀-ۿ]/.test(msg)) throw new DataError(msg);
  throw new DataError(fallback);
}

function phoneOrNull(input: string | undefined): string | null | undefined {
  if (input === undefined) return undefined;
  if (!input.trim()) return null;
  const p = toInternationalPhone(input);
  if (!p) throw new DataError(`رقم الهاتف «${input}» غير صحيح.`);
  return p;
}

/** +970599112233 -> 0599112233 (what teachers are used to reading). */
function localPhone(p: string | null): string {
  if (!p) return '';
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

type CurriculumRow = {
  id: string; name: string; country: string | null; currency_code: string | null; is_available: boolean;
  grades: {
    id: string; name: string; stage: string | null; sort_order: number;
    subjects: {
      id: string; name: string; code: string | null; status: string; sort_order: number;
      units: {
        id: string; title: string; sort_order: number;
        lessons: {
          id: string; title: string; sort_order: number;
          learning_outcomes: { text: string; sort_order: number }[];
          lesson_terms: { kind: string; text: string; sort_order: number }[];
        }[];
      }[];
    }[];
  }[];
};

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export function createSupabaseStore(db: SupabaseClient, orgId: string): DataStore {
  // Short-lived cache: the admin may publish a subject while a teacher screen is open.
  let curriculaCache: Promise<Curriculum[]> | null = null;
  let curriculaCachedAt = 0;

  const listCurricula = (): Promise<Curriculum[]> => {
    if (Date.now() - curriculaCachedAt > 30_000) curriculaCache = null;
    if (!curriculaCache) curriculaCachedAt = Date.now();
    curriculaCache ??= (async () => {
      const { data, error } = await db
        .from('curricula')
        .select(
          'id, name, country, currency_code, is_available, sort_order, grades(id, name, stage, sort_order, subjects(id, name, code, status, sort_order, units(id, title, sort_order, lessons(id, title, sort_order, learning_outcomes(text, sort_order), lesson_terms(kind, text, sort_order)))))',
        )
        .order('sort_order');
      if (error) {
        curriculaCache = null;
        fail(error, 'تعذّر تحميل المناهج.');
      }
      return ((data ?? []) as unknown as CurriculumRow[]).map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country ?? '',
        currency: c.currency_code ?? '',
        currencySymbol: PLATFORM_CONFIG.currencySymbol,
        isAvailable: c.is_available,
        grades: [...(c.grades ?? [])].sort(bySort).map((g) => ({
          id: g.id,
          name: g.name,
          stage: (g.stage ?? 'secondary') as 'elementary' | 'middle' | 'secondary',
          subjects: [...(g.subjects ?? [])].sort(bySort).map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code ?? '',
            status: s.status === 'published' ? 'published' : 'draft',
            units: [...(s.units ?? [])].sort(bySort).map((u) => ({
              id: u.id,
              title: u.title,
              order: u.sort_order,
              lessons: [...(u.lessons ?? [])].sort(bySort).map((l) => {
                const terms = [...(l.lesson_terms ?? [])].sort(bySort);
                return {
                  id: l.id,
                  title: l.title,
                  order: l.sort_order,
                  learningOutcomes: [...(l.learning_outcomes ?? [])].sort(bySort).map((o) => o.text),
                  keyTerms: terms.filter((t) => t.kind === 'term').map((t) => t.text),
                  symbols: terms.filter((t) => t.kind === 'symbol').map((t) => t.text),
                };
              }),
            })),
          })),
        })),
      }));
    })();
    return curriculaCache;
  };

  /** Finds names for a grade/subject id in the curriculum tree. */
  async function curriculumNames(gradeId: string | null, subjectId: string | null) {
    const tree = await listCurricula();
    for (const c of tree) {
      for (const g of c.grades) {
        if (g.id !== gradeId && !g.subjects.some((s) => s.id === subjectId)) continue;
        const s = g.subjects.find((x) => x.id === subjectId);
        const lessons = s ? s.units.reduce((n, u) => n + u.lessons.length, 0) : 0;
        return { curriculumId: c.id, curriculumName: c.name, gradeId: g.id, gradeName: g.name, subjectName: s?.name ?? '', totalLessons: lessons };
      }
    }
    return { curriculumId: '', curriculumName: '', gradeId: gradeId ?? '', gradeName: '', subjectName: '', totalLessons: 0 };
  }

  async function scoresByStudent(): Promise<Map<string, { pct: number; trend: 'up' | 'down' | 'steady' }>> {
    const { data, error } = await db
      .from('submissions')
      .select('id, student_id, submitted_at, status, assessments!inner(organization_id, assessment_totals(total_score))')
      .eq('organization_id', orgId)
      .eq('status', 'approved')
      .order('submitted_at', { ascending: false });
    if (error || !data) return new Map();
    const ids = data.map((r) => r.id as string);
    if (!ids.length) return new Map();
    const { data: scores } = await db.from('submission_scores').select('submission_id, total_score').in('submission_id', ids);
    const scoreOf = new Map((scores ?? []).map((s) => [s.submission_id as string, Number(s.total_score)]));
    const perStudent = new Map<string, number[]>();
    for (const r of data as unknown as { id: string; student_id: string | null; assessments: { assessment_totals: { total_score: number } | { total_score: number }[] } }[]) {
      if (!r.student_id) continue;
      const total = Number(one(r.assessments.assessment_totals)?.total_score ?? 0);
      if (!total) continue;
      const pct = Math.round(((scoreOf.get(r.id) ?? 0) / total) * 100);
      const list = perStudent.get(r.student_id) ?? [];
      list.push(pct);
      perStudent.set(r.student_id, list);
    }
    const out = new Map<string, { pct: number; trend: 'up' | 'down' | 'steady' }>();
    perStudent.forEach((list, id) => {
      const [latest, prev] = list;
      out.set(id, { pct: latest, trend: prev === undefined || prev === latest ? 'steady' : latest > prev ? 'up' : 'down' });
    });
    return out;
  }

  type StudentDb = {
    id: string; full_name: string; student_code: string; parent_phone: string | null; student_phone: string | null;
    parent_whatsapp_consent: boolean; status: string;
    moodle_identifier: string | null; moodle_identifier_kind: MoodleIdKind | null;
    group_students: { group_id: string; left_at: string | null; groups: { name: string; archived_at: string | null } | null }[];
  };
  const STUDENT_COLUMNS =
    'id, full_name, student_code, parent_phone, student_phone, parent_whatsapp_consent, status, moodle_identifier, moodle_identifier_kind, group_students(group_id, left_at, groups(name, archived_at))';

  function toStudent(s: StudentDb, scores: Map<string, { pct: number; trend: 'up' | 'down' | 'steady' }>): StudentRow {
    const memberships = (s.group_students ?? []).filter((m) => !m.left_at && !one(m.groups)?.archived_at);
    const membership = memberships[0];
    const score = scores.get(s.id);
    const pct = score?.pct ?? 0;
    return {
      id: s.id,
      name: s.full_name,
      group: one(membership?.groups)?.name ?? '',
      groupId: membership?.group_id ?? '',
      groupIds: memberships.map((m) => m.group_id),
      parentPhone: localPhone(s.parent_phone),
      studentPhone: localPhone(s.student_phone),
      studentCode: s.student_code,
      latestScore: pct,
      totalScore: 100,
      trend: score?.trend ?? 'steady',
      hasScore: !!score,
      parentApproval: s.parent_whatsapp_consent,
      moodle: s.moodle_identifier && s.moodle_identifier_kind ? { kind: s.moodle_identifier_kind, value: s.moodle_identifier } : null,
      status: !score ? 'active' : pct >= 90 ? 'excellent' : pct < 60 ? 'at_risk' : 'active',
      weakLessons: [],
    };
  }

  async function insertStudents(inputs: StudentInput[]): Promise<number> {
    // Teachers can't read a student until he is in one of their groups, so the id
    // is made here and we don't ask the database to return the new row.
    const rows = inputs.map((i) => ({
      id: crypto.randomUUID(),
      organization_id: orgId,
      full_name: i.name.trim(),
      parent_phone: phoneOrNull(i.parentPhone) ?? null,
      student_phone: phoneOrNull(i.studentPhone) ?? null,
      parent_whatsapp_consent: i.parentApproval ?? false,
    }));
    if (!rows.length) return 0;
    const { error } = await db.from('students').insert(rows);
    if (error) fail(error, 'تعذّر حفظ الطالب.');
    const links = rows
      .flatMap((r, idx) =>
        [...new Set([inputs[idx].groupId, ...(inputs[idx].extraGroupIds ?? [])])].map((g) => ({ group_id: g, student_id: r.id, organization_id: orgId })),
      )
      .filter((l) => l.group_id);
    if (links.length) {
      const { error: linkError } = await db.from('group_students').insert(links);
      if (linkError) fail(linkError, 'تعذّر إضافة الطالب إلى المجموعة.');
    }
    return rows.length;
  }

  const toStatus = (s: string): Exam['status'] =>
    (['awaiting_papers', 'grading', 'needs_review', 'completed', 'reports_sent'].includes(s) ? s : 'awaiting_papers') as Exam['status'];

  type AssessmentDb = {
    id: string; title: string; kind: 'exam' | 'homework'; scheduled_on: string | null; status: string;
    submission_mode: 'link' | 'teacher_scan'; submission_code: string; submission_open: boolean;
    auto_send_reports: boolean; group_id: string; subject_id: string | null; created_at: string;
    groups: { name: string; group_students: { left_at: string | null }[] } | null;
    subjects: { name: string } | null;
    assessment_totals: { total_score: number; questions_count: number } | { total_score: number; questions_count: number }[] | null;
    submissions: { id: string }[];
  };
  const ASSESSMENT_COLUMNS =
    'id, title, kind, scheduled_on, status, submission_mode, submission_code, submission_open, auto_send_reports, group_id, subject_id, created_at, groups(name, group_students(left_at)), subjects(name), assessment_totals(total_score, questions_count), submissions(id)';

  function toAssessment(a: AssessmentDb): AssessmentRow {
    const totals = one(a.assessment_totals);
    const group = one(a.groups);
    return {
      id: a.id,
      title: a.title,
      type: a.kind,
      subject: one(a.subjects)?.name ?? '',
      group: group?.name ?? '',
      groupId: a.group_id,
      subjectId: a.subject_id,
      date: formatDate(a.scheduled_on ?? a.created_at),
      totalScore: Number(totals?.total_score ?? 0),
      uploadedCount: (a.submissions ?? []).length,
      totalStudents: (group?.group_students ?? []).filter((g) => !g.left_at).length,
      status: toStatus(a.status),
      submissionMode: a.submission_mode,
      autoSendReports: a.auto_send_reports,
      questionsCount: Number(totals?.questions_count ?? 0),
      submissionCode: a.submission_code,
      submissionOpen: a.submission_open,
      createdAt: a.created_at,
    };
  }

  async function loadGrades(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: (q: any) => any,
    extraJoin = '',
  ): Promise<QuestionGradeRow[]> {
    const columns = `id, submission_id, question_id, ai_score, ai_reason, ai_transcription, ai_confidence, ai_criteria, final_score, teacher_note, reviewed_at, questions(number, text, max_score, model_answer, lessons(title))${extraJoin ? `, ${extraJoin}` : ''}`;
    const { data, error } = await filter(db.from('question_grades').select(columns));
    if (error) fail(error, 'تعذّر تحميل الدرجات.');
    type Row = {
      id: string; submission_id: string; question_id: string; ai_score: number | null; ai_reason: string | null;
      ai_transcription: string | null; ai_confidence: number | null; ai_criteria: QuestionGradeRow['aiCriteria'] | null;
      final_score: number | null; teacher_note: string | null; reviewed_at: string | null;
      questions: { number: number; text: string; max_score: number; model_answer: string | null; lessons: { title: string } | null } | null;
    };
    return ((data ?? []) as unknown as Row[])
      .map((g) => {
        const q = one(g.questions);
        return {
          id: g.id,
          submissionId: g.submission_id,
          questionId: g.question_id,
          questionNumber: q?.number ?? 0,
          questionText: q?.text ?? '',
          maxScore: Number(q?.max_score ?? 0),
          modelAnswer: q?.model_answer ?? '',
          lesson: one(q?.lessons)?.title ?? '',
          aiScore: g.ai_score === null ? null : Number(g.ai_score),
          aiReason: g.ai_reason,
          aiTranscription: g.ai_transcription,
          aiConfidence: g.ai_confidence === null ? null : Number(g.ai_confidence),
          aiCriteria: g.ai_criteria ?? [],
          finalScore: g.final_score === null ? null : Number(g.final_score),
          teacherNote: g.teacher_note,
          reviewedAt: g.reviewed_at,
        };
      })
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }

  const base: Omit<DataStore, keyof SchoolStore> = {
    ...createSupabaseBilling(db, orgId),
    ...createSupabaseAi(db, orgId),
    mode: 'real',
    listCurricula,

    async listDiagnosticRows(groupId) {
      let q = db
        .from('question_grades')
        .select('submission_id, final_score, ai_criteria, questions!inner(number, max_score, lessons(title)), submissions!inner(student_id, status, submitted_at, assessments!inner(title, group_id))')
        .eq('organization_id', orgId)
        .eq('submissions.status', 'approved')
        .not('submissions.student_id', 'is', null)
        .limit(10000);
      if (groupId) q = q.eq('submissions.assessments.group_id', groupId);
      const { data, error } = await q;
      if (error) fail(error, 'تعذّر تحميل بيانات التشخيص.');
      type Row = {
        submission_id: string; final_score: number | null; ai_criteria: { criterion: string; met: boolean }[] | null;
        questions: { number: number; max_score: number; lessons: { title: string } | null } | null;
        submissions: { student_id: string; submitted_at: string; assessments: { title: string; group_id: string } | null } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => {
        const q2 = one(r.questions);
        const sub = one(r.submissions);
        const a = one(sub?.assessments);
        return {
          submissionId: r.submission_id,
          studentId: sub?.student_id ?? '',
          groupId: a?.group_id ?? '',
          assessmentTitle: a?.title ?? '',
          submittedAt: sub?.submitted_at ?? '',
          questionNumber: q2?.number ?? 0,
          lesson: one(q2?.lessons)?.title ?? '',
          finalScore: Number(r.final_score ?? 0),
          maxScore: Number(q2?.max_score ?? 0),
          criteria: r.ai_criteria ?? [],
        };
      });
    },

    async getDashboard() {
      const now = Date.now();
      const weekAgo = new Date(now - 7 * 86400000).toISOString();
      const monthAgo = new Date(now - 30 * 86400000).toISOString();
      const twoMonthsAgo = new Date(now - 60 * 86400000).toISOString();
      const month = new Date();
      const monthStart = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;
      const [groups, students, week, review, recent, reports, lessonGrades, tuition] = await Promise.all([
        db.from('groups').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('archived_at', null),
        db.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
        db.from('submissions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('submitted_at', weekAgo),
        db.from('submissions').select('id').eq('organization_id', orgId).eq('status', 'needs_review'),
        db
          .from('submissions')
          .select('id, approved_at, assessments(assessment_totals(total_score))')
          .eq('organization_id', orgId)
          .eq('status', 'approved')
          .gte('approved_at', twoMonthsAgo),
        db.from('reports').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'sent'),
        db
          .from('question_grades')
          .select('final_score, ai_criteria, questions!inner(max_score, lessons!inner(title)), submissions!inner(status)')
          .eq('organization_id', orgId)
          .eq('submissions.status', 'approved')
          .limit(5000),
        db.from('tuition_balances').select('student_id, amount_due, paid_amount, status').eq('organization_id', orgId).eq('period_month', monthStart),
      ]);

      const reviewIds = (review.data ?? []).map((r) => r.id as string);
      let answersAwaitingReview = 0;
      const recentRows = (recent.data ?? []) as unknown as { id: string; approved_at: string; assessments: { assessment_totals: { total_score: number } | { total_score: number }[] | null } | null }[];
      const scoreIds = [...reviewIds, ...recentRows.map((r) => r.id)];
      const { data: scores } = scoreIds.length
        ? await db.from('submission_scores').select('submission_id, total_score, low_confidence_unreviewed').in('submission_id', scoreIds)
        : { data: [] };
      const scoreOf = new Map((scores ?? []).map((x) => [x.submission_id as string, x]));
      for (const id of reviewIds) answersAwaitingReview += Number(scoreOf.get(id)?.low_confidence_unreviewed ?? 0);
      const pctList = (from: string, to: string) =>
        recentRows
          .filter((r) => r.approved_at >= from && r.approved_at < to)
          .map((r) => {
            const total = Number(one(one(r.assessments)?.assessment_totals)?.total_score ?? 0);
            return total ? (Number(scoreOf.get(r.id)?.total_score ?? 0) / total) * 100 : null;
          })
          .filter((x): x is number => x !== null);
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((n, x) => n + x, 0) / xs.length) * 10) / 10 : null);
      const nowIso = new Date(now + 1000).toISOString();
      const avgPct = avg(pctList(monthAgo, nowIso));
      const prevPct = avg(pctList(twoMonthsAgo, monthAgo));

      const lessonMap = new Map<string, { got: number; max: number; miss: Map<string, number> }>();
      for (const g of (lessonGrades.data ?? []) as unknown as {
        final_score: number | null; ai_criteria: { criterion: string; met: boolean }[] | null;
        questions: { max_score: number; lessons: { title: string } | null } | null;
      }[]) {
        const q = one(g.questions);
        const title = one(q?.lessons)?.title;
        if (!q || !title) continue;
        const t = lessonMap.get(title) ?? { got: 0, max: 0, miss: new Map() };
        t.got += Number(g.final_score ?? 0);
        t.max += Number(q.max_score);
        for (const c of g.ai_criteria ?? []) if (!c.met) t.miss.set(c.criterion, (t.miss.get(c.criterion) ?? 0) + 1);
        lessonMap.set(title, t);
      }
      const weakLessons = [...lessonMap.entries()]
        .map(([lesson, t]) => ({
          lesson,
          mastery: t.max ? Math.round((t.got / t.max) * 100) : 0,
          commonMiss: [...t.miss.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        }))
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 3);

      let tuitionSummary: DashboardSummary['tuition'] = null;
      if (!tuition.error && tuition.data && tuition.data.length) {
        const due = tuition.data.reduce((n, r) => n + Number(r.amount_due), 0);
        const paid = tuition.data.reduce((n, r) => n + Math.min(Number(r.paid_amount), Number(r.amount_due)), 0);
        tuitionSummary = {
          collected: paid,
          remaining: Math.max(0, due - paid),
          unpaidStudents: tuition.data.filter((r) => r.status !== 'paid').length,
          pct: due ? Math.round((paid / due) * 1000) / 10 : 100,
        };
      }

      return {
        groupsCount: groups.count ?? 0,
        studentsCount: students.count ?? 0,
        papersThisWeek: week.count ?? 0,
        answersAwaitingReview,
        papersAwaitingReview: reviewIds.length,
        avgPct,
        avgPctChange: avgPct !== null && prevPct !== null ? Math.round((avgPct - prevPct) * 10) / 10 : null,
        reportsSent: reports.count ?? 0,
        weakLessons,
        tuition: tuitionSummary,
      };
    },

    async listGroups() {
      const { data, error } = await db
        .from('groups')
        .select('id, name, label, grade_id, subject_id, schedule, group_students(left_at, students(status)), group_lesson_progress(lesson_id)')
        .eq('organization_id', orgId)
        .is('archived_at', null)
        .order('created_at');
      if (error) fail(error, 'تعذّر تحميل المجموعات.');
      const out: Group[] = [];
      for (const g of (data ?? []) as unknown as {
        id: string; name: string; label: string | null; grade_id: string | null; subject_id: string | null; schedule: string | null;
        group_students: { left_at: string | null; students: { status: string } | { status: string }[] | null }[]; group_lesson_progress: { lesson_id: string }[];
      }[]) {
        const names = await curriculumNames(g.grade_id, g.subject_id);
        out.push({
          id: g.id,
          name: g.name,
          type: g.label ?? '',
          curriculumId: names.curriculumId,
          gradeId: g.grade_id ?? '',
          subjectId: g.subject_id ?? '',
          curriculumName: names.curriculumName,
          gradeName: names.gradeName,
          subjectName: names.subjectName,
          studentCount: (g.group_students ?? []).filter((s) => !s.left_at && one(s.students)?.status !== 'archived').length,
          avgScore: 0,
          schedule: g.schedule ?? '',
          totalLessonsCount: names.totalLessons,
          taughtLessonsCount: (g.group_lesson_progress ?? []).length,
        });
      }
      return out;
    },

    async createGroup(input: NewGroupInput) {
      const id = crypto.randomUUID();
      const { error } = await db.from('groups').insert({
        id,
        organization_id: orgId,
        name: input.name.trim(),
        label: input.label?.trim() || null,
        grade_id: input.gradeId,
        subject_id: input.subjectId,
        schedule: input.schedule?.trim() || null,
        ...(input.classGroupId ? { class_group_id: input.classGroupId } : {}),
      });
      if (error) fail(error, 'تعذّر إنشاء المجموعة.');
      const names = await curriculumNames(input.gradeId, input.subjectId);
      return {
        id,
        name: input.name.trim(),
        type: input.label ?? '',
        curriculumId: names.curriculumId,
        gradeId: input.gradeId ?? '',
        subjectId: input.subjectId ?? '',
        curriculumName: names.curriculumName,
        gradeName: names.gradeName,
        subjectName: names.subjectName,
        studentCount: 0,
        avgScore: 0,
        schedule: input.schedule ?? '',
        totalLessonsCount: names.totalLessons,
        taughtLessonsCount: 0,
      };
    },

    async updateGroup(id, input) {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.label !== undefined) patch.label = input.label.trim() || null;
      if (input.gradeId !== undefined) patch.grade_id = input.gradeId;
      if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
      if (input.schedule !== undefined) patch.schedule = input.schedule.trim() || null;
      if (input.classGroupId !== undefined) patch.class_group_id = input.classGroupId;
      const { error } = await db.from('groups').update(patch).eq('id', id);
      if (error) fail(error, 'تعذّر حفظ المجموعة.');
    },

    async archiveGroup(id) {
      const { error } = await db.from('groups').update({ archived_at: new Date().toISOString() }).eq('id', id);
      if (error) fail(error, 'تعذّر إيقاف المجموعة.');
    },

    async listArchivedGroups() {
      const { data, error } = await db
        .from('groups')
        .select('id, name')
        .eq('organization_id', orgId)
        .not('archived_at', 'is', null)
        .order('name');
      if (error) fail(error, 'تعذّر تحميل المجموعات الموقوفة.');
      return (data ?? []) as { id: string; name: string }[];
    },

    async restoreGroup(id) {
      const { error } = await db.from('groups').update({ archived_at: null }).eq('id', id);
      if (error) fail(error, 'تعذّر تفعيل المجموعة.');
    },

    async listStudents() {
      const [{ data, error }, scores] = await Promise.all([
        db.from('students').select(STUDENT_COLUMNS).eq('organization_id', orgId).eq('status', 'active').order('full_name'),
        scoresByStudent(),
      ]);
      if (error) fail(error, 'تعذّر تحميل الطلاب.');
      return ((data ?? []) as unknown as StudentDb[]).map((s) => toStudent(s, scores));
    },

    async getStudent(id) {
      const [{ data, error }, scores] = await Promise.all([
        db.from('students').select(STUDENT_COLUMNS).eq('id', id).maybeSingle(),
        scoresByStudent(),
      ]);
      if (error) fail(error, 'تعذّر تحميل بيانات الطالب.');
      return data ? toStudent(data as unknown as StudentDb, scores) : null;
    },

    async createStudent(input) {
      await insertStudents([input]);
    },

    createStudents: insertStudents,

    async updateStudent(id, input) {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.full_name = input.name.trim();
      if (input.parentPhone !== undefined) patch.parent_phone = phoneOrNull(input.parentPhone);
      if (input.studentPhone !== undefined) patch.student_phone = phoneOrNull(input.studentPhone);
      if (input.parentApproval !== undefined) patch.parent_whatsapp_consent = input.parentApproval;
      if (input.moodle !== undefined) {
        const value = input.moodle?.value.trim() || null;
        patch.moodle_identifier = value;
        patch.moodle_identifier_kind = value ? input.moodle!.kind : null;
      }
      if (Object.keys(patch).length) {
        const { error } = await db.from('students').update(patch).eq('id', id);
        if (error) fail(error, 'تعذّر حفظ بيانات الطالب.');
      }
      if (input.groupId !== undefined) {
        const now = new Date().toISOString();
        const { error: leaveError } = await db
          .from('group_students')
          .update({ left_at: now })
          .eq('student_id', id)
          .is('left_at', null)
          .neq('group_id', input.groupId);
        if (leaveError) fail(leaveError, 'تعذّر نقل الطالب.');
        if (input.groupId) {
          const { error: joinError } = await db
            .from('group_students')
            .upsert({ group_id: input.groupId, student_id: id, organization_id: orgId, left_at: null }, { onConflict: 'group_id,student_id' });
          if (joinError) fail(joinError, 'تعذّر نقل الطالب.');
        }
      }
    },

    async addStudentsToGroup(groupId, studentIds) {
      const ids = [...new Set(studentIds)];
      if (!ids.length) return 0;
      const { error } = await db
        .from('group_students')
        .upsert(
          ids.map((id) => ({ group_id: groupId, student_id: id, organization_id: orgId, left_at: null })),
          { onConflict: 'group_id,student_id' },
        );
      if (error) fail(error, 'تعذّر إضافة الطلاب إلى المجموعة.');
      return ids.length;
    },

    async setStudentGroups(studentId, groupIds) {
      // Leave the groups that were unticked. RLS limits this to groups the user can see,
      // so a teacher never takes a student out of another teacher's group.
      let leave = db.from('group_students').update({ left_at: new Date().toISOString() }).eq('student_id', studentId).is('left_at', null);
      if (groupIds.length) leave = leave.not('group_id', 'in', `(${groupIds.join(',')})`);
      const { error: leaveError } = await leave;
      if (leaveError) fail(leaveError, 'تعذّر حفظ مجموعات الطالب.');
      if (groupIds.length) {
        const { error } = await db
          .from('group_students')
          .upsert(
            groupIds.map((g) => ({ group_id: g, student_id: studentId, organization_id: orgId, left_at: null })),
            { onConflict: 'group_id,student_id' },
          );
        if (error) fail(error, 'تعذّر حفظ مجموعات الطالب.');
      }
    },

    async archiveStudent(id) {
      const { error } = await db.from('students').update({ status: 'archived' }).eq('id', id);
      if (error) fail(error, 'تعذّر تعطيل الطالب.');
    },

    async listArchivedStudents() {
      const { data, error } = await db
        .from('students')
        .select(STUDENT_COLUMNS)
        .eq('organization_id', orgId)
        .eq('status', 'archived')
        .order('full_name');
      if (error) fail(error, 'تعذّر تحميل الطلاب المعطّلين.');
      return ((data ?? []) as unknown as StudentDb[]).map((s) => toStudent(s, new Map()));
    },

    async restoreStudent(id) {
      const { error } = await db.from('students').update({ status: 'active' }).eq('id', id);
      if (error) fail(error, 'تعذّر تفعيل الطالب.');
    },

    async deleteStudent(id) {
      // RLS lets only the organization's owner delete; a teacher gets 0 rows back.
      const { data, error } = await db.from('students').delete().eq('id', id).select('id');
      if (error) fail(error, 'تعذّر حذف الطالب.');
      if (!data?.length) throw new Error('حذف الطالب متاح لمالك الجهة فقط. يمكنك تعطيله بدلاً من ذلك.');
    },

    async getStudentHistory(id) {
      const { data, error } = await db
        .from('submissions')
        .select('id, assessment_id, submitted_at, approved_at, assessments(title, scheduled_on, assessment_totals(total_score, questions_count)), question_grades(final_score, questions(max_score, lessons(id, title)))')
        .eq('student_id', id)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });
      if (error) fail(error, 'تعذّر تحميل سجل الطالب.');
      type Row = {
        id: string; assessment_id: string; submitted_at: string; approved_at: string | null;
        assessments: { title: string; scheduled_on: string | null; assessment_totals: { total_score: number; questions_count: number } | { total_score: number; questions_count: number }[] | null } | null;
        question_grades: { final_score: number | null; questions: { max_score: number; lessons: { id: string; title: string } | null } | null }[];
      };
      const lessonTotals = new Map<string, { id: string; got: number; max: number }>();
      const papers = ((data ?? []) as unknown as Row[]).map((r) => {
        const a = one(r.assessments);
        const totals = one(a?.assessment_totals);
        let score = 0;
        for (const g of r.question_grades ?? []) {
          score += Number(g.final_score ?? 0);
          const q = one(g.questions);
          const ls = one(q?.lessons);
          const lesson = ls?.title;
          if (q && ls && lesson) {
            const t = lessonTotals.get(lesson) ?? { id: ls.id, got: 0, max: 0 };
            t.got += Number(g.final_score ?? 0);
            t.max += Number(q.max_score);
            lessonTotals.set(lesson, t);
          }
        }
        return {
          submissionId: r.id,
          assessmentId: r.assessment_id,
          title: a?.title ?? '',
          score,
          total: Number(totals?.total_score ?? 0),
          date: formatDate(r.approved_at ?? a?.scheduled_on ?? r.submitted_at),
          questionsCount: Number(totals?.questions_count ?? 0),
        };
      });
      const lessons = [...lessonTotals.entries()]
        .map(([lesson, t]) => ({ lesson, lessonId: t.id, mastery: t.max ? Math.round((t.got / t.max) * 100) : 0 }))
        .sort((a, b) => a.mastery - b.mastery);
      return { papers, lessons };
    },

    async getTaughtLessons(groupId) {
      const { data, error } = await db.from('group_lesson_progress').select('lesson_id, taught_at').eq('group_id', groupId);
      if (error) fail(error, 'تعذّر تحميل «وين وصلنا».');
      const out: TaughtLessons = {};
      for (const r of data ?? []) out[r.lesson_id as string] = r.taught_at as string;
      return out;
    },

    async setLessonTaught(groupId, lessonId, taught) {
      const { error } = taught
        ? await db.from('group_lesson_progress').upsert(
            { group_id: groupId, organization_id: orgId, lesson_id: lessonId },
            { onConflict: 'group_id,lesson_id', ignoreDuplicates: true },
          )
        : await db.from('group_lesson_progress').delete().eq('group_id', groupId).eq('lesson_id', lessonId);
      if (error) fail(error, 'تعذّر حفظ التقدّم.');
    },

    async setLessonsTaught(groupId, lessonIds, taught) {
      if (!lessonIds.length) return;
      const { error } = taught
        ? await db.from('group_lesson_progress').upsert(
            lessonIds.map((lessonId) => ({ group_id: groupId, organization_id: orgId, lesson_id: lessonId })),
            { onConflict: 'group_id,lesson_id', ignoreDuplicates: true },
          )
        : await db.from('group_lesson_progress').delete().eq('group_id', groupId).in('lesson_id', lessonIds);
      if (error) fail(error, 'تعذّر حفظ التقدّم.');
    },

    async getExaminedLessons(groupId) {
      const { data, error } = await db
        .from('questions')
        .select('lesson_id, max_score, assessments!inner(group_id), question_grades(final_score, submissions(status))')
        .eq('assessments.group_id', groupId)
        .not('lesson_id', 'is', null);
      if (error) fail(error, 'تعذّر تحميل نتائج الدروس.');
      const totals = new Map<string, { got: number; max: number }>();
      for (const q of (data ?? []) as unknown as {
        lesson_id: string; max_score: number; question_grades: { final_score: number | null; submissions: { status: string } | null }[];
      }[]) {
        const t = totals.get(q.lesson_id) ?? { got: 0, max: 0 };
        for (const g of q.question_grades ?? []) {
          if (one(g.submissions)?.status !== 'approved') continue;
          t.got += Number(g.final_score ?? 0);
          t.max += Number(q.max_score);
        }
        totals.set(q.lesson_id, t);
      }
      const out: Record<string, number | null> = {};
      totals.forEach((t, id) => (out[id] = t.max ? Math.round((t.got / t.max) * 100) : null));
      return out;
    },

    async listAssessments() {
      const { data, error } = await db
        .from('assessments')
        .select(ASSESSMENT_COLUMNS)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) fail(error, 'تعذّر تحميل الواجبات والامتحانات.');
      return ((data ?? []) as unknown as AssessmentDb[]).map(toAssessment);
    },

    async getAssessment(id) {
      const { data, error } = await db
        .from('assessments')
        .select(`${ASSESSMENT_COLUMNS}, questions(id, number, text, type, max_score, model_answer, lesson_id, lessons(title), rubric_criteria(description, points, sort_order))`)
        .eq('id', id)
        .maybeSingle();
      if (error) fail(error, 'تعذّر تحميل الامتحان.');
      if (!data) return null;
      type Q = {
        id: string; number: number; text: string; type: AssessmentDetail['questions'][number]['type']; max_score: number;
        model_answer: string | null; lesson_id: string | null; lessons: { title: string } | null;
        rubric_criteria: { description: string; points: number; sort_order: number }[];
      };
      const row = data as unknown as AssessmentDb & { questions: Q[] };
      return {
        ...toAssessment(row),
        questions: [...(row.questions ?? [])]
          .sort((a, b) => a.number - b.number)
          .map((q) => ({
            id: q.id,
            questionNumber: q.number,
            text: q.text,
            type: q.type,
            maxScore: Number(q.max_score),
            lesson: one(q.lessons)?.title ?? '',
            lessonId: q.lesson_id,
            modelAnswer: q.model_answer ?? '',
            criteria: [...(q.rubric_criteria ?? [])].sort(bySort).map((c) => ({ description: c.description, points: Number(c.points) })),
          })),
      };
    },

    async createAssessment(input: NewAssessmentInput) {
      const id = crypto.randomUUID();
      const { error } = await db.from('assessments').insert({
        id,
        organization_id: orgId,
        group_id: input.groupId,
        subject_id: input.subjectId,
        title: input.title.trim(),
        kind: input.kind,
        scheduled_on: input.scheduledOn,
        status: 'awaiting_papers',
        submission_mode: input.submissionMode,
        submission_open: input.submissionMode === 'link',
        auto_send_reports: input.autoSendReports,
      });
      if (error) fail(error, 'تعذّر حفظ الامتحان.');
      const questions = input.questions.map((q, idx) => ({
        id: crypto.randomUUID(),
        assessment_id: id,
        number: idx + 1,
        text: q.text.trim() || `السؤال ${idx + 1}`,
        type: q.type,
        max_score: q.maxScore,
        model_answer: q.modelAnswer.trim() || null,
        lesson_id: q.lessonId,
      }));
      if (questions.length) {
        const { error: qError } = await db.from('questions').insert(questions);
        if (qError) {
          await db.from('assessments').delete().eq('id', id);
          fail(qError, 'تعذّر حفظ الأسئلة.');
        }
        const criteria = input.questions.flatMap((q, idx) =>
          q.criteria
            .filter((c) => c.description.trim())
            .map((c, order) => ({ question_id: questions[idx].id, description: c.description.trim(), points: c.points, sort_order: order })),
        );
        if (criteria.length) {
          const { error: cError } = await db.from('rubric_criteria').insert(criteria);
          if (cError) {
            await db.from('assessments').delete().eq('id', id);
            fail(cError, 'تعذّر حفظ معايير التصحيح.');
          }
        }
      }
      return id;
    },

    async updateAssessment(id, patch) {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.submissionOpen !== undefined) row.submission_open = patch.submissionOpen;
      if (patch.autoSendReports !== undefined) row.auto_send_reports = patch.autoSendReports;
      const { error } = await db.from('assessments').update(row).eq('id', id);
      if (error) fail(error, 'تعذّر حفظ التغييرات.');
    },

    async deleteAssessment(id) {
      const { error } = await db.from('assessments').delete().eq('id', id);
      if (error) fail(error, 'تعذّر حذف الامتحان.');
    },

    async listSubmissions(assessmentId) {
      const { data, error } = await db
        .from('submissions')
        .select('id, assessment_id, student_id, source, status, submitted_at, students(full_name, student_code), submission_pages(id)')
        .eq('assessment_id', assessmentId)
        .order('submitted_at');
      if (error) fail(error, 'تعذّر تحميل التسليمات.');
      const rows = (data ?? []) as unknown as {
        id: string; assessment_id: string; student_id: string | null; source: SubmissionRow['source']; status: SubmissionRow['status'];
        submitted_at: string; students: { full_name: string; student_code: string } | null; submission_pages: { id: string }[];
      }[];
      const { data: scores } = rows.length
        ? await db.from('submission_scores').select('submission_id, total_score, low_confidence_unreviewed').in('submission_id', rows.map((r) => r.id))
        : { data: [] };
      const scoreOf = new Map((scores ?? []).map((s) => [s.submission_id as string, s]));
      return rows.map((r) => {
        const st = one(r.students);
        const sc = scoreOf.get(r.id);
        return {
          id: r.id,
          assessmentId: r.assessment_id,
          studentId: r.student_id,
          studentName: st?.full_name ?? 'طالب غير محدد',
          studentCode: st?.student_code ?? '',
          source: r.source,
          status: r.status,
          totalScore: Number(sc?.total_score ?? 0),
          lowConfidenceUnreviewed: Number(sc?.low_confidence_unreviewed ?? 0),
          submittedAt: r.submitted_at,
          pageCount: (r.submission_pages ?? []).length,
        };
      });
    },

    async listQuestionGrades(submissionId) {
      return loadGrades((q) => q.eq('submission_id', submissionId));
    },

    async listAssessmentGrades(assessmentId) {
      return loadGrades((q) => q.eq('submissions.assessment_id', assessmentId), 'submissions!inner(assessment_id)');
    },

    async saveTeacherGrade(questionGradeId, finalScore, teacherNote) {
      // The database keeps the before/after/who/when history by itself (grade_edits).
      const { error } = await db.from('question_grades').update({ final_score: finalScore, teacher_note: teacherNote }).eq('id', questionGradeId);
      if (error) fail(error, 'تعذّر حفظ الدرجة.');
    },

    async uploadPaper(assessmentId, pages, studentId = null) {
      const id = crypto.randomUUID();
      const { error } = await db.from('submissions').insert({
        id,
        organization_id: orgId,
        assessment_id: assessmentId,
        student_id: studentId,
        source: 'teacher_scan',
      });
      if (error) fail(error, 'تعذّر حفظ الورقة.');
      const rows = [];
      for (let i = 0; i < pages.length; i++) {
        const path = `${orgId}/${assessmentId}/${id}/${i + 1}.jpg`;
        const bytes = Uint8Array.from(atob(pages[i].base64), (c) => c.charCodeAt(0));
        const { error: upError } = await db.storage
          .from('submission-pages')
          .upload(path, new Blob([bytes], { type: pages[i].mediaType }), { contentType: pages[i].mediaType, upsert: true });
        if (upError) {
          await db.from('submissions').delete().eq('id', id);
          fail(upError, 'تعذّر رفع صورة الورقة.');
        }
        rows.push({ submission_id: id, organization_id: orgId, page_number: i + 1, storage_path: path });
      }
      const { error: pagesError } = await db.from('submission_pages').insert(rows);
      if (pagesError) fail(pagesError, 'تعذّر حفظ صفحات الورقة.');
      return id;
    },

    async gradeSubmission(submissionId) {
      const { data, error } = await db.functions.invoke('grade-submission', { body: { submissionId } });
      if (error) {
        let message = 'تعذّر تصحيح الورقة الآن.';
        const ctx = (error as { context?: Response }).context;
        try {
          const body = ctx ? await ctx.json() : null;
          if (body?.error) message = body.error;
        } catch {
          // keep the generic message
        }
        return { ok: false, error: message };
      }
      return { ok: !!data?.ok, error: data?.error };
    },

    async getPageUrls(submissionId) {
      const { data, error } = await db
        .from('submission_pages')
        .select('page_number, storage_path, corrected_storage_path')
        .eq('submission_id', submissionId)
        .order('page_number');
      if (error) fail(error, 'تعذّر تحميل صور الورقة.');
      const paths = (data ?? []).map((p) => p.storage_path as string);
      if (!paths.length) return [];
      const { data: signed, error: signError } = await db.storage.from('submission-pages').createSignedUrls(paths, 60 * 30);
      if (signError) fail(signError, 'تعذّر عرض صور الورقة.');
      return (signed ?? []).map((s) => s.signedUrl ?? '').filter(Boolean);
    },

    async assignStudent(submissionId, studentId) {
      const { error } = await db.from('submissions').update({ student_id: studentId }).eq('id', submissionId);
      if (error) fail(error, error.code === '23505' ? 'لهذا الطالب ورقة أخرى في نفس الامتحان.' : 'تعذّر ربط الورقة بالطالب.');
    },

    async deleteSubmission(submissionId) {
      const { data } = await db.from('submission_pages').select('storage_path').eq('submission_id', submissionId);
      const paths = (data ?? []).map((p) => p.storage_path as string);
      if (paths.length) await db.storage.from('submission-pages').remove(paths);
      const { error } = await db.from('submissions').delete().eq('id', submissionId);
      if (error) fail(error, 'تعذّر حذف الورقة.');
    },

    async listReportStatuses(submissionIds) {
      if (!submissionIds.length) return {};
      const { data, error } = await db
        .from('reports')
        .select('submission_id, status, created_at')
        .in('submission_id', submissionIds)
        .order('created_at', { ascending: true });
      if (error) fail(error, 'تعذّر تحميل حالة التقارير.');
      const out: Record<string, ReportStatus> = {};
      for (const r of data ?? []) out[r.submission_id as string] = r.status as ReportStatus;
      return out;
    },

    async queueReports(items) {
      const rows = items.map((i) => ({
        id: crypto.randomUUID(),
        organization_id: orgId,
        student_id: i.studentId,
        submission_id: i.submissionId,
        recipient_phone: toInternationalPhone(i.phone),
        body: i.body,
        status: 'queued',
      }));
      const bad = rows.find((r) => !r.recipient_phone);
      if (bad) throw new DataError('أحد أرقام أولياء الأمور غير صحيح. صحّحه من شاشة الطلاب.');
      const { error } = await db.from('reports').insert(rows);
      if (error) fail(error, 'تعذّر تجهيز التقارير.');
      const { data, error: fnError } = await db.functions.invoke('send-reports', { body: { reportIds: rows.map((r) => r.id) } });
      if (fnError) return { queued: rows.length, sent: 0, error: 'حُفظت التقارير بانتظار تفعيل إرسال واتساب على الخادم.' };
      return { queued: rows.length, sent: Number(data?.sent ?? 0), error: data?.error };
    },

    async weeklyReportPreview() {
      const { data, error } = await db.rpc('weekly_report_preview', { p_org: orgId });
      if (error) fail(error, 'تعذّر تحميل التقرير الأسبوعي.');
      type R = {
        student_id: string; student_name: string; parent_phone: string | null; consent: boolean; subject_name: string | null;
        papers: number; body: string; last_status: string | null; last_period_end: string | null;
      };
      return ((data ?? []) as R[]).map(
        (r): WeeklyReportRow => ({
          studentId: r.student_id,
          studentName: r.student_name,
          parentPhone: localPhone(r.parent_phone),
          consent: r.consent,
          subjectName: r.subject_name ?? '',
          papers: r.papers,
          body: r.body,
          lastStatus: (r.last_status as ReportStatus | null) ?? null,
          lastPeriodEnd: r.last_period_end,
        }),
      );
    },

    async getWeeklyReportsEnabled() {
      const { data, error } = await db.from('organizations').select('weekly_reports_enabled').eq('id', orgId).maybeSingle();
      if (error) fail(error, 'تعذّر تحميل الإعداد.');
      return data?.weekly_reports_enabled !== false;
    },

    async setWeeklyReportsEnabled(on) {
      const { error } = await db.from('organizations').update({ weekly_reports_enabled: on }).eq('id', orgId);
      if (error) fail(error, 'تعذّر حفظ الإعداد. هذا الإعداد لمالك الجهة فقط.');
    },

    async approveSubmission(submissionId) {
      const { error } = await db.from('submissions').update({ status: 'approved' }).eq('id', submissionId);
      if (error) fail(error, 'تعذّر اعتماد الورقة.');
    },
  };
  return { ...base, ...createSupabaseSchool(db, orgId, base) };
}
