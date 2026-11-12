import { estimateCostUsd, type GradingConfig } from './config.ts';
import { effortForExam } from './prompt.ts';
import {
  GradingError,
  type GradePaperInput,
  type GradePaperResult,
  type GradingProvider,
  type ModelAttempt,
  type ProviderOutput,
} from './types.ts';

const MAX_PAGES = 6;

/**
 * Grades one student's paper.
 *
 * Cost saving: the cheap primary model grades the whole paper first. Only the
 * questions it is unsure about are sent to the stronger (much more expensive)
 * model, never the whole paper again. Multiple choice questions are never
 * escalated: the cheap model reads them well, and the teacher still reviews
 * any that are unsure. If the primary model fails outright, the stronger model
 * grades the whole paper.
 */
export async function gradePaper(
  provider: GradingProvider,
  config: GradingConfig,
  input: GradePaperInput,
): Promise<GradePaperResult> {
  validateInput(input);
  const effort = effortForExam(input.exam);
  const attempts: ModelAttempt[] = [];
  const canEscalate = !!config.escalationModel && config.escalationModel !== config.primaryModel;

  let output: ProviderOutput | null = null;
  let usedModel = config.primaryModel;
  let escalatedQuestions: number[] = [];

  try {
    output = await provider.gradeOnce(input, config.primaryModel, { effort });
    attempts.push(toAttempt(config.primaryModel, output));
  } catch (error) {
    if (!canEscalate) throw error;
    // The cheap model failed: the stronger one grades the whole paper.
    const reason = error instanceof GradingError ? error.message : String(error);
    output = await provider.gradeOnce(input, config.escalationModel, { effort });
    attempts.push(toAttempt(config.escalationModel, output));
    usedModel = config.escalationModel;
    escalatedQuestions = input.exam.questions.map((q) => q.questionNumber);
    console.warn(`primary grading failed, whole paper escalated: ${reason}`);
  }

  let questions = output.questions.map((q) => ({ ...q, model: usedModel }));

  const unsure = usedModel === config.primaryModel ? questionsToEscalate(input, output, config) : [];
  if (unsure.length && canEscalate) {
    const subExam = { ...input.exam, questions: input.exam.questions.filter((q) => unsure.includes(q.questionNumber)) };
    try {
      const stronger = await provider.gradeOnce({ ...input, exam: subExam }, config.escalationModel, { effort });
      attempts[attempts.length - 1].replacedBecause = `unsure on question(s) ${unsure.join(', ')}`;
      attempts.push(toAttempt(config.escalationModel, stronger));
      const better = new Map(stronger.questions.map((q) => [q.questionNumber, q]));
      questions = questions.map((q) => {
        const b = better.get(q.questionNumber);
        return b && unsure.includes(q.questionNumber) ? { ...b, model: config.escalationModel } : q;
      });
      escalatedQuestions = unsure;
    } catch {
      // Keep the first answers; the teacher reviews unsure answers anyway.
    }
  }

  const totalScore = questions.reduce((s, q) => s + q.score, 0);
  const totalMaxScore = input.exam.questions.reduce((s, q) => s + q.maxScore, 0);
  return {
    studentCodeOnPaper: output.studentCodeOnPaper,
    studentNameOnPaper: output.studentNameOnPaper,
    questions,
    totalScore,
    totalMaxScore,
    model: usedModel,
    escalatedQuestions,
    attempts,
    totalCostUsd: attempts.reduce((s, a) => s + a.costUsd, 0),
  };
}

/** Unsure, non multiple-choice questions: the only ones worth the stronger model. */
export function questionsToEscalate(input: GradePaperInput, output: ProviderOutput, config: GradingConfig): number[] {
  const mcq = new Set(input.exam.questions.filter((q) => q.type === 'multiple_choice').map((q) => q.questionNumber));
  return output.questions
    .filter((q) => q.unreadable || q.confidence === 'low' || (config.escalateAt === 'medium' && q.confidence === 'medium'))
    .map((q) => q.questionNumber)
    .filter((n) => !mcq.has(n));
}

function toAttempt(model: string, output: ProviderOutput): ModelAttempt {
  return { model, ...output.usage, costUsd: estimateCostUsd(model, output.usage) };
}

function validateInput(input: GradePaperInput) {
  if (!input.exam?.questions?.length) {
    throw new GradingError('Exam has no questions', 'لا توجد أسئلة في هذا الامتحان.');
  }
  if (!input.pages?.length) {
    throw new GradingError('No pages', 'لم تُرفع أي صورة.');
  }
  if (input.pages.length > MAX_PAGES) {
    throw new GradingError('Too many pages', `الحد الأقصى ${MAX_PAGES} صفحات للورقة الواحدة.`);
  }
}
