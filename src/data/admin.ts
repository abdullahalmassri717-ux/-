// Platform admin: organizations, payments to confirm, invoices, plans and
// grading quality. Every call is checked again by the database (admin only).
import { supabase } from '../lib/supabase';
import { MOCK_PLATFORM_CLIENTS, MOCK_SUBSCRIPTION_PLANS } from '../mockData';

export type OrgStatus = 'pending' | 'active' | 'disabled';
export type PricingModel = 'per_student' | 'per_paper';
export type InvoiceStatus = 'issued' | 'pending_confirmation' | 'paid' | 'overdue' | 'void';
export type PaymentMethod = 'bank_transfer' | 'e_wallet' | 'cash' | 'other';

export interface AdminOrg {
  id: string;
  name: string;
  kind: 'individual_teacher' | 'school' | 'learning_center';
  region: string;
  createdAt: string;
  status: OrgStatus;
  statusNote: string;
  ownerName: string;
  ownerPhone: string;
  /** The owner was invited by phone and has not signed in yet. */
  ownerInvited: boolean;
  activeStudents: number;
  teachers: number;
  planId: string | null;
  planName: string;
  pricingModel: PricingModel | null;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | null;
  trialEndsOn: string | null;
  papers30d: number;
  gradingCost30d: number;
  unpaidAmount: number;
  /** One of the demo accounts used to try the platform (not a real customer). */
  isDemo: boolean;
  /** For a private tutor: the schools or centres where the same person also teaches. */
  ownerAlsoTeachesAt: string;
}

export interface AdminReceipt {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  orgName: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  storagePath: string | null;
  recordedByAdmin: boolean;
  note: string;
}

export interface AdminInvoice {
  id: string;
  number: string;
  orgId: string;
  orgName: string;
  periodStart: string;
  periodEnd: string;
  pricingModel: PricingModel | null;
  units: number;
  unitPrice: number;
  amount: number;
  /** Sum of confirmed payments. */
  paidAmount: number;
  status: InvoiceStatus;
  dueOn: string | null;
  paidAt: string | null;
  notes: string;
  createdAt: string;
}

/** Volume bracket: the whole count is priced at the bracket it falls in. */
export interface PriceTier {
  upTo: number | null;
  price: number;
}

export interface AdminPlan {
  id: string;
  slug: string | null;
  name: string;
  target: 'teachers' | 'schools' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  pricingModel: PricingModel;
  /** Price per unit (student or paper) when no tier applies. */
  pricePerStudent: number;
  tiers: PriceTier[];
  minimumCharge: number;
  installments: number;
  features: string[];
  isActive: boolean;
  isPublic: boolean;
  isPopular: boolean;
  notes: string;
}

/** What an organization would be billed now, from its real usage. */
export interface UsageQuote {
  planName: string;
  pricingModel: PricingModel;
  billingCycle: 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  units: number;
  unitPrice: number;
  amount: number;
  /** Days the monthly subscription was paused in this period (not billed). */
  pausedDays: number;
  periodDays: number;
}

export interface GradingQuality {
  runs: number;
  failed: number;
  escalated: number;
  costUsd: number;
  answers: number;
  lowConfidence: number;
  edited: number;
  avgAbsChange: number;
  byModel: { model: string; runs: number; costUsd: number }[];
  byDay: { day: string; runs: number; costUsd: number }[];
  bySubject: { subject: string; answers: number; edited: number }[];
  /** Real AI grading cost per organization, to compare with what it pays. */
  byOrg: OrgGradingCost[];
  /** Dollar to shekel rate from platform settings (AI is billed in dollars). */
  usdToIls: number;
  /** Other AI use (question generation, exam reading, assistant...), billed to the same Claude credit. */
  tools: AiToolsUsage;
}

export interface AiToolsUsage {
  runs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  byTask: { task: string; runs: number; costUsd: number }[];
}

export interface OrgGradingCost {
  orgId: string;
  name: string;
  kind: string;
  papers: number;
  pages: number;
  escalated: number;
  costUsd: number;
  activeStudents: number;
  /** Invoiced to the organization in the same period (in the platform currency). */
  billed: number;
}

