// AI tools and the organization's question bank.
// Real mode calls the `ai-tools` Edge Function (the AI key stays on the
// server). Demo mode returns sample answers built from the demo curriculum so
// the screens can be tried without any account.
import type { SupabaseClient } from '@supabase/supabase-js';
import { CURRICULA_DATA } from '../mockData';
import type { PaperPage } from './types';

export type QType = 'multiple_choice' | 'short_answer' | 'problem_solving' | 'essay';

export interface DraftQuestion {
  lessonId: string | null;
  outcome: string;
  text: string;
  type: QType;
  maxScore: number;
  modelAnswer: string;
  criteria: { description: string; points: number }[];
}

export type BankSource = 'teacher' | 'ai_generated' | 'old_exam' | 'ministerial' | 'past_exam';

export interface BankQuestion extends DraftQuestion {
  id: string;
  subjectId: string | null;
  source: BankSource;
  /** e.g. «وزاري 2023», or the exam title for past exam questions. */
  sourceNote: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  /** Past exam questions live in the exam itself and can't be deleted here. */
  readOnly: boolean;
}

export type NewBankQuestion = DraftQuestion & {
  subjectId: string | null;
  source: Exclude<BankSource, 'past_exam'>;
  sourceNote?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
};

export interface GenerateInput {
  subjectId: string;
  groupId: string | null;
  lessonIds: string[];
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  purpose: 'exam' | 'remedial';
  note?: string;
  avoid?: string[];
}

export interface StudyPlan {
  days: { day: number; lessonId: string | null; task: string; minutes: number }[];
  flashcards: { lessonId: string | null; front: string; back: string }[];
  tip: string;
}

export interface AiStore {
  aiGenerateQuestions(input: GenerateInput): Promise<{ questions: DraftQuestion[]; rejected: { text: string; reason: string }[] }>;
  aiExtractExam(subjectId: string, pages: PaperPage[]): Promise<{ questions: DraftQuestion[]; readable: boolean }>;
  aiSuggestRubric(input: { subjectId: string; lessonId: string | null; text: string; maxScore: number }): Promise<{ modelAnswer: string; criteria: { description: string; points: number }[] }>;
  aiStudyPlan(subjectId: string, lessons: { id: string; mastery: number | null }[], days: number): Promise<StudyPlan>;
  aiParentReply(input: { message: string; studentFirstName: string; facts: string[] }): Promise<{ reply: string; needsTeacher: boolean }>;
  aiAssistant(turns: { role: 'user' | 'assistant'; text: string }[]): Promise<string>;
  listBank(subjectId: string | null): Promise<BankQuestion[]>;
  addBankQuestions(items: NewBankQuestion[]): Promise<number>;
  deleteBankQuestion(id: string): Promise<void>;
}

class AiError extends Error {}

