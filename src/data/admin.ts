// Platform admin: organizations, payments to confirm, invoices, plans and
// grading quality. Every call is checked again by the database (admin only).
import { supabase } from '../lib/supabase';
import { MOCK_PLATFORM_CLIENTS, MOCK_SUBSCRIPTION_PLANS } from '../mockData';

export interface AdminOrg {
  id: string;
  name: string;
  kind: 'individual_teacher' | 'school' | 'learning_center';
  region: string;
  createdAt: string;
  ownerName: string;
  ownerPhone: string;
  activeStudents: number;
  teachers: number;
  planName: string;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | null;
  trialEndsOn: string | null;
  papers30d: number;
  gradingCost30d: number;
  unpaidAmount: number;
}

export interface AdminReceipt {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  orgName: string;
  method: 'bank_transfer' | 'e_wallet';
  amount: number;
  reference: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  storagePath: string | null;
}

export interface AdminInvoice {
  id: string;
  number: string;
  orgName: string;
  periodStart: string;
  amount: number;
  status: 'issued' | 'pending_confirmation' | 'paid' | 'overdue' | 'void';
  dueOn: string | null;
  paidAt: string | null;
}

export interface AdminPlan {
  id: string;
  slug: string | null;
  name: string;
  target: 'teachers' | 'schools' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  pricePerStudent: number;
  minimumCharge: number;
  installments: number;
  features: string[];
  isActive: boolean;
  isPublic: boolean;
  isPopular: boolean;
  notes: string;
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
}

export interface AdminApi {
  listOrganizations(): Promise<AdminOrg[]>;
  listReceipts(status?: 'pending' | 'all'): Promise<AdminReceipt[]>;
  receiptUrl(path: string): Promise<string | null>;
  reviewReceipt(id: string, status: 'confirmed' | 'rejected', note: string): Promise<void>;
  listInvoices(): Promise<AdminInvoice[]>;
  issueInvoice(orgId: string): Promise<void>;
  setInvoiceStatus(id: string, status: 'void' | 'overdue' | 'issued'): Promise<void>;
  listPlans(): Promise<AdminPlan[]>;
  savePlan(plan: Omit<AdminPlan, 'id'> & { id?: string }): Promise<void>;
  gradingQuality(days: number): Promise<GradingQuality>;
}

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

function realApi(): AdminApi {
  const db = supabase!;
  return {
    async listOrganizations() {
      const { data, error } = await db.rpc('admin_organizations');
      if (error) fail(error, 'تعذّر تحميل الجهات.');
      type Row = {
        id: string; name: string; kind: AdminOrg['kind']; region: string | null; created_at: string; owner_name: string | null; owner_phone: string | null;
        active_students: number; teachers: number; plan_name: string | null; subscription_status: AdminOrg['subscriptionStatus']; trial_ends_on: string | null;
        papers_30d: number; grading_cost_30d: number; unpaid_amount: number;
      };
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        region: r.region ?? '',
        createdAt: r.created_at,
        ownerName: r.owner_name ?? '',
        ownerPhone: localPhone(r.owner_phone),
        activeStudents: r.active_students,
        teachers: r.teachers,
        planName: r.plan_name ?? '',
        subscriptionStatus: r.subscription_status,
        trialEndsOn: r.trial_ends_on,
        papers30d: r.papers_30d,
        gradingCost30d: Number(r.grading_cost_30d),
        unpaidAmount: Number(r.unpaid_amount),
      }));
    },
    async listReceipts(status = 'pending') {
      let q = db
        .from('payment_receipts')
        .select('id, invoice_id, method, amount, reference, status, created_at, storage_path, invoices(number, amount), organizations(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (status === 'pending') q = q.eq('status', 'pending');
      const { data, error } = await q;
      if (error) fail(error, 'تعذّر تحميل الإيصالات.');
      type Row = {
        id: string; invoice_id: string; method: AdminReceipt['method']; amount: number; reference: string | null; status: AdminReceipt['status'];
        created_at: string; storage_path: string | null; invoices: { number: string; amount: number } | null; organizations: { name: string } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
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
      }));
    },
    async receiptUrl(path) {
      const { data } = await db.storage.from('payment-receipts').createSignedUrl(path, 600);
      return data?.signedUrl ?? null;
    },
    async reviewReceipt(id, status, note) {
      const { error } = await db.from('payment_receipts').update({ status, review_note: note.trim() || null }).eq('id', id);
      if (error) fail(error, 'تعذّر حفظ المراجعة.');
    },
    async listInvoices() {
      const { data, error } = await db
        .from('invoices')
        .select('id, number, period_start, amount, status, due_on, paid_at, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) fail(error, 'تعذّر تحميل الفواتير.');
      type Row = { id: string; number: string; period_start: string; amount: number; status: AdminInvoice['status']; due_on: string | null; paid_at: string | null; organizations: { name: string } | null };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        number: r.number,
        orgName: one(r.organizations)?.name ?? '',
        periodStart: r.period_start,
        amount: Number(r.amount),
        status: r.status,
        dueOn: r.due_on,
        paidAt: r.paid_at,
      }));
    },
    async issueInvoice(orgId) {
      const { error } = await db.rpc('admin_issue_invoice', { p_org: orgId });
      if (error) fail(error, 'تعذّر إصدار الفاتورة.');
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
        minimum_charge: number; installments: number; features: string[]; is_active: boolean; is_public: boolean; is_popular: boolean; notes: string | null;
      };
      return ((data ?? []) as Row[]).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        target: p.target,
        billingCycle: p.billing_cycle,
        pricePerStudent: Number(p.price_per_student),
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
        price_per_student: p.pricePerStudent,
        minimum_charge: p.minimumCharge,
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
      const { data, error } = await db.rpc('admin_grading_quality', { p_days: days });
      if (error) fail(error, 'تعذّر تحميل بيانات الجودة.');
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
      };
    },
  };
}