export interface NewOrgInput {
  name: string;
  kind: AdminOrg['kind'];
  region: string;
  ownerPhone: string; // international, +970…
  ownerName: string;
  planId: string | null;
}

export interface AdminApi {
  listOrganizations(): Promise<AdminOrg[]>;
  setOrgStatus(id: string, status: OrgStatus, note?: string): Promise<void>;
  updateOrg(id: string, patch: { name: string; kind: AdminOrg['kind']; region: string }): Promise<void>;
  changePlan(orgId: string, planId: string): Promise<void>;
  deleteOrg(id: string, confirmName: string): Promise<void>;
  createOrg(input: NewOrgInput): Promise<void>;
  listReceipts(status?: 'pending' | 'all'): Promise<AdminReceipt[]>;
  listInvoicePayments(invoiceId: string): Promise<AdminReceipt[]>;
  receiptUrl(path: string): Promise<string | null>;
  reviewReceipt(id: string, status: 'confirmed' | 'rejected', note: string): Promise<void>;
  deletePayment(id: string): Promise<void>;
  listInvoices(): Promise<AdminInvoice[]>;
  invoicePreview(orgId: string): Promise<UsageQuote | null>;
  issueInvoice(orgId: string, amount?: number, note?: string): Promise<void>;
  issueInvoicesBulk(kind: 'individual_teacher' | 'schools' | 'all'): Promise<number>;
  createInvoice(orgId: string, amount: number, note: string, dueOn: string | null): Promise<void>;
  recordPayment(invoiceId: string, input: { amount: number; method: PaymentMethod; reference: string; note: string }): Promise<void>;
  setInvoiceStatus(id: string, status: InvoiceStatus): Promise<void>;
  listPlans(): Promise<AdminPlan[]>;
  savePlan(plan: Omit<AdminPlan, 'id'> & { id?: string }): Promise<void>;
  gradingQuality(days: number): Promise<GradingQuality>;
}

