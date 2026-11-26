// When an organization has not paid (an overdue invoice, or a manual lock by
// the platform admin), AI tools, grading and new papers stop. Sign-in and
// reading data keep working, and nothing is deleted.
// Rules live in the database: private.billing_lock (migration 20261126000300).
import type { SupabaseClient } from '@supabase/supabase-js';

export const BILLING_LOCK_MESSAGE =
  'الاشتراك متوقف لعدم الدفع، فأدوات الذكاء الاصطناعي والتصحيح ورفع الأوراق متوقفة مؤقتاً. بياناتك كلها محفوظة، وتعود الخدمة فور تأكيد الدفع.';

/** null when the organization may use AI; otherwise the reason ('unpaid' | 'manual'). */
export async function billingLock(admin: SupabaseClient, orgId: string): Promise<string | null> {
  const { data, error } = await admin.rpc('org_billing_lock', { p_org: orgId });
  if (error) {
    // Never block a paying school because of a passing database hiccup.
    console.warn('billingLock', error.message);
    return null;
  }
  return (data as string | null) ?? null;
}
