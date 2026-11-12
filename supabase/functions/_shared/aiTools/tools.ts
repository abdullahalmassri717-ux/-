// The teacher's AI tools. Plain TypeScript (no Deno APIs), so the same code can
// be tested anywhere. Every tool gets only the data it needs: lesson content
// and outcomes, never student names or phone numbers.
import { z } from 'zod';
import type { ChatTurn, ContentPart, ToolModel, ToolModelConfig, Usage } from './model.ts';

export interface LessonContext {
  id: string;
  title: string;
  unit: string;
  content: string;
  outcomes: string[];
  terms: string[];
  symbols: string[];
}

export type QuestionType = 'multiple_choice' | 'short_answer' | 'problem_solving' | 'essay';

export interface DraftQuestion {
  lessonId: string | null;
  outcome: string;
  text: string;
  type: QuestionType;
  maxScore: number;
  modelAnswer: string;
  criteria: { description: string; points: number }[];
}

export interface ToolResult<T> {
  data: T;
  usage: Usage[];
}

const QUESTION_TYPES = ['multiple_choice', 'short_answer', 'problem_solving', 'essay'] as const;

function renderLessons(lessons: LessonContext[]): string {
  return lessons
    .map((l) =>
      [
        `<lesson id="${l.id}">`,
        `العنوان: ${l.title}${l.unit ? ` (الوحدة: ${l.unit})` : ''}`,
        l.outcomes.length ? `نواتج التعلّم:\n${l.outcomes.map((o) => `- ${o}`).join('\n')}` : 'نواتج التعلّم: غير مدخلة',
        l.terms.length ? `المصطلحات: ${l.terms.join('، ')}` : '',
        l.symbols.length ? `الرموز: ${l.symbols.join('، ')}` : '',
        l.content ? `محتوى الدرس:\n${l.content}` : '',
        '</lesson>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

const QuestionSchema = z.object({
  lesson_id: z.string(),
  outcome: z.string(),
  text: z.string(),
  type: z.enum(QUESTION_TYPES),
  max_score: z.number(),
  model_answer: z.string(),
  criteria: z.array(z.object({ description: z.string(), points: z.number() })),
});

const GenerateSchema = z.object({ questions: z.array(QuestionSchema) });

const CheckSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      inside_lessons: z.boolean(),
      lesson_id: z.string(),
      outcome: z.string(),
      reason: z.string(),
    }),
  ),
});

const GENERATE_SYSTEM = `أنت مساعد مدرّس خبير في كتابة أسئلة الامتحانات للمدارس العربية.
اكتب الأسئلة بالعربية الفصحى البسيطة المناسبة لعمر الطلاب، وبنفس مصطلحات ورموز الدروس المعطاة.
القواعد:
- كل سؤال يقيس ناتج تعلّم واحداً على الأقل من الدروس المعطاة فقط. لا تستخدم أي معلومة خارجها.
- lesson_id يجب أن يكون أحد معرّفات الدروس المعطاة حرفياً، وoutcome نص ناتج التعلّم الذي يقيسه السؤال.
- اكتب نموذج إجابة كاملاً وواضحاً، ومعايير تصحيح قابلة للقياس على ورقة الطالب، ومجموع نقاط المعايير يساوي max_score.
- السؤال يُحلّ على الورق: لا رسومات تفاعلية ولا روابط.
- نوّع الأسئلة بين الدروس المختارة قدر الإمكان.`;

const CHECK_SYSTEM = `أنت مراجع مناهج دقيق. تتأكد أن كل سؤال امتحان يقيس ناتج تعلّم من الدروس المعطاة فقط.
اعتبر السؤال خارج الدروس إذا احتاج الطالب لمعرفة أو مهارة لم ترد في محتوى الدروس أو نواتجها.
أرجع نتيجة لكل سؤال برقمه (index يبدأ من 0)، مع lesson_id الأقرب ونص الناتج الذي يقيسه وسبب مختصر بالعربية.`;

/** Spreads rounding so criteria always add up to the question's score. */
function normalizeQuestion(q: z.infer<typeof QuestionSchema>, lessonIds: Set<string>): DraftQuestion | null {
  const text = q.text.trim();
  if (!text) return null;
  const maxScore = Math.min(Math.max(Math.round(q.max_score * 2) / 2, 1), 100);
  let criteria = q.criteria.filter((c) => c.description.trim() && c.points > 0);
  if (!criteria.length) criteria = [{ description: 'الإجابة الصحيحة الكاملة', points: maxScore }];
  const total = criteria.reduce((s, c) => s + c.points, 0);
  const scaled = criteria.map((c) => ({ description: c.description.trim(), points: Math.round(((c.points / total) * maxScore) * 2) / 2 }));
  const diff = maxScore - scaled.reduce((s, c) => s + c.points, 0);
  scaled[scaled.length - 1].points = Math.max(0.5, scaled[scaled.length - 1].points + diff);
  return {
    lessonId: lessonIds.has(q.lesson_id) ? q.lesson_id : null,
    outcome: q.outcome.trim(),
    text,
    type: q.type,
    maxScore: scaled.reduce((s, c) => s + c.points, 0),
    modelAnswer: q.model_answer.trim(),
    criteria: scaled,
  };
}

