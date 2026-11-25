import type { GradingOutput } from './schema.ts';
import type { Confidence, ExamToGrade, QuestionResult } from './types.ts';

/**
 * Makes the model's answer safe to use: one result per exam question, points
 * never above the rubric, and the score always equal to the awarded points.
 */
export function normalizeQuestions(exam: ExamToGrade, output: GradingOutput): QuestionResult[] {
  return exam.questions.map((q) => {
    const found = output.questions.find((r) => r.question_number === q.questionNumber);
    if (!found) {
      return {
        questionNumber: q.questionNumber,
        transcription: '',
        score: 0,
        maxScore: q.maxScore,
        reason: 'لم يجد النموذج إجابة هذا السؤال في الورقة.',
        feedbackForStudent: '',
        criteria: q.criteria.map((c) => ({ criterion: c.description, met: false, pointsAwarded: 0 })),
        confidence: 'low' as Confidence,
        unreadable: true,
      };
    }

    const sameShape = found.criteria.length === q.criteria.length;
    const criteria = (sameShape ? found.criteria : q.criteria.map((c) => ({ criterion: c.description, met: false, points_awarded: 0 }))).map(
      (c, i) => {
        const cap = sameShape ? q.criteria[i].points : 0;
        const points = c.met ? Math.min(Math.max(c.points_awarded, 0), cap) : 0;
        return { criterion: sameShape ? q.criteria[i].description : c.criterion, met: c.met, pointsAwarded: points };
      },
    );

    const awarded = criteria.reduce((sum, c) => sum + c.pointsAwarded, 0);
    // A question with no rubric (model answer only) has nothing to add up, so
    // the model's own score counts. Before, such questions always got 0.
    const noRubric = q.criteria.length === 0;
    const score = sameShape && !noRubric ? Math.min(awarded, q.maxScore) : Math.min(Math.max(found.score, 0), q.maxScore);
    // If the model's own total disagrees with its criteria, the teacher should look.
    const inconsistent = !sameShape || (!noRubric && Math.abs(found.score - score) > 0.01);
    const confidence: Confidence = inconsistent && found.confidence === 'high' ? 'medium' : found.confidence;

    return {
      questionNumber: q.questionNumber,
      transcription: found.transcription,
      score,
      maxScore: q.maxScore,
      reason: found.reason,
      feedbackForStudent: found.feedback_for_student,
      criteria,
      confidence: sameShape ? confidence : 'low',
      unreadable: found.unreadable,
    };
  });
}