/** Unit price for a count: the matching tier, else the plan's base price. */
export function unitPriceFor(tiers: PriceTier[], base: number, units: number): number {
  const sorted = [...tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  return sorted.find((t) => t.upTo === null || units <= t.upTo)?.price ?? base;
}

export const toTiers = (raw: unknown): PriceTier[] =>
  Array.isArray(raw)
    ? raw
        .map((t: { up_to?: number | null; price?: number }) => ({ upTo: t?.up_to ?? null, price: Number(t?.price ?? 0) }))
        .filter((t) => Number.isFinite(t.price))
    : [];

const toQuote = (d: Record<string, unknown> | null): UsageQuote | null =>
  d
    ? {
        planName: String(d.plan_name ?? ''),
        pricingModel: (d.pricing_model as PricingModel) ?? 'per_student',
        billingCycle: (d.billing_cycle as UsageQuote['billingCycle']) ?? 'monthly',
        periodStart: String(d.period_start ?? ''),
        periodEnd: String(d.period_end ?? ''),
        units: Number(d.units ?? 0),
        unitPrice: Number(d.unit_price ?? 0),
        amount: Number(d.amount ?? 0),
        pausedDays: Number(d.paused_days ?? 0),
        periodDays: Number(d.period_days ?? 0),
      }
    : null;
export { toQuote };

class AdminError extends Error {}
const fail = (e: { message?: string } | null, fallback: string): never => {
  const msg = e?.message ?? '';
  throw new AdminError(/[؀-ۿ]/.test(msg) ? msg : fallback);
};

function localPhone(p: string | null | undefined): string {
  if (!p) return '';
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

type ReceiptDb = {
  id: string; invoice_id: string; method: PaymentMethod; amount: number; reference: string | null; status: AdminReceipt['status'];
  created_at: string; storage_path: string | null; recorded_by_admin: boolean | null; review_note: string | null;
  invoices: { number: string; amount: number } | null; organizations: { name: string } | null;
};
const RECEIPT_COLS = 'id, invoice_id, method, amount, reference, status, created_at, storage_path, recorded_by_admin, review_note, invoices(number, amount), organizations(name)';
const toReceipt = (r: ReceiptDb): AdminReceipt => ({
  id: r.id,
  invoiceId: r.invoice_id,
  invoiceNumber: one(r.invoices)?.number ?? '',
  invoiceAmount: Number(one(r.invoices)?.amount ?? 0),
  orgName: one(r.organizations)?.name ?? '',
  method: r.method,
  amount: Number(r.amount),
  reference: r.reference ?? '',
  status: r.status,
  createdAt: r.created_at,
  storagePath: r.storage_path,
  recordedByAdmin: !!r.recorded_by_admin,
  note: r.review_note ?? '',
});

function realApi(): AdminApi {
  const db = supabase!;
  const rpc = async (fn: string, args: Record<string, unknown>, fallback: string) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) fail(error, fallback);
    return data as unknown;
  };
  return {
    async listOrganizations() {
      const data = await rpc('admin_organizations', {}, 'تعذّر تحميل الجهات.');
      type Row = {
        id: string; name: string; kind: AdminOrg['kind']; region: string | null; created_at: string; status: OrgStatus | null; status_note: string | null;
        owner_name: string | null; owner_phone: string | null; owner_invited: boolean | null;
        active_students: number; teachers: number; plan_id: string | null; plan_name: string | null; pricing_model: PricingModel | null;
        subscription_status: AdminOrg['subscriptionStatus']; trial_ends_on: string | null;
        papers_30d: number; grading_cost_30d: number; unpaid_amount: number;
        is_demo: boolean | null; owner_also_teaches_at: string | null;
      };
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        region: r.region ?? '',
        createdAt: r.created_at,
        status: r.status ?? 'active',
        statusNote: r.status_note ?? '',
        ownerName: r.owner_name ?? '',
        ownerPhone: localPhone(r.owner_phone),
        ownerInvited: !!r.owner_invited,
        activeStudents: r.active_students,
        teachers: r.teachers,
        planId: r.plan_id,
        planName: r.plan_name ?? '',
        pricingModel: r.pricing_model,
        subscriptionStatus: r.subscription_status,
        trialEndsOn: r.trial_ends_on,
        papers30d: r.papers_30d,
        gradingCost30d: Number(r.grading_cost_30d),
        unpaidAmount: Number(r.unpaid_amount),
        isDemo: !!r.is_demo,
        ownerAlsoTeachesAt: r.owner_also_teaches_at ?? '',
      }));
    },
    async setOrgStatus(id, status, note = '') {
      await rpc('admin_set_org_status', { p_org: id, p_status: status, p_note: note }, 'تعذّر تغيير حالة الجهة.');
    },
    async updateOrg(id, patch) {
      await rpc('admin_update_org', { p_org: id, p_name: patch.name, p_kind: patch.kind, p_region: patch.region }, 'تعذّر حفظ الجهة.');
    },
    async changePlan(orgId, planId) {
      await rpc('admin_change_plan', { p_org: orgId, p_plan: planId }, 'تعذّر تغيير الباقة.');
    },
    async deleteOrg(id, confirmName) {
      await rpc('admin_delete_org', { p_org: id, p_confirm_name: confirmName }, 'تعذّر حذف الجهة.');
    },
    async createOrg(input) {
      await rpc(
        'admin_create_org',
        { p_name: input.name, p_kind: input.kind, p_region: input.region, p_owner_phone: input.ownerPhone, p_owner_name: input.ownerName, p_plan: input.planId },
        'تعذّر إضافة الجهة.',
      );
    },
    async listReceipts(status = 'pending') {
      let q = db.from('payment_receipts').select(RECEIPT_COLS).order('created_at', { ascending: false }).limit(200);
      if (status === 'pending') q = q.eq('status', 'pending');
      const { data, error } = await q;
      if (error) fail(error, 'تعذّر تحميل الإيصالات.');
      return ((data ?? []) as unknown as ReceiptDb[]).map(toReceipt);
    },
    async listInvoicePayments(invoiceId) {
      const { data, error } = await db.from('payment_receipts').select(RECEIPT_COLS).eq('invoice_id', invoiceId).order('created_at', { ascending: false });
      if (error) fail(error, 'تعذّر تحميل الدفعات.');
      return ((data ?? []) as unknown as ReceiptDb[]).map(toReceipt);
    },
    async receiptUrl(path) {
      const { data } = await db.storage.from('payment-receipts').createSignedUrl(path, 600);
      return data?.signedUrl ?? null;
    },
    async reviewReceipt(id, status, note) {
      const { error } = await db.from('payment_receipts').update({ status, review_note: note.trim() || null }).eq('id', id);
      if (error) fail(error, 'تعذّر حفظ المراجعة.');
    },
    async deletePayment(id) {
      const { error } = await db.from('payment_receipts').delete().eq('id', id);
      if (error) fail(error, 'تعذّر حذف الدفعة.');
    },
    async listInvoices() {
      const { data, error } = await db
        .from('invoices')
        .select('id, number, organization_id, period_start, period_end, pricing_model, units, active_students, price_per_student, amount, status, due_on, paid_at, notes, created_at, organizations(name), payment_receipts(amount, status)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) fail(error, 'تعذّر تحميل الفواتير.');
      type Row = {
        id: string; number: string; organization_id: string; period_start: string; period_end: string; pricing_model: PricingModel | null; units: number | null;
        active_students: number; price_per_student: number; amount: number; status: InvoiceStatus; due_on: string | null; paid_at: string | null; notes: string | null;
        created_at: string; organizations: { name: string } | null; payment_receipts: { amount: number; status: string }[] | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        number: r.number,
        orgId: r.organization_id,
        orgName: one(r.organizations)?.name ?? '',
        periodStart: r.period_start,
        periodEnd: r.period_end,
        pricingModel: r.pricing_model,
        units: r.units ?? r.active_students ?? 0,
        unitPrice: Number(r.price_per_student),
        amount: Number(r.amount),
        paidAmount: (r.payment_receipts ?? []).filter((p) => p.status === 'confirmed').reduce((n, p) => n + Number(p.amount), 0),
        status: r.status,
        dueOn: r.due_on,
        paidAt: r.paid_at,
        notes: r.notes ?? '',
        createdAt: r.created_at,
      }));
    },
    async invoicePreview(orgId) {
      return toQuote((await rpc('admin_invoice_preview', { p_org: orgId }, 'تعذّر حساب الفاتورة.')) as Record<string, unknown> | null);
    },
    async issueInvoice(orgId, amount, note) {
      await rpc('admin_issue_invoice', { p_org: orgId, p_amount: amount ?? null, p_note: note ?? null }, 'تعذّر إصدار الفاتورة.');
    },
    async issueInvoicesBulk(kind) {
      return Number(await rpc('admin_issue_invoices_bulk', { p_kind: kind }, 'تعذّر إصدار الفواتير.'));
    },
    async createInvoice(orgId, amount, note, dueOn) {
      await rpc('admin_create_invoice', { p_org: orgId, p_amount: amount, p_note: note, p_due_on: dueOn }, 'تعذّر إنشاء الفاتورة.');
    },
    async recordPayment(invoiceId, input) {
      await rpc(
        'admin_record_payment',
        { p_invoice: invoiceId, p_amount: input.amount, p_method: input.method, p_reference: input.reference, p_note: input.note },
        'تعذّر تسجيل الدفعة.',
      );
    },
    async setInvoiceStatus(id, status) {
      const { error } = await db.from('invoices').update({ status }).eq('id', id);
      if (error) fail(error, 'تعذّر تحديث الفاتورة.');
    },
    async listPlans() {
      const { data, error } = await db.from('subscription_plans').select('*').order('sort_order');
      if (error) fail(error, 'تعذّر تحميل الباقات.');
      type Row = {
        id: string; slug: string | null; name: string; target: AdminPlan['target']; billing_cycle: AdminPlan['billingCycle']; price_per_student: number;
        pricing_model: PricingModel | null; tiers: unknown;
        minimum_charge: number; installments: number; features: string[]; is_active: boolean; is_public: boolean; is_popular: boolean; notes: string | null;
      };
      return ((data ?? []) as Row[]).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        target: p.target,
        billingCycle: p.billing_cycle,
        pricingModel: p.pricing_model ?? 'per_student',
        pricePerStudent: Number(p.price_per_student),
        tiers: toTiers(p.tiers),
        minimumCharge: Number(p.minimum_charge),
        installments: p.installments,
        features: p.features ?? [],
        isActive: p.is_active,
        isPublic: p.is_public,
        isPopular: p.is_popular,
        notes: p.notes ?? '',
      }));
    },
    async savePlan(p) {
      const row = {
        name: p.name.trim(),
        target: p.target,
        billing_cycle: p.billingCycle,
        pricing_model: p.pricingModel,
        price_per_student: p.pricePerStudent,
        tiers: p.tiers.map((t) => ({ up_to: t.upTo, price: t.price })),
        minimum_charge: 0,
        installments: p.installments,
        features: p.features,
        is_active: p.isActive,
        is_public: p.isPublic,
        is_popular: p.isPopular,
        notes: p.notes.trim() || null,
      };
      const { error } = p.id ? await db.from('subscription_plans').update(row).eq('id', p.id) : await db.from('subscription_plans').insert(row);
      if (error) fail(error, 'تعذّر حفظ الباقة.');
    },
    async gradingQuality(days) {
      const [{ data, error }, byOrgRes, toolsRes] = await Promise.all([
        db.rpc('admin_grading_quality', { p_days: days }),
        db.rpc('admin_grading_cost_by_org', { p_days: days }),
        db.rpc('admin_ai_tools_usage', { p_days: days }),
      ]);
      if (error) fail(error, 'تعذّر تحميل بيانات الجودة.');
      if (byOrgRes.error) fail(byOrgRes.error, 'تعذّر تحميل تكلفة الجهات.');
      const o = (byOrgRes.data ?? {}) as { usd_to_ils?: number; orgs?: Record<string, unknown>[] };
      const d = (data ?? {}) as Record<string, unknown>;
      const n = (k: string) => Number(d[k] ?? 0);
      return {
        runs: n('runs'),
        failed: n('failed'),
        escalated: n('escalated'),
        costUsd: n('cost_usd'),
        answers: n('answers'),
        lowConfidence: n('low_confidence'),
        edited: n('edited'),
        avgAbsChange: n('avg_abs_change'),
        byModel: ((d.by_model ?? []) as { model: string; runs: number; cost_usd: number }[]).map((x) => ({ model: x.model, runs: x.runs, costUsd: Number(x.cost_usd) })),
        byDay: ((d.by_day ?? []) as { day: string; runs: number; cost_usd: number }[]).map((x) => ({ day: x.day, runs: x.runs, costUsd: Number(x.cost_usd) })),
        bySubject: (d.by_subject ?? []) as GradingQuality['bySubject'],
        usdToIls: Number(o.usd_to_ils ?? 3.7),
        // Older databases may not have this function yet: show zero instead of failing the page.
        tools: (() => {
          const t = (toolsRes.error ? {} : toolsRes.data ?? {}) as Record<string, unknown>;
          return {
            runs: Number(t.runs ?? 0),
            costUsd: Number(t.cost_usd ?? 0),
            inputTokens: Number(t.input_tokens ?? 0),
            outputTokens: Number(t.output_tokens ?? 0),
            byTask: ((t.by_task ?? []) as { task: string; runs: number; cost_usd: number }[]).map((x) => ({ task: x.task, runs: x.runs, costUsd: Number(x.cost_usd) })),
          };
        })(),
        byOrg: (o.orgs ?? []).map((x) => ({
          orgId: String(x.org_id),
          name: String(x.name ?? ''),
          kind: String(x.kind ?? ''),
          papers: Number(x.papers ?? 0),
          pages: Number(x.pages ?? 0),
          escalated: Number(x.escalated ?? 0),
          costUsd: Number(x.cost_usd ?? 0),
          activeStudents: Number(x.active_students ?? 0),
          billed: Number(x.billed ?? 0),
        })),
      };
    },
  };
}

