// The grading engine's own rules, with a fake AI (no network, no cost).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradePaper, questionsToEscalate } from '../../supabase/functions/_shared/grading/gradePaper.ts';
import { estimateCostUsd, gradingConfigFromEnv, type GradingConfig } from '../../supabase/functions/_shared/grading/config.ts';
import type {
  GradePaperInput,
  GradingProvider,
  ProviderOutput,
  QuestionResult,
  QuestionType,
} from '../../supabase/functions/_shared/grading/types.ts';
import { normalizeName } from '../../supabase/functions/_shared/gradeSubmission.ts';

const config: GradingConfig = { primaryModel: 'cheap', escalationModel: 'strong', escalateAt: 'low' };
const usage = { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0 };

function exam(types: QuestionType[]): GradePaperInput {
  return {
    exam: {
      title: 'اختبار',
      subject: 'رياضيات',
      questions: types.map((type, i) => ({ questionNumber: i + 1, text: `س${i + 1}`, type, maxScore: 5, modelAnswer: '', criteria: [] })),
    },
    pages: [{ data: 'AAAA', mediaType: 'image/jpeg' }],
  };
}

function answer(n: number, score: number, confidence: QuestionResult['confidence'] = 'high', extra: Partial<QuestionResult> = {}): QuestionResult {
  return { questionNumber: n, transcription: '', score, maxScore: 5, reason: 'السبب 12', feedbackForStudent: '', criteria: [], confidence, unreadable: false, ...extra };
}

function fakeProvider(byModel: Record<string, (input: GradePaperInput) => QuestionResult[] | Error>) {
  const calls: { model: string; questions: number[] }[] = [];
  const provider: GradingProvider = {
    name: 'fake',
    async gradeOnce(input, model): Promise<ProviderOutput> {
      calls.push({ model, questions: input.exam.questions.map((q) => q.questionNumber) });
      const r = byModel[model](input);
      if (r instanceof Error) throw r;
      return { studentCodeOnPaper: null, studentNameOnPaper: null, questions: r, usage };
    },
  };
  return { provider, calls };
}

test('sure answers: one cheap call, total adds up', async () => {
  const { provider, calls } = fakeProvider({ cheap: () => [answer(1, 5), answer(2, 3)] });
  const r = await gradePaper(provider, config, exam(['short_answer', 'problem_solving']));
  assert.equal(calls.length, 1);
  assert.equal(r.totalScore, 8);
  assert.equal(r.totalMaxScore, 10);
  assert.deepEqual(r.escalatedQuestions, []);
});

test('only the unsure question goes to the stronger model', async () => {
  const { provider, calls } = fakeProvider({
    cheap: () => [answer(1, 5), answer(2, 1, 'low')],
    strong: () => [answer(2, 4)],
  });
  const r = await gradePaper(provider, config, exam(['short_answer', 'problem_solving']));
  assert.deepEqual(calls, [
    { model: 'cheap', questions: [1, 2] },
    { model: 'strong', questions: [2] },
  ]);
  assert.equal(r.totalScore, 9);
  assert.equal(r.questions[1].model, 'strong');
  assert.deepEqual(r.escalatedQuestions, [2]);
});

test('multiple choice is never escalated; essays go up at medium', () => {
  const input = exam(['multiple_choice', 'essay', 'short_answer']);
  const out: ProviderOutput = {
    studentCodeOnPaper: null,
    studentNameOnPaper: null,
    usage,
    questions: [answer(1, 0, 'low'), answer(2, 2, 'medium'), answer(3, 2, 'medium')],
  };
  assert.deepEqual(questionsToEscalate(input, out, config), [2]);
  assert.deepEqual(questionsToEscalate(input, out, { ...config, escalateAt: 'medium' }), [2, 3]);
});

test('cheap model fails: the stronger one grades the whole paper', async () => {
  const { provider } = fakeProvider({ cheap: () => new Error('down'), strong: () => [answer(1, 4), answer(2, 5)] });
  const r = await gradePaper(provider, config, exam(['short_answer', 'essay']));
  assert.equal(r.model, 'strong');
  assert.deepEqual(r.escalatedQuestions, [1, 2]);
  assert.equal(r.totalScore, 9);
});

test('stronger model fails on the unsure part: first answers are kept', async () => {
  const { provider } = fakeProvider({ cheap: () => [answer(1, 2, 'low')], strong: () => new Error('down') });
  const r = await gradePaper(provider, config, exam(['short_answer']));
  assert.equal(r.totalScore, 2);
  assert.deepEqual(r.escalatedQuestions, []);
});

test('the note uses the subject book digits', async () => {
  const { provider } = fakeProvider({ cheap: () => [answer(1, 5)] });
  const input = exam(['short_answer']);
  const arabic = await gradePaper(provider, config, { ...input, exam: { ...input.exam, numerals: 'arabic' } });
  assert.match(arabic.questions[0].reason, /١٢/);
  const latin = await gradePaper(provider, config, { ...input, exam: { ...input.exam, numerals: 'latin' } });
  assert.match(latin.questions[0].reason, /12/);
});

test('config from env and cost estimate', () => {
  assert.equal(gradingConfigFromEnv({}).primaryModel, 'claude-haiku-5-5');
  assert.equal(gradingConfigFromEnv({ GRADING_ESCALATION_MODEL: '' }).escalationModel, '');
  assert.equal(gradingConfigFromEnv({ GRADING_ESCALATE_AT: 'medium' }).escalateAt, 'medium');
  assert.equal(estimateCostUsd('unknown-model', usage), 0);
  assert.ok(estimateCostUsd('claude-sonnet-5-5', usage) > estimateCostUsd('claude-haiku-5-5', usage));
});

test('student names match loosely (hamza, ta marbuta, diacritics, spaces)', () => {
  assert.equal(normalizeName('  أحمدُ   محمود  '), normalizeName('احمد محمود'));
  assert.equal(normalizeName('فاطمة'), normalizeName('فاطمه'));
  assert.equal(normalizeName('مصطفى'), normalizeName('مصطفي'));
});