export interface GenerateOptions {
  lessons: LessonContext[];
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  purpose: 'exam' | 'remedial';
  subjectName: string;
  gradeName: string;
  /** Extra instructions typed by the teacher (style, question types…). */
  note?: string;
  /** Questions to avoid repeating (e.g. already in the exam). */
  avoid?: string[];
}

/**
 * Writes questions from the given lessons, then a second model checks that
 * each one measures an outcome of those lessons. Questions that fail the check
 * are returned separately so the teacher can see why they were dropped.
 */
export async function generateQuestions(
  model: ToolModel,
  config: ToolModelConfig,
  o: GenerateOptions,
): Promise<ToolResult<{ questions: DraftQuestion[]; rejected: { text: string; reason: string }[] }>> {
  const count = Math.min(Math.max(Math.round(o.count), 1), 25);
  const lessonIds = new Set(o.lessons.map((l) => l.id));
  const level = { easy: 'سهلة', medium: 'متوسطة', hard: 'صعبة (تحتاج تفكيراً أعلى)' }[o.difficulty];
  const purpose =
    o.purpose === 'remedial'
      ? 'هذه تمارين علاجية لطالب ضعيف في هذه الدروس: ابدأ بالأسهل وتدرّج، واجعل نموذج الإجابة يشرح الخطوات بوضوح ليتعلم منه الطالب.'
      : 'هذه أسئلة امتحان ورقي يصحّحه الذكاء الاصطناعي ثم المدرّس.';
  const prompt = [
    `المادة: ${o.subjectName} — الصف: ${o.gradeName}`,
    `الدروس المسموح بها:\n${renderLessons(o.lessons)}`,
    `المطلوب: ${count} أسئلة ${level}. ${purpose}`,
    o.lessons.length > 3 ? 'وزّع الأسئلة على كل الدروس والوحدات المذكورة بشكل متوازن، ولا تركّز على درس واحد.' : '',
    o.note?.trim() ? `ملاحظات المدرّس: ${o.note.trim()}` : '',
    o.avoid?.length ? `لا تكرر هذه الأسئلة:\n${o.avoid.slice(0, 30).map((t) => `- ${t}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const gen = await model.json({
    model: config.mainModel,
    effort: 'medium',
    system: GENERATE_SYSTEM,
    content: [{ type: 'text', text: prompt }],
    schema: GenerateSchema,
  });
  const drafts = gen.data.questions.map((q) => normalizeQuestion(q, lessonIds)).filter((q): q is DraftQuestion => !!q);
  if (!drafts.length) return { data: { questions: [], rejected: [] }, usage: [gen.usage] };

  const check = await model.json({
    model: config.checkModel,
    effort: 'low',
    system: CHECK_SYSTEM,
    content: [
      {
        type: 'text',
        text: `الدروس:\n${renderLessons(o.lessons)}\n\nالأسئلة:\n${drafts.map((q, i) => `[${i}] ${q.text}`).join('\n')}`,
      },
    ],
    schema: CheckSchema,
  });

  const questions: DraftQuestion[] = [];
  const rejected: { text: string; reason: string }[] = [];
  drafts.forEach((q, i) => {
    const r = check.data.results.find((x) => x.index === i);
    // A question the checker skipped is not trusted.
    if (!r || !r.inside_lessons) {
      rejected.push({ text: q.text, reason: r?.reason || 'لم يُتحقق منه' });
      return;
    }
    questions.push({
      ...q,
      lessonId: q.lessonId ?? (lessonIds.has(r.lesson_id) ? r.lesson_id : null),
      outcome: q.outcome || r.outcome,
    });
  });
  return { data: { questions, rejected }, usage: [gen.usage, check.usage] };
}

const ExtractSchema = z.object({
  readable: z.boolean(),
  questions: z.array(
    z.object({
      number: z.number().int(),
      text: z.string(),
      type: z.enum(QUESTION_TYPES),
      max_score: z.number(),
      model_answer: z.string(),
      criteria: z.array(z.object({ description: z.string(), points: z.number() })),
      lesson_id: z.string(),
      outcome: z.string(),
    }),
  ),
});

/** Reads a photographed old exam and turns it into editable questions. */
export async function extractExam(
  model: ToolModel,
  config: ToolModelConfig,
  o: { pages: Extract<ContentPart, { type: 'image' }>[]; lessons: LessonContext[] },
): Promise<ToolResult<{ questions: DraftQuestion[]; readable: boolean }>> {
  const lessonIds = new Set(o.lessons.map((l) => l.id));
  const list = o.lessons.map((l) => `- ${l.id}: ${l.title}${l.outcomes.length ? ` (${l.outcomes.slice(0, 4).join('؛ ')})` : ''}`).join('\n');
  const res = await model.json({
    model: config.mainModel,
    effort: 'medium',
    system: `أنت تقرأ صور ورقة امتحان مطبوعة أو مكتوبة بخط اليد وتحوّلها لأسئلة منفصلة.
انسخ نص كل سؤال كما هو (صحّح الأخطاء الإملائية الواضحة فقط)، واقترح درجة ونموذج إجابة ومعايير تصحيح مجموعها يساوي الدرجة.
إذا ذُكرت الدرجة على الورقة فاستخدمها.
اختر lesson_id من قائمة الدروس إن كان السؤال يناسب أحدها، وإلا اكتب "none".
إذا كانت الصور غير مقروءة اجعل readable = false.`,
    content: [
      ...o.pages,
      { type: 'text', text: `دروس المادة:\n${list || 'لا توجد دروس مدخلة.'}\n\nاستخرج كل أسئلة هذه الورقة بالترتيب.` },
    ],
    schema: ExtractSchema,
  });
  const questions = res.data.questions
    .sort((a, b) => a.number - b.number)
    .map((q) => normalizeQuestion({ ...q }, lessonIds))
    .filter((q): q is DraftQuestion => !!q);
  return { data: { questions, readable: res.data.readable }, usage: [res.usage] };
}

const PlanSchema = z.object({
  days: z.array(z.object({ day: z.number().int(), lesson_id: z.string(), task: z.string(), minutes: z.number().int() })),
  flashcards: z.array(z.object({ lesson_id: z.string(), front: z.string(), back: z.string() })),
  tip: z.string(),
});

export interface StudyPlan {
  days: { day: number; lessonId: string | null; task: string; minutes: number }[];
  flashcards: { lessonId: string | null; front: string; back: string }[];
  tip: string;
}

/** A day-by-day revision plan focused on the student's weakest lessons. */
export async function studyPlan(
  model: ToolModel,
  config: ToolModelConfig,
  o: { lessons: (LessonContext & { mastery: number | null })[]; days: number; subjectName: string; gradeName: string },
): Promise<ToolResult<StudyPlan>> {
  const days = Math.min(Math.max(Math.round(o.days), 1), 30);
  const ids = new Set(o.lessons.map((l) => l.id));
  const res = await model.json({
    model: config.mainModel,
    effort: 'low',
    system: `أنت مرشد دراسي. اكتب خطة مذاكرة قصيرة وواقعية لطالب مدرسة، بالعربية البسيطة وموجّهة للطالب مباشرة.
ركّز على الدروس الأضعف أولاً (نسبة الإتقان الأقل)، ولا تتجاوز ساعة في اليوم، واجعل آخر يوم مراجعة شاملة.
بطاقات المراجعة: سؤال قصير في الوجه وجوابه في الخلف، من نواتج ومصطلحات الدروس فقط.`,
    content: [
      {
        type: 'text',
        text: `المادة: ${o.subjectName} — ${o.gradeName}\nعدد الأيام حتى الامتحان: ${days}\n\n${o.lessons
          .map((l) => `الإتقان: ${l.mastery === null ? 'غير معروف' : `${Math.round(l.mastery)}%`}\n${renderLessons([l])}`)
          .join('\n\n')}\n\nاكتب خطة من ${days} أيام (day من 1) و6 إلى 10 بطاقات ونصيحة واحدة.`,
      },
    ],
    schema: PlanSchema,
  });
  return {
    data: {
      days: res.data.days
        .filter((d) => d.day >= 1 && d.day <= days)
        .map((d) => ({ day: d.day, lessonId: ids.has(d.lesson_id) ? d.lesson_id : null, task: d.task, minutes: Math.min(Math.max(d.minutes, 5), 120) })),
      flashcards: res.data.flashcards.map((f) => ({ lessonId: ids.has(f.lesson_id) ? f.lesson_id : null, front: f.front, back: f.back })),
      tip: res.data.tip,
    },
    usage: [res.usage],
  };
}

const ReplySchema = z.object({ reply: z.string(), needs_teacher: z.boolean() });

/**
 * Drafts a reply to a parent's WhatsApp message. Only the facts the teacher
 * allowed are given to the model. The teacher always reviews before sending.
 */
export async function parentReply(
  model: ToolModel,
  config: ToolModelConfig,
  o: { message: string; teacherName: string; studentFirstName: string; facts: string[] },
): Promise<ToolResult<{ reply: string; needsTeacher: boolean }>> {
  const res = await model.json({
    model: config.mainModel,
    effort: 'low',
    system: `أنت تكتب مسودة رد مهذبة وقصيرة من المدرّس إلى ولي أمر طالب، بالعربية البسيطة، بأسلوب واتساب.
استخدم فقط المعلومات المعطاة. لا تخترع درجات أو مواعيد. لا تذكر أي طالب آخر.
إذا سأل ولي الأمر عن شيء غير موجود في المعلومات أو يحتاج قراراً من المدرّس (شكوى، رسوم، استثناء)، اكتب رداً لطيفاً يعد بالمتابعة واجعل needs_teacher = true.`,
    content: [
      {
        type: 'text',
        text: `المدرّس: ${o.teacherName}\nالطالب: ${o.studentFirstName}\nالمعلومات المسموح بمشاركتها:\n${
          o.facts.length ? o.facts.map((f) => `- ${f}`).join('\n') : '- لا شيء'
        }\n\nرسالة ولي الأمر:\n${o.message}`,
      },
    ],
    schema: ReplySchema,
  });
  return { data: { reply: res.data.reply.trim(), needsTeacher: res.data.needs_teacher }, usage: [res.usage] };
}

const ASSISTANT_SYSTEM = `أنت «مساعد دقة»، مساعد ذكي داخل منصة دقة لتصحيح الامتحانات الورقية بالذكاء الاصطناعي.
تساعد المدرّس في: صياغة أسئلة ومعايير تصحيح، أفكار لشرح الدروس، رسائل لأولياء الأمور، وطريقة استخدام المنصة.
عن المنصة: المدرّس ينشئ مجموعات وطلاباً، يحدد الدروس المشروحة في «وين وصلنا»، ينشئ امتحاناً بأسئلة ومعايير، يصوّر الأوراق أو يرسل للطلاب رابط تسليم، الذكاء الاصطناعي يقترح الدرجات والمدرّس يراجع ويعتمد، ثم تُرسل التقارير على واتساب.
أجب بالعربية البسيطة وباختصار. لا تطلب ولا تخزّن بيانات شخصية عن الطلاب.`;

export async function assistantChat(
  model: ToolModel,
  config: ToolModelConfig,
  o: { turns: ChatTurn[] },
): Promise<ToolResult<{ reply: string }>> {
  const turns = o.turns
    .filter((t) => t.text.trim())
    .slice(-12)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length) return { data: { reply: '' }, usage: [] };
  const res = await model.chat({ model: config.mainModel, effort: 'low', system: ASSISTANT_SYSTEM, turns });
  return { data: { reply: res.text }, usage: [res.usage] };
}

