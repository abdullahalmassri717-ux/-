// Shared types for AI grading.
//
// This folder is plain TypeScript with no Node- or Deno-only APIs, so the same
// code runs in the local dev server, the accuracy-test script, and later in a
// Supabase Edge Function. Keys are passed in by the caller, never read here.

export type QuestionType = 'multiple_choice' | 'short_answer' | 'problem_solving' | 'essay';
export type Confidence = 'high' | 'medium' | 'low';

export interface RubricCriterion {
  description: string;
  points: number;
}

export interface QuestionToGrade {
  questionNumber: number;
  text: string;
  type: QuestionType;
  maxScore: number;
  modelAnswer: string;
  criteria: RubricCriterion[];
  lesson?: string;
}

export interface ExamToGrade {
  title: string;
  subject: string;
  /** Language the student-facing feedback should be written in, e.g. "ar" or "en". */
  feedbackLanguage?: string;
  questions: QuestionToGrade[];
}

export interface PaperImage {
  /** Base64 data without the "data:...;base64," prefix. */
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface GradePaperInput {
  exam: ExamToGrade;
  /** One or more photographed pages of the same student's paper, in order. */
  pages: PaperImage[];
}

export interface CriterionResult {
  criterion: string;
  met: boolean;
  pointsAwarded: number;
}

export interface QuestionResult {
  questionNumber: number;
  /** What the student wrote, as read from the paper. */
  transcription: string;
  score: number;
  maxScore: number;
  /** Why this score was given (for the teacher). */
  reason: string;
  /** Short note in the red pen style that the student will see. */
  feedbackForStudent: string;
  criteria: CriterionResult[];
  confidence: Confidence;
  /** True when the answer area could not be read clearly. */
  unreadable: boolean;
}

export interface ModelAttempt {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  /** Why this attempt was not the final one, if it was replaced. */
  replacedBecause?: string;
}

export interface GradePaperResult {
  /** Student code as written on the paper, or null if not found. */
  studentCodeOnPaper: string | null;
  questions: QuestionResult[];
  totalScore: number;
  totalMaxScore: number;
  /** The model whose answer is used. */
  model: string;
  /** Every model call made for this paper (more than one when escalated). */
  attempts: ModelAttempt[];
  totalCostUsd: number;
}

/**
 * A grading provider wraps one AI vendor (Claude now, Gemini can be added
 * later). It grades one paper with one model and reports token usage.
 */
export interface GradingProvider {
  readonly name: string;
  gradeOnce(input: GradePaperInput, model: string, options: GradeOnceOptions): Promise<ProviderOutput>;
}

export interface GradeOnceOptions {
  /** How hard the model should think. Lower is cheaper. */
  effort: 'low' | 'medium' | 'high';
}

export interface ProviderOutput {
  studentCodeOnPaper: string | null;
  questions: QuestionResult[];
  usage: Omit<ModelAttempt, 'model' | 'costUsd' | 'replacedBecause'>;
}

export class GradingError extends Error {
  constructor(
    message: string,
    /** Arabic message safe to show to the teacher. */
    public readonly userMessage: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'GradingError';
  }
}