function demoApi(): AdminApi {
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
  const orgs: AdminOrg[] = MOCK_PLATFORM_CLIENTS.map((c, i) => ({
    id: c.id,
    name: c.name,
    kind: c.type === 'school' ? 'school' : 'individual_teacher',
    region: 'غزة',
    createdAt: new Date(Date.now() - (i + 1) * 20 * 86400000).toISOString(),
    ownerName: c.name,
    ownerPhone: '',
    activeStudents: c.studentsCount,
    teachers: c.type === 'school' ? 8 : 0,
    planName: c.plan,
    subscriptionStatus: c.paymentStatus === 'overdue' ? 'past_due' : 'active',
    trialEndsOn: null,
    papers30d: c.studentsCount * 3,
    gradingCost30d: c.studentsCount * 0.02,
    unpaidAmount: c.paymentStatus === 'paid' ? 0 : c.amount,
  }));
  const invoices: AdminInvoice[] = MOCK_PLATFORM_CLIENTS.map((c, i) => ({
    id: `inv_${c.id}`,
    number: `INV-DEMO-${i + 1}`,
    orgName: c.name,
    periodStart: new Date().toISOString().slice(0, 10),
    amount: c.amount,
    status: c.paymentStatus === 'paid' ? 'paid' : c.paymentStatus === 'overdue' ? 'overdue' : 'pending_confirmation',
    dueOn: null,
    paidAt: null,
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
    }));
  const plans: AdminPlan[] = MOCK_SUBSCRIPTION_PLANS.map((p) => ({
    id: p.id,
    slug: null,
    name: p.name,
    target: p.target,
    billingCycle: p.billingCycle,
    pricePerStudent: p.pricePerStudent,
    minimumCharge: 0,
    installments: 1,
    features: p.features,
    isActive: p.isActive,
    isPublic: true,
    isPopular: !!p.isPopular,
    notes: p.notes ?? '',
  }));
  return {
    listOrganizations: () => wait(orgs.map((o) => ({ ...o }))),
    listReceipts: (status = 'pending') => wait(receipts.filter((r) => status === 'all' || r.status === 'pending').map((r) => ({ ...r }))),
    receiptUrl: () => wait(null),
    async reviewReceipt(id, status) {
      const r = receipts.find((x) => x.id === id);
      if (r) {
        r.status = status;
        const inv = invoices.find((i) => i.id === r.invoiceId);
        if (inv) inv.status = status === 'confirmed' ? 'paid' : 'issued';
      }
      await wait(null);
    },
    listInvoices: () => wait(invoices.map((i) => ({ ...i }))),
    async issueInvoice(orgId) {
      const o = orgs.find((x) => x.id === orgId);
      invoices.unshift({
        id: `inv_${Date.now()}`,
        number: `INV-DEMO-${invoices.length + 1}`,
        orgName: o?.name ?? '',
        periodStart: new Date().toISOString().slice(0, 10),
        amount: (o?.activeStudents ?? 0) * 5,
        status: 'issued',
        dueOn: null,
        paidAt: null,
      });
      await wait(null);
    },
    async setInvoiceStatus(id, status) {
      const i = invoices.find((x) => x.id === id);
      if (i) i.status = status;
      await wait(null);
    },
    listPlans: () => wait(plans.map((p) => ({ ...p }))),
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
      }),
  };
}

let api: AdminApi | null = null;
export function adminApi(): AdminApi {
  api ??= supabase ? realApi() : demoApi();
  return api;
}
