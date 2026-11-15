// A small model layer for the teacher's AI tools (question generation, study
// plans, replies…). Tools talk to the `ToolModel` interface, so another
// provider can be added later without touching the tools.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { estimateCostUsd } from '../grading/config.ts';

export type Effort = 'low' | 'medium' | 'high';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ToolModel {
  json<T extends z.ZodType>(req: {
    model: string;
    effort: Effort;
    system: string;
    content: ContentPart[];
    schema: T;
  }): Promise<{ data: z.infer<T>; usage: Usage }>;
  chat(req: { model: string; effort: Effort; system: string; turns: ChatTurn[] }): Promise<{ text: string; usage: Usage }>;
}

/** Error with a message that is safe to show to the teacher (Arabic). */
export class ToolError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
    readonly status = 502,
    /** True when a stronger model may succeed where this one failed (incomplete, declined, malformed answer). */
    readonly escalate = false,
    /** Tokens already spent on the failed call, so the cost is still recorded. */
    readonly usage?: Usage,
  ) {
    super(message);
  }
}

export interface ToolModelConfig {
  /** Writes questions, plans and replies. Cheap by default. */
  mainModel: string;
  /** Second, independent check that every generated question is inside the taught lessons. */
  checkModel: string;
  /** Small, quick jobs such as reading the columns of a student list. */
  fastModel: string;
  /**
   * Stronger (more expensive) model used only when the cheap one fails: an
   * incomplete or malformed answer, a decline, an unreadable photo, or too few
   * questions passing the curriculum check. Empty string turns this off.
   */
  strongModel: string;
}

export function toolConfigFromEnv(env: Record<string, string | undefined>): ToolModelConfig {
  return {
    mainModel: env.AI_TOOLS_MODEL?.trim() || 'claude-haiku-5-5',
    checkModel: env.AI_TOOLS_CHECK_MODEL?.trim() || 'claude-haiku-5-5',
    fastModel: env.AI_TOOLS_FAST_MODEL?.trim() || 'claude-haiku-5-5',
    strongModel: env.AI_TOOLS_STRONG_MODEL !== undefined ? env.AI_TOOLS_STRONG_MODEL.trim() : 'claude-sonnet-5-5',
  };
}

/**
 * Wraps a model so that a call that fails on the cheap model is tried once
 * more on the stronger one. Tokens spent on failed calls are kept in
 * `failedUsage` so the admin cost page still counts them.
 */
export class EscalatingToolModel implements ToolModel {
  readonly failedUsage: Usage[] = [];

  constructor(
    private readonly inner: ToolModel,
    private readonly strongModel: string,
  ) {}

  private canEscalate(model: string, error: unknown): error is ToolError {
    return error instanceof ToolError && error.escalate && !!this.strongModel && model !== this.strongModel;
  }

  private remember(error: ToolError) {
    if (error.usage) this.failedUsage.push(error.usage);
  }

  async json<T extends z.ZodType>(req: { model: string; effort: Effort; system: string; content: ContentPart[]; schema: T }) {
    try {
      return await this.inner.json(req);
    } catch (error) {
      if (!this.canEscalate(req.model, error)) throw error;
      this.remember(error);
      console.warn(`ai tool escalated ${req.model} -> ${this.strongModel}: ${error.message}`);
      return await this.inner.json({ ...req, model: this.strongModel });
    }
  }

  async chat(req: { model: string; effort: Effort; system: string; turns: ChatTurn[] }) {
    try {
      return await this.inner.chat(req);
    } catch (error) {
      if (!this.canEscalate(req.model, error)) throw error;
      this.remember(error);
      return await this.inner.chat({ ...req, model: this.strongModel });
    }
  }

  /** Returns and clears the usage of failed calls. */
  takeFailedUsage(): Usage[] {
    return this.failedUsage.splice(0);
  }
}

export class ClaudeToolModel implements ToolModel {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async json<T extends z.ZodType>(req: { model: string; effort: Effort; system: string; content: ContentPart[]; schema: T }) {
    let response;
    try {
      response = await this.client.messages.parse({
        model: req.model,
        max_tokens: 16000,
        system: req.system,
        messages: [{ role: 'user', content: req.content.map(toBlock) }],
        output_config: { effort: req.effort, format: zodOutputFormat(req.schema) },
      });
    } catch (error) {
      throw toToolError(error);
    }
    const spent = usageOf(req.model, response.usage);
    if (response.stop_reason === 'refusal') {
      throw new ToolError(`Model ${req.model} declined`, 'لم يستطع الذكاء الاصطناعي تنفيذ هذا الطلب. عدّل الطلب وحاول مرة أخرى.', 422, true, spent);
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      throw new ToolError(`Incomplete answer (${response.stop_reason})`, 'جاء الرد ناقصاً. قلّل عدد الأسئلة وحاول مرة أخرى.', 502, true, spent);
    }
    return { data: response.parsed_output as z.infer<T>, usage: usageOf(req.model, response.usage) };
  }

  async chat(req: { model: string; effort: Effort; system: string; turns: ChatTurn[] }) {
    let response;
    try {
      response = await this.client.messages.create({
        model: req.model,
        max_tokens: 4000,
        system: req.system,
        messages: req.turns.map((t) => ({ role: t.role, content: t.text })),
        output_config: { effort: req.effort },
      });
    } catch (error) {
      throw toToolError(error);
    }
    if (response.stop_reason === 'refusal') {
      throw new ToolError(`Model ${req.model} declined`, 'لم يستطع المساعد الرد على هذا الطلب.', 422, true, usageOf(req.model, response.usage));
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return { text, usage: usageOf(req.model, response.usage) };
  }
}

function toBlock(part: ContentPart): Anthropic.ContentBlockParam {
  if (part.type === 'text') return { type: 'text', text: part.text };
  return { type: 'image', source: { type: 'base64', media_type: part.mediaType, data: part.data } };
}

function usageOf(model: string, u: Anthropic.Usage): Usage {
  const usage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
  // Cached tokens are billed too, so they count as input in the log.
  return {
    model,
    inputTokens: usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens,
    outputTokens: usage.outputTokens,
    costUsd: estimateCostUsd(model, usage),
  };
}

function toToolError(error: unknown): ToolError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new ToolError('Invalid Anthropic API key', 'مفتاح الذكاء الاصطناعي غير صحيح. أبلغ مدير المنصة.', 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ToolError('Rate limited', 'ضغط كبير على الخدمة الآن. حاول بعد دقيقة.', 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new ToolError(`Bad request: ${error.message}`, 'البيانات المرسلة غير مقبولة (قد تكون الصورة كبيرة جداً).', 400);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ToolError('Connection failed', 'تعذّر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.');
  }
  if (error instanceof Anthropic.APIError) {
    return new ToolError(`API error ${error.status}: ${error.message}`, 'حدث خطأ في خدمة الذكاء الاصطناعي. حاول مرة أخرى.');
  }
  // Anything else is usually an answer that did not match the expected shape.
  return new ToolError(String(error), 'حدث خطأ غير متوقع.', 500, true);
}
