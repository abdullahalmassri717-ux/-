// Practice grading for when no AI key is set on the server yet.
//
// It does not read the paper. It gives each question a made-up score so the
// owner can try the whole flow (upload, review, approve, corrected paper)
// before paying for AI. Every reason says clearly that the grade is not real,
// and gradeSubmission always sends these papers to teacher review.
import type { ExamToGrade, GradePaperResult, QuestionResult } from './types.ts';

export const DEMO_MODEL = 'demo-no-ai';

const NOTE = 'تصحيح تجريبي: الذكاء الاصطناعي غير مفعّل بعد، فهذه الدرجة عشوائية لتجربة الشاشات فقط وليست قراءة حقيقية للورقة.';

/** Small stable hash so the same paper gets the same practice grades each time. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function demoGrade(exam: ExamToGrade, seed: string): GradePaperResult {
  const questions: QuestionResult[] = exam.questions.map((q, i) => {
    const r = hash(`${seed}:${q.questionNumber}`) % 1000 / 1000;
    // Between half and full marks, rounded to half a point.
    const score = Math.round(q.maxScore * (0.5 + r * 0.5) * 2) / 2;
    let left = score;
    const criteria = q.criteria.map((c) => {
      const pts = Math.min(c.points, left);
      left -= pts;
      return { criterion: c.description, met: pts >= c.points, pointsAwarded: pts };
    });
    return {
      questionNumber: q.questionNumber,
      transcription: '(تجريبي: لم تُقرأ الورقة)',
      score,
      maxScore: q.maxScore,
      reason: NOTE,
      feedbackForStudent: score >= q.maxScore ? 'أحسنت' : 'راجع خطوات الحل',
      criteria,
      // Every third question is marked unsure so the review screen has something to show.
      confidence: i % 3 === 1 ? 'low' : 'medium',
      unreadable: false,
      model: DEMO_MODEL,
    };
  });
  return {
    studentCodeOnPaper: null,
    questions,
    totalScore: questions.reduce((s, q) => s + q.score, 0),
    totalMaxScore: questions.reduce((s, q) => s + q.maxScore, 0),
    model: DEMO_MODEL,
    escalatedQuestions: [],
    attempts: [],
    totalCostUsd: 0,
  };
}