function demoApi(): AdminApi {
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
  const today = () => new Date().toISOString().slice(0, 10);
  const plans: AdminPlan[] = MOCK_SUBSCRIPTION_PLANS.map((p) => ({
    id: p.id,
    slug: null,
    name: p.name,
    target: p.target,
    billingCycle: p.billingCycle,
    pricingModel: 'per_student',
    pricePerStudent: p.pricePerStudent,
    tiers: [],
    minimumCharge: 0,
    installments: 1,
    features: p.features,
    isActive: p.isActive,
    isPublic: true,
    isPopular: !!p.isPopular,
    notes: p.notes ?? '',
  }));
  const orgs: AdminOrg[] = MOCK_PLATFORM_CLIENTS.map((c, i) => {
    const plan = plans.find((p) => p.target === (c.type === 'school' ? 'schools' : 'teachers')) ?? null;
    return {
      id: c.id,
      name: c.name,
      kind: c.type === 'school' ? 'school' : 'individual_teacher',
      region: 'غزة',
      createdAt: new Date(Date.now() - (i + 1) * 20 * 86400000).toISOString(),
      status: i === 2 ? 'pending' : 'active',
      statusNote: '',
      ownerName: c.name,
      ownerPhone: `05990000${10 + i}`,
      ownerInvited: false,
      activeStudents: c.studentsCount,
      teachers: c.type === 'school' ? 8 : 0,
      planId: plan?.id ?? null,
      planName: plan?.name ?? c.plan,
      pricingModel: 'per_student',
      subscriptionStatus: c.paymentStatus === 'overdue' ? 'past_due' : i === 2 ? 'trial' : 'active',
      trialEndsOn: null,
      papers30d: c.studentsCount * 3,
      gradingCost30d: c.studentsCount * 0.02,
      unpaidAmount: c.paymentStatus === 'paid' ? 0 : c.amount,
      isDemo: false,
      ownerAlsoTeachesAt: '',
    };
  });
  const invoices: AdminInvoice[] = MOCK_PLATFORM_CLIENTS.map((c, i) => ({
    id: `inv_${c.id}`,
    number: `INV-DEMO-${i + 1}`,
    orgId: c.id,
    orgName: c.name,
    periodStart: today(),
    periodEnd: today(),
    pricingModel: 'per_student',
    units: c.studentsCount,
    unitPrice: c.studentsCount ? c.amount / c.studentsCount : 0,
    amount: c.amount,
    paidAmount: c.paymentStatus === 'paid' ? c.amount : 0,
    status: c.paymentStatus === 'paid' ? 'paid' : c.paymentStatus === 'overdue' ? 'overdue' : 'pending_confirmation',
    dueOn: null,
    paidAt: null,
    notes: '',
    createdAt: new Date().toISOString(),
  }));
  const receipts: AdminReceipt[] = invoices
    .filter((i) => i.status === 'pending_confirmation')
    .map((i, n) => ({
      id: `r${n}`,
      invoiceId: i.id,
      invoiceNumber: i.number,
      invoiceAmount: i.amount,
      orgName: i.orgName,
      method: 'bank_transfer',
      amount: i.amount,
      reference: '—',
      status: 'pending',
      createdAt: new Date().toISOString(),
      storagePath: null,
      recordedByAdmin: false,
      note: '',
    }));
  const refresh = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'void') return;
    const mine = receipts.filter((r) => r.invoiceId === invoiceId);
    inv.paidAmount = mine.filter((r) => r.status === 'confirmed').reduce((n, r) => n + r.amount, 0);
    if (inv.paidAmount >= inv.amount) {
      inv.status = 'paid';
      inv.paidAt ??= new Date().toISOString();
    } else if (mine.some((r) => r.status === 'pending')) {
      if (inv.status === 'issued' || inv.status === 'overdue') inv.status = 'pending_confirmation';
    } else if (inv.status === 'pending_confirmation') inv.status = 'issued';
  };
  const quote = (orgId: string): UsageQuote | null => {
    const o = orgs.find((x) => x.id === orgId);
    const plan = plans.find((p) => p.id === o?.planId);
    if (!o || !plan) return null;
    const units = plan.pricingModel === 'per_paper' ? o.papers30d : o.activeStudents;
    const unitPrice = unitPriceFor(plan.tiers, plan.pricePerStudent, units);
    return {
      planName: plan.name,
      pricingModel: plan.pricingModel,
      billingCycle: plan.billingCycle,
      periodStart: today(),
      periodEnd: today(),
      units,
      unitPrice,
      amount: Math.round((units * unitPrice * 100) / (plan.billingCycle === 'yearly' ? Math.max(1, plan.installments) : 1)) / 100,

      pausedDays: 0,
      periodDays: 1,
    };
  };
  const addInvoice = (orgId: string, amount: number, note: string, q: UsageQuote | null) => {
    const o = orgs.find((x) => x.id === orgId);
    invoices.unshift({
      id: `inv_${Date.now()}`,
      number: `INV-DEMO-${invoices.length + 1}`,
      orgId,
      orgName: o?.name ?? '',
      periodStart: q?.periodStart ?? today(),
      periodEnd: q?.periodEnd ?? today(),
      pricingModel: q?.pricingModel ?? null,
      units: q?.units ?? 0,
      unitPrice: q?.unitPrice ?? 0,
      amount,
      paidAmount: 0,
      status: 'issued',
      dueOn: null,
      paidAt: null,
      notes: note,
      createdAt: new Date().toISOString(),
    });
  };
  return {
    listOrganizations: () => wait(orgs.map((o) => ({ ...o }))),
    async setOrgStatus(id, status, note = '') {
      const o = orgs.find((x) => x.id === id);
      if (o) Object.assign(o, { status, statusNote: note });
      await wait(null);
    },
    async updateOrg(id, patch) {
      Object.assign(orgs.find((x) => x.id === id) ?? {}, patch);
      await wait(null);
    },
    async changePlan(orgId, planId) {
      const o = orgs.find((x) => x.id === orgId);
      const p = plans.find((x) => x.id === planId);
      if (o && p) Object.assign(o, { planId: p.id, planName: p.name, pricingModel: p.pricingModel, subscriptionStatus: o.subscriptionStatus ?? 'active' });
      await wait(null);
    },
    async deleteOrg(id, confirmName) {
      const i = orgs.findIndex((x) => x.id === id);
      if (i < 0 || orgs[i].name.trim() !== confirmName.trim()) throw new AdminError('اكتب اسم الجهة كما هو بالضبط لتأكيد الحذف');
      orgs.splice(i, 1);
      await wait(null);
    },
    async createOrg(input) {
      const p = plans.find((x) => x.id === input.planId);
      orgs.unshift({
        id: `org_${Date.now()}`,
        name: input.name,
        kind: input.kind,
        region: input.region,
        createdAt: new Date().toISOString(),
        status: 'active',
        statusNote: '',
        ownerName: input.ownerName,
        ownerPhone: localPhone(input.ownerPhone),
        ownerInvited: true,
        activeStudents: 0,
        teachers: 0,
        planId: p?.id ?? null,
        planName: p?.name ?? '',
        pricingModel: p?.pricingModel ?? null,
        subscriptionStatus: 'trial',
        trialEndsOn: null,
        papers30d: 0,
        gradingCost30d: 0,
        unpaidAmount: 0,
        isDemo: false,
        ownerAlsoTeachesAt: '',
      });
      await wait(null);
    },
    listReceipts: (status = 'pending') => wait(receipts.filter((r) => status === 'all' || r.status === 'pending').map((r) => ({ ...r }))),
    listInvoicePayments: (invoiceId) => wait(receipts.filter((r) => r.invoiceId === invoiceId).map((r) => ({ ...r }))),
    receiptUrl: () => wait(null),
    async reviewReceipt(id, status) {
      const r = receipts.find((x) => x.id === id);
      if (r) {
        r.status = status;
        refresh(r.invoiceId);
      }
      await wait(null);
    },
    async deletePayment(id) {
      const i = receipts.findIndex((x) => x.id === id);
      if (i >= 0) {
        const [r] = receipts.splice(i, 1);
        refresh(r.invoiceId);
      }
      await wait(null);
    },
    listInvoices: () => wait(invoices.map((i) => ({ ...i }))),
    invoicePreview: (orgId) => wait(quote(orgId)),
    async issueInvoice(orgId, amount, note = '') {
      const q = quote(orgId);
      addInvoice(orgId, amount ?? q?.amount ?? 0, note, q);
      await wait(null);
    },
    async issueInvoicesBulk(kind) {
      let n = 0;
      for (const o of orgs)
        if (o.status === 'active' && (kind === 'all' || (kind === 'schools' ? o.kind !== 'individual_teacher' : o.kind === kind))) {
          const q = quote(o.id);
          if (q && q.amount > 0) {
            addInvoice(o.id, q.amount, '', q);
            n++;
          }
        }
      return wait(n);
    },
    async createInvoice(orgId, amount, note) {
      addInvoice(orgId, amount, note, null);
      await wait(null);
    },
    async recordPayment(invoiceId, input) {
      const inv = invoices.find((i) => i.id === invoiceId);
      receipts.unshift({
        id: `r${Date.now()}`,
        invoiceId,
        invoiceNumber: inv?.number ?? '',
        invoiceAmount: inv?.amount ?? 0,
        orgName: inv?.orgName ?? '',
        method: input.method,
        amount: input.amount,
        reference: input.reference,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        storagePath: null,
        recordedByAdmin: true,
        note: input.note,
      });
      refresh(invoiceId);
      await wait(null);
    },
    async setInvoiceStatus(id, status) {
      const i = invoices.find((x) => x.id === id);
      if (i) {
        i.status = status;
        i.paidAt = status === 'paid' ? i.paidAt ?? new Date().toISOString() : null;
      }
      await wait(null);
    },
    listPlans: () => wait(plans.map((p) => ({ ...p, tiers: p.tiers.map((t) => ({ ...t })) }))),
    async savePlan(p) {
      if (p.id) Object.assign(plans.find((x) => x.id === p.id) ?? {}, p);
      else plans.push({ ...p, id: `plan_${Date.now()}` });
      await wait(null);
    },
    gradingQuality: (days) =>
      wait({
        runs: 412,
        failed: 3,
        escalated: 37,
        costUsd: 9.84,
        answers: 3890,
        lowConfidence: 241,
        edited: 188,
        avgAbsChange: 0.9,
        byModel: [
          { model: 'haiku', runs: 375, costUsd: 4.1 },
          { model: 'opus', runs: 37, costUsd: 5.74 },
        ],
        byDay: Array.from({ length: Math.min(days, 14) }, (_, i) => ({
          day: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
          runs: 20 + ((i * 7) % 15),
          costUsd: 0.5 + ((i * 3) % 5) / 10,
        })),
        bySubject: [
          { subject: 'الرياضيات', answers: 2400, edited: 96 },
          { subject: 'اللغة الإنجليزية', answers: 1490, edited: 92 },
        ],
        usdToIls: 3.7,
        tools: {
          runs: 64,
          costUsd: 1.92,
          inputTokens: 410000,
          outputTokens: 96000,
          byTask: [
            { task: 'generate_questions', runs: 30, costUsd: 1.1 },
            { task: 'extract_exam', runs: 12, costUsd: 0.52 },
            { task: 'assistant', runs: 22, costUsd: 0.3 },
          ],
        },
        byOrg: [
          { orgId: 'o1', name: 'مدرسة النور الخاصة', kind: 'school', papers: 290, pages: 560, escalated: 25, costUsd: 6.9, activeStudents: 180, billed: 4500 },
          { orgId: 'o2', name: 'أ. محمد سالم', kind: 'individual_teacher', papers: 122, pages: 230, escalated: 12, costUsd: 2.94, activeStudents: 55, billed: 275 },
        ],
      }),
  };
}

let api: AdminApi | null = null;
export function adminApi(): AdminApi {
  api ??= supabase ? realApi() : demoApi();
  return api;
}
