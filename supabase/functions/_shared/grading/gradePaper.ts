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
 * Cost saving: the cheap primary model grades first. Only when it is unsure
 * (or fails) is the paper sent again to the stronger escalation model.
 */
export async function gradePaper(
  provider: GradingProvider,
  config: GradingConfig,
  input: GradePaperInput,
): Promise<GradePaperResult> {
  validateInput(input);
  const effort = effortForExam(input.exam);
  const attempts: ModelAttempt[] = [];

  let output: ProviderOutput | null = null;
  let usedModel = config.primaryModel;
  let escalateReason: string | null = null;

  try {
    output = await provider.gradeOnce(input, config.primaryModel, { effort });
    attempts.push(toAttempt(config.primaryModel, output));
    escalateReason = reasonToEscalate(output, config);
  } catch (error) {
    if (!config.escalationModel || config.escalationModel === config.primaryModel) throw error;
    escalateReason = error instanceof GradingError ? error.message : String(error);
  }

  if (escalateReason && config.escalationModel && config.escalationModel !== config.primaryModel) {
    try {
      const stronger = await provider.gradeOnce(input, config.escalationModel, { effort });
      if (attempts.length) attempts[attempts.length - 1].replacedBecause = escalateReason;
      attempts.push(toAttempt(config.escalationModel, stronger));
      output = stronger;
      usedModel = config.escalationModel;
    } catch (error) {
      // Keep the first answer if we have one; the teacher reviews unsure answers anyway.
      if (!output) throw error;
    }
  }

  if (!output) {
    throw new GradingError('No grading output', 'تعذّر تصحيح الورقة.');
  }

  const totalScore = output.questions.reduce((s, q) => s + q.score, 0);
  const totalMaxScore = input.exam.questions.reduce((s, q) => s + q.maxScore, 0);
  return {
    studentCodeOnPaper: output.studentCodeOnPaper,
    questions: output.questions,
    totalScore,
    totalMaxScore,
    model: usedModel,
    attempts,
    totalCostUsd: attempts.reduce((s, a) => s + a.costUsd, 0),
  };
}

function reasonToEscalate(output: ProviderOutput, config: GradingConfig): string | null {
  const unsure = output.questions.filter(
    (q) => q.unreadable || q.confidence === 'low' || (config.escalateAt === 'medium' && q.confidence === 'medium'),
  );
  if (unsure.length === 0) return null;
  return `unsure on question(s) ${unsure.map((q) => q.questionNumber).join(', ')}`;
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
