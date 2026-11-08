// The real data store: reads and writes the Supabase database.
// Row Level Security in the database decides what each person may see; this
// file only shapes the rows for the screens.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Curriculum, Exam, Group } from '../types';
import { toInternationalPhone } from '../lib/phone';
import { PLATFORM_CONFIG } from '../mockData';
import type {
  AssessmentDetail,
  AssessmentRow,
  DataStore,
  NewAssessmentInput,
  NewGroupInput,
  QuestionGradeRow,
  StudentInput,
  StudentRow,
  SubmissionRow,
  TaughtLessons,
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
  let curriculaCache: Promise<Curriculum[]> | null = null;

  const listCurricula = (): Promise<Curriculum[]> => {
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
    group_students: { group_id: string; left_at: string | null; groups: { name: string; archived_at: string | null } | null }[];
  };
  const STUDENT_COLUMNS =
    'id, full_name, student_code, parent_phone, student_phone, parent_whatsapp_consent, status, group_students(group_id, left_at, groups(name, archived_at))';

  function toStudent(s: StudentDb, scores: Map<string, { pct: number; trend: 'up' | 'down' | 'steady' }>): StudentRow {
    const membership = (s.group_students ?? []).find((m) => !m.left_at && !one(m.groups)?.archived_at);
    const score = scores.get(s.id);
    const pct = score?.pct ?? 0;
    return {
      id: s.id,
      name: s.full_name,
      group: one(membership?.groups)?.name ?? '',
      groupId: membership?.group_id ?? '',
      parentPhone: localPhone(s.parent_phone),
      studentPhone: localPhone(s.student_phone),
      studentCode: s.student_code,
      latestScore: pct,
      totalScore: 100,
      trend: score?.trend ?? 'steady',
      parentApproval: s.parent_whatsapp_consent,
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
      .map((r, idx) => ({ group_id: inputs[idx].groupId, student_id: r.id, organization_id: orgId }))
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

  return {
    mode: 'real',
    listCurricula,

    async listGroups() {
      const { data, error } = await db
        .from('groups')
        .select('id, name, label, grade_id, subject_id, schedule, group_students(left_at), group_lesson_progress(lesson_id)')
        .eq('organization_id', orgId)
        .is('archived_at', null)
        .order('created_at');
      if (error) fail(error, 'تعذّر تحميل المجموعات.');
      const out: Group[] = [];
      for (const g of (data ?? []) as unknown as {
        id: string; name: string; label: string | null; grade_id: string | null; subject_id: string | null; schedule: string | null;
        group_students: { left_at: string | null }[]; group_lesson_progress: { lesson_id: string }[];
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
          studentCount: (g.group_students ?? []).filter((s) => !s.left_at).length,
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
      const { error } = await db.from('groups').update(patch).eq('id', id);
      if (error) fail(error, 'تعذّر حفظ المجموعة.');
    },

    async archiveGroup(id) {
      const { error } = await db.from('groups').update({ archived_at: new Date().toISOString() }).eq('id', id);
      if (error) fail(error, 'تعذّر أرشفة المجموعة.');
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

    async archiveStudent(id) {
      const { error } = await db.from('students').update({ status: 'archived' }).eq('id', id);
      if (error) fail(error, 'تعذّر أرشفة الطالب.');
    },

    async getStudentHistory(id) {
      const { data, error } = await db
        .from('submissions')
        .select('id, assessment_id, submitted_at, approved_at, assessments(title, scheduled_on, assessment_totals(total_score, questions_count)), question_grades(final_score, questions(max_score, lessons(title)))')
        .eq('student_id', id)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });
      if (error) fail(error, 'تعذّر تحميل سجل الطالب.');
      type Row = {
        id: string; assessment_id: string; submitted_at: string; approved_at: string | null;
        assessments: { title: string; scheduled_on: string | null; assessment_totals: { total_score: number; questions_count: number } | { total_score: number; questions_count: number }[] | null } | null;
        question_grades: { final_score: number | null; questions: { max_score: number; lessons: { title: string } | null } | null }[];
      };
      const lessonTotals = new Map<string, { got: number; max: number }>();
      const papers = ((data ?? []) as unknown as Row[]).map((r) => {
        const a = one(r.assessments);
        const totals = one(a?.assessment_totals);
        let score = 0;
        for (const g of r.question_grades ?? []) {
          score += Number(g.final_score ?? 0);
          const q = one(g.questions);
          const lesson = one(q?.lessons)?.title;
          if (q && lesson) {
            const t = lessonTotals.get(lesson) ?? { got: 0, max: 0 };
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
        .map(([lesson, t]) => ({ lesson, mastery: t.max ? Math.round((t.got / t.max) * 100) : 0 }))
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
      const { data, error } = await db
        .from('question_grades')
        .select('id, submission_id, question_id, ai_score, ai_reason, ai_transcription, ai_confidence, ai_criteria, final_score, teacher_note, reviewed_at, questions(number, text, max_score, model_answer)')
        .eq('submission_id', submissionId);
      if (error) fail(error, 'تعذّر تحميل الدرجات.');
      type Row = {
        id: string; submission_id: string; question_id: string; ai_score: number | null; ai_reason: string | null;
        ai_transcription: string | null; ai_confidence: number | null; ai_criteria: QuestionGradeRow['aiCriteria'] | null;
        final_score: number | null; teacher_note: string | null; reviewed_at: string | null;
        questions: { number: number; text: string; max_score: number; model_answer: string | null } | null;
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
    },

    async saveTeacherGrade(questionGradeId, finalScore, teacherNote) {
      // The database keeps the before/after/who/when history by itself (grade_edits).
      const { error } = await db.from('question_grades').update({ final_score: finalScore, teacher_note: teacherNote }).eq('id', questionGradeId);
      if (error) fail(error, 'تعذّر حفظ الدرجة.');
    },

    async approveSubmission(submissionId) {
      const { error } = await db.from('submissions').update({ status: 'approved' }).eq('id', submissionId);
      if (error) fail(error, 'تعذّر اعتماد الورقة.');
    },
  };
}
