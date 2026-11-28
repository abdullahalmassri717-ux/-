// Free-trial limits: during the trial an organization may grade a set number of
// papers and make a set number of AI tool requests (numbers in admin settings,
// platform_settings 'trial'). After the first paid invoice there is no limit.
// Rules live in the database: private.trial_quota (migration 20261128000100).
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TrialQuota {
  in_trial: boolean;
  papers_used?: number;
  papers_limit?: number;
  ai_used?: number;
  ai_limit?: number;
}

export const TRIAL_PAPERS_MESSAGE = (limit: number) =>
  `انتهى رصيد الفترة التجريبية: صحّحت ${limit} ورقة مجاناً. اشترك لتكمل التصحيح بالذكاء الاصطناعي. الأوراق الجديدة محفوظة وتُصحَّح فور تفعيل الاشتراك.`;
export const TRIAL_AI_MESSAGE = (limit: number) =>
  `انتهى رصيد الفترة التجريبية لأدوات الذكاء الاصطناعي (${limit} طلباً). اشترك لتكمل استخدامها بلا حدود تجريبية.`;

// Importing the student list is part of getting started, so it never counts.
export const FREE_TRIAL_TASKS = new Set(['map_student_columns']);

export async function trialQuota(admin: SupabaseClient, orgId: string): Promise<TrialQuota> {
  const { data, error } = await admin.rpc('org_trial_quota', { p_org: orgId });
  if (error || !data) {
    // Never block a teacher because of a passing database hiccup.
    if (error) console.warn('trialQuota', error.message);
    return { in_trial: false };
  }
  return data as TrialQuota;
}

const over = (used?: number, limit?: number) => (limit ?? 0) > 0 && (used ?? 0) >= (limit ?? 0);

/** The Arabic message when the trial's paper allowance is used up, else null. */
export function papersExhausted(q: TrialQuota): string | null {
  return q.in_trial && over(q.papers_used, q.papers_limit) ? TRIAL_PAPERS_MESSAGE(q.papers_limit!) : null;
}

/** The Arabic message when the trial's AI-tool allowance is used up, else null. */
export function aiExhausted(q: TrialQuota): string | null {
  return q.in_trial && over(q.ai_used, q.ai_limit) ? TRIAL_AI_MESSAGE(q.ai_limit!) : null;
}

/** Counts one successful AI tool request (the database ignores it outside the trial). */
export async function countAiRequest(admin: SupabaseClient, orgId: string): Promise<void> {
  const { error } = await admin.rpc('trial_count_ai_request', { p_org: orgId });
  if (error) console.warn('countAiRequest', error.message);
}