const RubricSchema = z.object({
  model_answer: z.string(),
  criteria: z.array(z.object({ description: z.string(), points: z.number() })),
});

/** Suggests a model answer and marking criteria for a question the teacher wrote. */
export async function suggestRubric(
  model: ToolModel,
  config: ToolModelConfig,
  o: { text: string; maxScore: number; lesson: LessonContext | null; subjectName: string; gradeName: string },
): Promise<ToolResult<{ modelAnswer: string; criteria: { description: string; points: number }[] }>> {
  const res = await model.json({
    model: config.mainModel,
    effort: 'low',
    system: `أنت مدرّس خبير. اكتب نموذج إجابة كاملاً ومعايير تصحيح واضحة لسؤال امتحان ورقي.
كل معيار شيء يمكن رؤيته على ورقة الطالب (خطوة، قانون، ناتج). من 2 إلى 5 معايير، ومجموع نقاطها يساوي درجة السؤال بالضبط.
استخدم مصطلحات الدرس إن وُجد.`,
    content: [
      {
        type: 'text',
        text: `المادة: ${o.subjectName} — ${o.gradeName}\n${o.lesson ? renderLessons([o.lesson]) : ''}\n\nالسؤال (${o.maxScore} درجات):\n${o.text}`,
      },
    ],
    schema: RubricSchema,
  });
  const q = normalizeQuestion(
    { lesson_id: '', outcome: '', text: o.text, type: 'problem_solving', max_score: o.maxScore, model_answer: res.data.model_answer, criteria: res.data.criteria },
    new Set(),
  );
  return { data: { modelAnswer: q?.modelAnswer ?? '', criteria: q?.criteria ?? [] }, usage: [res.usage] };
}