export function createSupabaseAi(db: SupabaseClient, orgId: string): AiStore {
  const call = async <T,>(task: string, input: Record<string, unknown>): Promise<T> => {
    const { data, error } = await db.functions.invoke('ai-tools', { body: { task, organizationId: orgId, ...input } });
    if (error) {
      let message = 'تعذّر تشغيل أداة الذكاء الاصطناعي الآن.';
      const ctx = (error as { context?: Response }).context;
      try {
        const body = ctx ? await ctx.json() : null;
        if (body?.error) message = body.error;
      } catch {
        // keep the generic message
      }
      throw new AiError(message);
    }
    return data as T;
  };
  const fail = (e: { message?: string } | null, fallback: string): never => {
    const msg = e?.message ?? '';
    throw new AiError(/[؀-ۿ]/.test(msg) ? msg : fallback);
  };

  return {
    aiGenerateQuestions: (input) => call('generate_questions', { ...input }),
    aiExtractExam: (subjectId, pages) =>
      call('extract_exam', { subjectId, pages: pages.map((p) => ({ data: p.base64, mediaType: p.mediaType })) }),
    aiSuggestRubric: (input) => call('suggest_rubric', { ...input }),
    aiStudyPlan: (subjectId, lessons, days) => call('study_plan', { subjectId, lessons, days }),
    aiParentReply: (input) => call('parent_reply', { ...input }),
    async aiAssistant(turns) {
      const r = await call<{ reply: string }>('assistant', { turns });
      return r.reply;
    },

    async listBank(subjectId) {
      let bank = db
        .from('bank_questions')
        .select('id, subject_id, lesson_id, outcome, text, type, max_score, model_answer, criteria, source, source_note, difficulty, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (subjectId) bank = bank.eq('subject_id', subjectId);
      let past = db
        .from('questions')
        .select('id, text, type, max_score, model_answer, lesson_id, created_at, assessments!inner(title, subject_id, organization_id), rubric_criteria(description, points, sort_order)')
        .eq('assessments.organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (subjectId) past = past.eq('assessments.subject_id', subjectId);
      const [b, p] = await Promise.all([bank, past]);
      if (b.error) fail(b.error, 'تعذّر تحميل بنك الأسئلة.');
      if (p.error) fail(p.error, 'تعذّر تحميل أسئلة الامتحانات السابقة.');
      type B = {
        id: string; subject_id: string | null; lesson_id: string | null; outcome: string | null; text: string; type: QType; max_score: number;
        model_answer: string | null; criteria: { description: string; points: number }[] | null; source: BankSource; source_note: string | null;
        difficulty: BankQuestion['difficulty']; created_at: string;
      };
      type P = {
        id: string; text: string; type: QType; max_score: number; model_answer: string | null; lesson_id: string | null; created_at: string;
        assessments: { title: string; subject_id: string | null } | { title: string; subject_id: string | null }[];
        rubric_criteria: { description: string; points: number; sort_order: number }[];
      };
      const own: BankQuestion[] = ((b.data ?? []) as B[]).map((q) => ({
        id: q.id,
        subjectId: q.subject_id,
        lessonId: q.lesson_id,
        outcome: q.outcome ?? '',
        text: q.text,
        type: q.type,
        maxScore: Number(q.max_score),
        modelAnswer: q.model_answer ?? '',
        criteria: (q.criteria ?? []).map((c) => ({ description: c.description, points: Number(c.points) })),
        source: q.source,
        sourceNote: q.source_note ?? '',
        difficulty: q.difficulty,
        createdAt: q.created_at,
        readOnly: false,
      }));
      const fromExams: BankQuestion[] = ((p.data ?? []) as unknown as P[]).map((q) => {
        const a = Array.isArray(q.assessments) ? q.assessments[0] : q.assessments;
        return {
          id: `past:${q.id}`,
          subjectId: a?.subject_id ?? null,
          lessonId: q.lesson_id,
          outcome: '',
          text: q.text,
          type: q.type,
          maxScore: Number(q.max_score),
          modelAnswer: q.model_answer ?? '',
          criteria: [...(q.rubric_criteria ?? [])].sort((x, y) => x.sort_order - y.sort_order).map((c) => ({ description: c.description, points: Number(c.points) })),
          source: 'past_exam' as const,
          sourceNote: a?.title ?? '',
          difficulty: 'medium' as const,
          createdAt: q.created_at,
          readOnly: true,
        };
      });
      return [...own, ...fromExams];
    },

    async addBankQuestions(items) {
      if (!items.length) return 0;
      const rows = items.map((q) => ({
        organization_id: orgId,
        subject_id: q.subjectId,
        lesson_id: q.lessonId,
        outcome: q.outcome || null,
        text: q.text.trim(),
        type: q.type,
        max_score: q.maxScore,
        model_answer: q.modelAnswer || null,
        criteria: q.criteria,
        source: q.source,
        source_note: q.sourceNote || null,
        difficulty: q.difficulty ?? 'medium',
      }));
      const { error } = await db.from('bank_questions').insert(rows);
      if (error) fail(error, 'تعذّر حفظ الأسئلة في البنك.');
      return rows.length;
    },

    async deleteBankQuestion(id) {
      if (id.startsWith('past:')) throw new AiError('هذا السؤال من امتحان سابق. احذفه من الامتحان نفسه.');
      const { error } = await db.from('bank_questions').delete().eq('id', id);
      if (error) fail(error, 'تعذّر حذف السؤال.');
    },
  };
}

// ----------------------------------------------------------------- demo

const wait = <T,>(v: T, ms = 900) => new Promise<T>((r) => setTimeout(() => r(v), ms));

function demoLessons() {
  const out: { id: string; title: string; outcomes: string[]; terms: string[]; subjectId: string }[] = [];
  for (const c of CURRICULA_DATA)
    for (const g of c.grades)
      for (const s of g.subjects)
        for (const u of s.units)
          for (const l of u.lessons)
            out.push({
              id: l.id,
              title: l.title,
              outcomes: l.learningOutcomes ?? l.outcomes ?? [],
              terms: l.keyTerms ?? l.termsAndSymbols ?? [],
              subjectId: s.id,
            });
  return out;
}

function sampleQuestion(lesson: { id: string; title: string; outcomes: string[] }, i: number, remedial: boolean): DraftQuestion {
  const outcome = lesson.outcomes[i % Math.max(lesson.outcomes.length, 1)] ?? `فهم درس ${lesson.title}`;
  const text = remedial
    ? `(تمرين ${i + 1}) راجع درس «${lesson.title}»، ثم حلّ مثالاً بسيطاً يحقق: ${outcome}. اكتب خطوات الحل بالترتيب.`
    : `سؤال نموذجي من درس «${lesson.title}»: ${outcome}. وضّح خطوات الحل كاملة.`;
  return {
    lessonId: lesson.id,
    outcome,
    text,
    type: 'problem_solving',
    maxScore: 10,
    modelAnswer: `(إجابة نموذجية تجريبية) يكتب الطالب القانون المناسب لدرس ${lesson.title} ثم يعوّض ويصل للناتج.`,
    criteria: [
      { description: 'كتابة القانون أو الفكرة الصحيحة', points: 3 },
      { description: 'خطوات الحل والتعويض بدقة', points: 4 },
      { description: 'الناتج النهائي الصحيح', points: 3 },
    ],
  };
}

export function createDemoAi(): AiStore {
  const lessons = demoLessons();
  const bank: BankQuestion[] = [];
  let seq = 0;
  return {
    async aiGenerateQuestions(input) {
      const chosen = lessons.filter((l) => input.lessonIds.includes(l.id));
      const list = chosen.length ? chosen : lessons.slice(0, 1);
      const questions = Array.from({ length: Math.min(Math.max(input.count, 1), 25) }, (_, i) =>
        sampleQuestion(list[i % list.length], Math.floor(i / list.length), input.purpose === 'remedial'),
      );
      return wait({ questions, rejected: [] }, 1400);
    },
    async aiExtractExam() {
      const l = lessons[0];
      return wait({ questions: [sampleQuestion(l, 0, false), sampleQuestion(lessons[1] ?? l, 1, false)], readable: true }, 1600);
    },
    async aiSuggestRubric({ maxScore }) {
      const a = Math.round(maxScore * 0.4 * 2) / 2;
      const b = Math.round(maxScore * 0.4 * 2) / 2;
      return wait({
        modelAnswer: '(نموذج تجريبي) يكتب الطالب القانون، ثم يعوّض بالخطوات، ثم يصل للناتج النهائي.',
        criteria: [
          { description: 'كتابة القانون أو الفكرة الصحيحة', points: a },
          { description: 'خطوات الحل والتعويض بدقة', points: b },
          { description: 'الناتج النهائي الصحيح', points: maxScore - a - b },
        ],
      });
    },
    async aiStudyPlan(_subjectId, weak, days) {
      const list = weak.map((w) => lessons.find((l) => l.id === w.id)).filter((l): l is (typeof lessons)[number] => !!l);
      const n = Math.min(Math.max(days, 1), 30);
      return wait({
        days: Array.from({ length: n }, (_, i) => {
          const l = list[i % Math.max(list.length, 1)];
          return i === n - 1
            ? { day: i + 1, lessonId: null, task: 'مراجعة شاملة لكل الدروس وحل امتحان سابق', minutes: 60 }
            : { day: i + 1, lessonId: l?.id ?? null, task: `مراجعة «${l?.title ?? 'الدروس'}» وحل 5 تمارين`, minutes: 40 };
        }),
        flashcards: list.slice(0, 6).map((l) => ({ lessonId: l.id, front: l.outcomes[0] ?? `ما فكرة درس ${l.title}؟`, back: `راجع ملخص درس ${l.title}.` })),
        tip: 'ابدأ بالدرس الأضعف وأنت مرتاح، وحلّ الأسئلة على ورقة كما في الامتحان.',
      });
    },
    async aiParentReply({ studentFirstName, facts }) {
      const body = facts.length ? facts.join('، ') : 'مستواه جيد ونتابعه باستمرار';
      return wait({
        reply: `أهلاً وسهلاً، شكراً لتواصلكم. بخصوص ${studentFirstName}: ${body}. نحن على تواصل دائم، ولأي استفسار تفضلوا.`,
        needsTeacher: false,
      });
    },
    async aiAssistant(turns) {
      const last = turns[turns.length - 1]?.text ?? '';
      return wait(
        `(رد تجريبي) سؤالك: «${last.slice(0, 80)}». في النسخة الحقيقية يجيب المساعد بالذكاء الاصطناعي من الخادم بعد تفعيل مفتاح الذكاء الاصطناعي.`,
      );
    },
    listBank: (subjectId) => wait(bank.filter((q) => !subjectId || q.subjectId === subjectId).map((q) => ({ ...q })), 150),
    async addBankQuestions(items) {
      for (const q of items)
        bank.unshift({
          ...q,
          id: `bq_${Date.now().toString(36)}_${seq++}`,
          sourceNote: q.sourceNote ?? '',
          difficulty: q.difficulty ?? 'medium',
          createdAt: new Date().toISOString(),
          readOnly: false,
        });
      return wait(items.length, 150);
    },
    async deleteBankQuestion(id) {
      const i = bank.findIndex((q) => q.id === id);
      if (i >= 0) bank.splice(i, 1);
      await wait(null, 100);
    },
  };
}
