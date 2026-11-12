import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { GRADING_INSTRUCTIONS, renderExam } from './prompt.ts';
import { GradingOutputSchema, type GradingOutput } from './schema.ts';
import {
  GradingError,
  type Confidence,
  type ExamToGrade,
  type GradeOnceOptions,
  type GradePaperInput,
  type GradingProvider,
  type ProviderOutput,
  type QuestionResult,
} from './types.ts';

export class ClaudeGradingProvider implements GradingProvider {
  readonly name = 'claude';
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async gradeOnce(input: GradePaperInput, model: string, options: GradeOnceOptions): Promise<ProviderOutput> {
    const content: Anthropic.ContentBlockParam[] = [
      // Same for every student in the exam, so it is cached after the first paper.
      { type: 'text', text: renderExam(input.exam), cache_control: { type: 'ephemeral' } },
      ...input.pages.map(
        (page): Anthropic.ImageBlockParam => ({
          type: 'image',
          source: { type: 'base64', media_type: page.mediaType, data: page.data },
        }),
      ),
      {
        type: 'text',
        text: `These are the ${input.pages.length} page photo(s) of one student's paper. Grade every question in the exam.`,
      },
    ];

    let response;
    try {
      response = await this.client.messages.parse({
        model,
        max_tokens: 16000,
        system: [{ type: 'text', text: GRADING_INSTRUCTIONS, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
        output_config: { effort: options.effort, format: zodOutputFormat(GradingOutputSchema) },
      });
    } catch (error) {
      throw toGradingError(error);
    }

    if (response.stop_reason === 'refusal') {
      throw new GradingError(`Model ${model} declined the request`, 'لم يستطع النموذج تصحيح هذه الورقة.');
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      throw new GradingError(
        `Model ${model} returned an incomplete answer (${response.stop_reason})`,
        'جاء رد النموذج ناقصاً. حاول مرة أخرى.',
        true,
      );
    }

    return {
      studentCodeOnPaper: response.parsed_output.student_code_on_paper,
      studentNameOnPaper: response.parsed_output.student_name_on_paper,
      questions: normalizeQuestions(input.exam, response.parsed_output),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}

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
    const score = sameShape ? Math.min(awarded, q.maxScore) : Math.min(Math.max(found.score, 0), q.maxScore);
    // If the model's own total disagrees with its criteria, the teacher should look.
    const inconsistent = !sameShape || Math.abs(found.score - score) > 0.01;
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

function toGradingError(error: unknown): GradingError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new GradingError('Invalid Anthropic API key', 'مفتاح Claude غير صحيح. تأكد من الإعدادات.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new GradingError('Rate limited', 'ضغط كبير على الخدمة الآن. حاول بعد دقيقة.', true);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new GradingError(`Bad request: ${error.message}`, 'الصورة أو البيانات المرسلة غير مقبولة.');
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new GradingError('Connection failed', 'تعذّر الاتصال بخدمة التصحيح. تأكد من الإنترنت.', true);
  }
  if (error instanceof Anthropic.APIError) {
    return new GradingError(`API error ${error.status}: ${error.message}`, 'حدث خطأ في خدمة التصحيح. حاول مرة أخرى.', true);
  }
  return new GradingError(String(error), 'حدث خطأ غير متوقع أثناء التصحيح.');
}
