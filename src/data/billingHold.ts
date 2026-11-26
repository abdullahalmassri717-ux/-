// "What happens when an organization doesn't pay": the database decides
// (private.billing_lock, migration 20261126000300). These helpers read that
// state for the warning banner and let the platform admin lock, give a grace
// period, or return an organization to automatic.
import { supabase } from '../lib/supabase';

export type BillingLock = 'unpaid' | 'manual' | null;

export interface BillingState {
  locked: BillingLock;
  owner: boolean;
  /** Set only in the last days of the trial. */
  trialEndsOn?: string | null;
  invoice?: { number: string; amount: number; currency: string; dueOn: string } | null;
  pendingReceipt?: boolean;
}

export async function getBillingState(orgId: string): Promise<BillingState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('my_billing_state', { p_org: orgId });
  if (error || !data) return null;
  const d = data as {
    locked: BillingLock; owner: boolean; trial_ends_on?: string | null; pending_receipt?: boolean;
    invoice?: { number: string; amount: number; currency: string; due_on: string } | null;
  };
  return {
    locked: d.locked ?? null,
    owner: d.owner,
    trialEndsOn: d.trial_ends_on ?? null,
    pendingReceipt: Boolean(d.pending_receipt),
    invoice: d.invoice ? { number: d.invoice.number, amount: Number(d.invoice.amount), currency: d.invoice.currency, dueOn: d.invoice.due_on } : null,
  };
}

export type BillingHoldMode = 'auto' | 'lock' | 'grace';

export interface OrgBillingRow {
  locked: BillingLock;
  hold: 'lock' | 'grace' | null;
  holdUntil: string | null;
  nextInvoiceOn: string | null;
  overdueSince: string | null;
}

/** Platform admin: payment state of every organization, by id. */
export async function adminBillingOverview(): Promise<Record<string, OrgBillingRow>> {
  if (!supabase) return {};
  const { data, error } = await supabase.rpc('admin_billing_overview');
  if (error) return {};
  const out: Record<string, OrgBillingRow> = {};
  for (const r of (data ?? []) as {
    organization_id: string; locked: BillingLock; billing_hold: 'lock' | 'grace' | null; billing_hold_until: string | null;
    next_invoice_on: string | null; overdue_since: string | null;
  }[]) {
    out[r.organization_id] = { locked: r.locked, hold: r.billing_hold, holdUntil: r.billing_hold_until, nextInvoiceOn: r.next_invoice_on, overdueSince: r.overdue_since };
  }
  return out;
}

export async function adminSetBillingHold(orgId: string, mode: BillingHoldMode, until: string | null = null): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_set_billing_hold', { p_org: orgId, p_mode: mode, p_until: until });
  if (error) throw new Error(/[؀-ۿ]/.test(error.message) ? error.message : 'تعذّر الحفظ.');
}
