// Big question sets are split into parallel batches of at most 5 questions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions, planBatches, type LessonContext } from '../../supabase/functions/_shared/aiTools/tools.ts';
import type { ToolModel, ToolModelConfig } from '../../supabase/functions/_shared/aiTools/model.ts';

const lesson = (i: number): LessonContext => ({ id: `00000000-0000-4000-8000-00000000000${i}`, title: `درس ${i}`, unit: 'و', content: '', outcomes: [], terms: [], symbols: [] });

test('splits counts into batches of at most 5 and covers every lesson', () => {
  const lessons = [1, 2, 3, 4, 5, 6, 7].map(lesson);
  const plan = planBatches(23, lessons);
  assert.deepEqual(plan.map((b) => b.count), [5, 5, 5, 4, 4]);
  assert.equal(plan.reduce((s, b) => s + b.count, 0), 23);
  assert.deepEqual(plan.flatMap((b) => b.lessons.map((l) => l.id)), lessons.map((l) => l.id));
  assert.ok(plan.every((b) => b.lessons.length > 0));
  assert.deepEqual(planBatches(4, lessons).map((b) => b.count), [4]);
  assert.equal(planBatches(10, [lesson(1)]).length, 2);
});

test('runs batches in parallel and keeps the total mark', async () => {
  let calls = 0;
  let active = 0;
  let peak = 0;
  const model: ToolModel = {
    async json(req) {
      calls++;
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 20));
      active--;
      const text = (req.content[0] as { text: string }).text;
      if (req.system.includes('مراجع مناهج')) {
        const n = text.split('الأسئلة:\n')[1].split('\n').length;
        return { data: { results: Array.from({ length: n }, (_, i) => ({ index: i, inside_lessons: true, lesson_id: '', outcome: 'ن', reason: '' })) } as never, usage: { model: 'm', inputTokens: 1, outputTokens: 1, costUsd: 0 } };
      }
      const n = Number(/المطلوب: (\d+)/.exec(text)?.[1] ?? 1);
      return {
        data: { questions: Array.from({ length: n }, () => ({ lesson_id: lesson(1).id, outcome: 'ن', text: `سؤال ${Math.random()}`, type: 'short_answer', max_score: 2, model_answer: 'ج', criteria: [{ description: 'م', points: 2 }] })) } as never,
        usage: { model: 'm', inputTokens: 1, outputTokens: 1, costUsd: 0 },
      };
    },
    async chat() {
      throw new Error('unused');
    },
  };
  const config = { mainModel: 'cheap', checkModel: 'cheap', fastModel: 'cheap', strongModel: '' } as ToolModelConfig;
  const r = await generateQuestions(model, config, {
    lessons: [1, 2, 3].map(lesson), count: 12, difficulty: 'medium', purpose: 'exam', subjectName: 'ر', gradeName: 'ص', numerals: 'arabic', totalScore: 30,
  });
  assert.equal(r.data.questions.length, 12);
  assert.equal(r.data.questions.reduce((s, q) => s + q.maxScore, 0), 30);
  assert.ok(peak >= 3, `batches should overlap (peak ${peak})`);
  assert.equal(calls, 6);
});
