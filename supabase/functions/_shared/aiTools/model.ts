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
  ) {
    super(message);
  }
}

export interface ToolModelConfig {
  /** Writes questions, plans and replies. */
  mainModel: string;
  /** Second, independent check that every generated question is inside the taught lessons. */
  checkModel: string;
}

export function toolConfigFromEnv(env: Record<string, string | undefined>): ToolModelConfig {
  return {
    mainModel: env.AI_TOOLS_MODEL?.trim() || 'claude-opus-5-5',
    checkModel: env.AI_TOOLS_CHECK_MODEL?.trim() || 'claude-sonnet-5-5',
  };
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
    if (response.stop_reason === 'refusal') {
      throw new ToolError(`Model ${req.model} declined`, 'لم يستطع الذكاء الاصطناعي تنفيذ هذا الطلب. عدّل الطلب وحاول مرة أخرى.', 422);
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      throw new ToolError(`Incomplete answer (${response.stop_reason})`, 'جاء الرد ناقصاً. قلّل عدد الأسئلة وحاول مرة أخرى.');
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
      throw new ToolError(`Model ${req.model} declined`, 'لم يستطع المساعد الرد على هذا الطلب.', 422);
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
  return { model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd: estimateCostUsd(model, usage) };
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
  return new ToolError(String(error), 'حدث خطأ غير متوقع.', 500);
}
