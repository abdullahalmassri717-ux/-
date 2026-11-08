// Grading settings. Models and prices are data, so they can be changed from
// environment variables (and later from the admin settings) without touching
// the screens.

export interface GradingConfig {
  /** Model that grades every paper first. Cheap by default. */
  primaryModel: string;
  /**
   * Stronger model used only when the first answer is unsure (low confidence,
   * unreadable, or failed). Empty string turns escalation off.
   */
  escalationModel: string;
  /** Escalate when any question has this confidence or lower. */
  escalateAt: 'low' | 'medium';
}

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  primaryModel: 'claude-haiku-5-5',
  escalationModel: 'claude-opus-5-5',
  escalateAt: 'low',
};

/** Builds a config from an env-like object, falling back to the defaults. */
export function gradingConfigFromEnv(env: Record<string, string | undefined>): GradingConfig {
  const escalateAt = env.GRADING_ESCALATE_AT === 'medium' ? 'medium' : 'low';
  return {
    primaryModel: env.GRADING_MODEL?.trim() || DEFAULT_GRADING_CONFIG.primaryModel,
    escalationModel:
      env.GRADING_ESCALATION_MODEL !== undefined
        ? env.GRADING_ESCALATION_MODEL.trim()
        : DEFAULT_GRADING_CONFIG.escalationModel,
    escalateAt,
  };
}

/** US dollars per million tokens (Anthropic list prices, Oct 2026). */
interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICES: Record<string, ModelPrice> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export function estimateCostUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
): number {
  const price = PRICES[model];
  if (!price) return 0;
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
}
