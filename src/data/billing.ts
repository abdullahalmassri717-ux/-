// Money: the organization's subscription to دقة (invoices + bank/wallet receipts)
// and the teacher's own student tuition ledger. Prices, currency and payment
// accounts come from platform settings, never from the screens.
import type { SupabaseClient } from '@supabase/supabase-js';
import { MOCK_STUDENTS, PLATFORM_CONFIG } from '../mockData';
import { toInternationalPhone } from '../lib/phone';
import { toTiers, unitPriceFor, type PriceTier, type PricingModel } from './admin';

export interface PlanInfo {
  name: string;
  target: 'teachers' | 'schools' | 'enterprise';
  cycle: 'monthly' | 'yearly';
  /** Pay per registered student, or per graded paper. */
  pricingModel: PricingModel;
  /** Price per unit (student or paper) when no tier applies. */
  pricePerStudent: number;
  tiers: PriceTier[];
  minimumCharge: number;
  installments: number;
}

export type InvoiceStatus = 'issued' | 'pending_confirmation' | 'paid' | 'overdue' | 'void';

export interface InvoiceRow {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  installmentNo: number;
  activeStudents: number;
  pricePerStudent: number;
  amount: number;
  status: InvoiceStatus;
  dueOn: string | null;
  paidAt: string | null;
  pricingModel: PricingModel | null;
  units: number;
  /** Sum of confirmed payments. */
  paidAmount: number;
  notes: string;
  /** Latest receipt the owner uploaded for this invoice. */
  receipt: { status: 'pending' | 'confirmed' | 'rejected'; note: string | null } | null;
}

/** A bank account or e-wallet the platform accepts transfers on (from settings). */
export interface PaymentAccount {
  title: string;
  holder?: string;
  number: string;
  note?: string;
}

export interface BillingSummary {
  currency: { code: string; symbol: string };
  plan: PlanInfo | null;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | null;
  trialEndsOn: string | null;
  activeStudents: number;
  /** What the next invoice would be with today's usage. */
  estimatedDue: number;
  /** Students (or papers since the last invoice) counted for that estimate. */
  estimatedUnits: number;
  invoices: InvoiceRow[];
  paymentAccounts: PaymentAccount[];
  /** A monthly subscription the owner paused (now or from a later day). */
  pause: SubscriptionPause | null;
}

/** Paused days are not billed and no new papers are accepted. endsOn null = until resumed. */
export interface SubscriptionPause {
  startsOn: string;
  endsOn: string | null;
  active: boolean;
}

export interface ReceiptUpload {
  file: Blob;
  fileName: string;
  method: 'bank_transfer' | 'e_wallet';
  amount: number;
  reference: string;
}

export type TuitionStatus = 'paid' | 'partial' | 'unpaid' | 'none';

export interface TuitionRow {
  studentId: string;
  studentName: string;
  groupName: string;
  parentPhone: string;
  chargeId: string | null;
  amountDue: number;
  paidAmount: number;
  status: TuitionStatus;
  lastPaymentOn: string | null;
  lastReceipt: string | null;
}

export interface TuitionPayment {
  id: string;
  studentId: string;
  amount: number;
  paidOn: string;
  method: string;
  receiptNumber: string;
  notes: string;
}

export interface BillingStore {
  getBilling(): Promise<BillingSummary>;
  uploadPaymentReceipt(invoiceId: string, input: ReceiptUpload): Promise<void>;
  /** Pause a monthly subscription (e.g. vacation months). from null = today, until null = until resumed. */
  pauseSubscription(from: string | null, until: string | null): Promise<void>;
  /** Ends the pause today (or cancels one that has not started). */
  resumeSubscription(): Promise<void>;
  /** Every active student with this month's charge (month = 'YYYY-MM-01'). */
  listTuition(month: string): Promise<TuitionRow[]>;
  /** Adds this month's charge for students who have none: last month's amount, else the default. */
  createMonthCharges(month: string, defaultAmount: number): Promise<number>;
  setChargeAmount(studentId: string, month: string, amount: number): Promise<void>;
  recordTuitionPayment(input: { studentId: string; month: string; amount: number; method: string; notes: string }): Promise<TuitionPayment>;
  listTuitionPayments(studentId: string, month: string): Promise<TuitionPayment[]>;
}

export const monthStart = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

const newReceiptNumber = (month: string) =>
  `R${month.slice(2, 4)}${month.slice(5, 7)}-${Math.floor(1000 + Math.random() * 9000)}`;

/** Platform fee for a period from actual usage (no minimum), split into installments for yearly plans. */
export function periodDue(plan: PlanInfo | null, units: number): number {
  if (!plan) return 0;
  const total = units * unitPriceFor(plan.tiers, plan.pricePerStudent, units);
  return Math.round((total / (plan.cycle === 'yearly' ? Math.max(1, plan.installments) : 1)) * 100) / 100;
}

function tuitionStatus(due: number, paid: number, hasCharge: boolean): TuitionStatus {
  if (!hasCharge) return 'none';
  if (paid >= due) return 'paid';
  return paid > 0 ? 'partial' : 'unpaid';
}

class BillingError extends Error {}

function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const msg = error?.message ?? '';
  if (msg.toLowerCase().includes('failed to fetch')) throw new BillingError('تعذّر الاتصال بالإنترنت. حاول مرة أخرى.');
  if (error?.code === '42501') throw new BillingError('ليس لديك صلاحية لهذا الإجراء.');
  if (/[؀-ۿ]/.test(msg)) throw new BillingError(msg);
  throw new BillingError(fallback);
}

function toPause(d: unknown): SubscriptionPause | null {
  const p = d as { starts_on?: string; ends_on?: string | null; active?: boolean } | null;
  return p?.starts_on ? { startsOn: p.starts_on, endsOn: p.ends_on ?? null, active: !!p.active } : null;
}

function localPhone(p: string | null): string {
  if (!p) return '';
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

// ---------------------------------------------------------------------------
// Real (Supabase)
// ---------------------------------------------------------------------------
export function createSupabaseBilling(db: SupabaseClient, orgId: string): BillingStore {
  type ChargeDb = { id: string; student_id: string; amount_due: number };
  type PaymentDb = { id: string; student_id: string; charge_id: string | null; amount: number; paid_on: string; method: string | null; receipt_number: string | null; notes: string | null };
  const toPayment = (p: PaymentDb): TuitionPayment => ({
    id: p.id,
    studentId: p.student_id,
    amount: Number(p.amount),
    paidOn: p.paid_on,
    method: p.method ?? '',
    receiptNumber: p.receipt_number ?? '',
    notes: p.notes ?? '',
  });

  async function chargeFor(studentId: string, month: string): Promise<ChargeDb | null> {
    const { data, error } = await db
      .from('tuition_charges')
      .select('id, student_id, amount_due')
      .eq('student_id', studentId)
      .eq('period_month', month)
      .maybeSingle();
    if (error) fail(error, 'تعذّر تحميل الرسوم.');
    return data as ChargeDb | null;
  }

  return {
    async getBilling() {
      const [settings, sub, invoices, students, quote, pauseRes] = await Promise.all([
        db.from('platform_settings').select('key, value').in('key', ['currency', 'payment_accounts']),
        db
          .from('subscriptions')
          .select('status, trial_ends_on, price_per_student, subscription_plans(*)')
          .eq('organization_id', orgId)
          .in('status', ['trial', 'active', 'past_due'])
          .maybeSingle(),
        db
          .from('invoices')
          .select('*, payment_receipts(status, review_note, created_at, amount)')
          .eq('organization_id', orgId)
          .order('period_start', { ascending: false }),
        db.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
        db.rpc('my_usage_quote', { p_org: orgId }),
        db.rpc('my_subscription_pause', { p_org: orgId }),
      ]);
      if (invoices.error) fail(invoices.error, 'تعذّر تحميل الفواتير.');
      if (sub.error) fail(sub.error, 'تعذّر تحميل الاشتراك.');
      const setting = (key: string) => (settings.data ?? []).find((s) => s.key === key)?.value;
      const cur = setting('currency') as { code?: string; symbol?: string } | undefined;
      const accounts = setting('payment_accounts') as { accounts?: PaymentAccount[] } | undefined;

      type PlanDb = {
        name: string; target: PlanInfo['target']; billing_cycle: PlanInfo['cycle']; price_per_student: number; minimum_charge: number; installments: number;
        pricing_model?: PricingModel; tiers?: unknown;
      };
      const s = sub.data as { status: BillingSummary['subscriptionStatus']; trial_ends_on: string | null; price_per_student: number; subscription_plans: PlanDb | PlanDb[] | null } | null;
      const p = s ? (Array.isArray(s.subscription_plans) ? s.subscription_plans[0] : s.subscription_plans) : null;
      const plan: PlanInfo | null = p
        ? {
            name: p.name,
            target: p.target,
            cycle: p.billing_cycle,
            pricingModel: p.pricing_model ?? 'per_student',
            tiers: toTiers(p.tiers),
            // The price agreed when subscribing wins over today's list price.
            pricePerStudent: Number(s?.price_per_student ?? p.price_per_student),
            minimumCharge: Number(p.minimum_charge),
            installments: p.installments,
          }
        : null;
      const activeStudents = students.count ?? 0;
      const q = (quote.error ? null : quote.data) as { units?: number; amount?: number } | null;

      type InvDb = {
        id: string; number: string; period_start: string; period_end: string; installment_no: number; active_students: number;
        price_per_student: number; amount: number; status: InvoiceStatus; due_on: string | null; paid_at: string | null;
        pricing_model?: PricingModel | null; units?: number | null; notes?: string | null;
        payment_receipts: { status: 'pending' | 'confirmed' | 'rejected'; review_note: string | null; created_at: string; amount: number }[];
      };
      return {
        currency: { code: cur?.code ?? PLATFORM_CONFIG.currencyCode, symbol: cur?.symbol ?? PLATFORM_CONFIG.currencySymbol },
        plan,
        subscriptionStatus: s?.status ?? null,
        trialEndsOn: s?.trial_ends_on ?? null,
        activeStudents,
        estimatedDue: q?.amount !== undefined ? Number(q.amount) : periodDue(plan, activeStudents),
        estimatedUnits: q?.units !== undefined ? Number(q.units) : activeStudents,
        paymentAccounts: accounts?.accounts ?? [],
        pause: toPause(pauseRes.error ? null : pauseRes.data),
        invoices: ((invoices.data ?? []) as InvDb[]).map((i) => {
          const latest = [...(i.payment_receipts ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return {
            id: i.id,
            number: i.number,
            periodStart: i.period_start,
            periodEnd: i.period_end,
            installmentNo: i.installment_no,
            activeStudents: i.active_students,
            pricePerStudent: Number(i.price_per_student),
            amount: Number(i.amount),
            status: i.status,
            dueOn: i.due_on,
            paidAt: i.paid_at,
            pricingModel: i.pricing_model ?? (i.active_students ? 'per_student' : null),
            units: i.units ?? i.active_students,
            paidAmount: (i.payment_receipts ?? []).filter((r) => r.status === 'confirmed').reduce((n, r) => n + Number(r.amount ?? 0), 0),
            notes: i.notes ?? '',
            receipt: latest ? { status: latest.status, note: latest.review_note } : null,
          };
        }),
      };
    },

    async pauseSubscription(from, until) {
      const { error } = await db.rpc('pause_subscription', { p_org: orgId, p_from: from, p_until: until });
      if (error) fail(error, 'تعذّر إيقاف الاشتراك.');
    },

    async resumeSubscription() {
      const { error } = await db.rpc('resume_subscription', { p_org: orgId });
      if (error) fail(error, 'تعذّر إرجاع الاشتراك.');
    },

    async uploadPaymentReceipt(invoiceId, input) {
      const ext = (input.fileName.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${orgId}/${invoiceId}/${Date.now()}.${ext}`;
      const up = await db.storage.from('payment-receipts').upload(path, input.file, { contentType: input.file.type || undefined });
      if (up.error) fail(up.error, 'تعذّر رفع صورة الإيصال.');
      const { error } = await db.from('payment_receipts').insert({
        invoice_id: invoiceId,
        organization_id: orgId,
        method: input.method,
        amount: input.amount,
        reference: input.reference.trim() || null,
        storage_path: path,
      });
      if (error) fail(error, 'تعذّر حفظ الإيصال.');
    },

    async listTuition(month) {
      type StDb = { id: string; full_name: string; parent_phone: string | null; group_students: { left_at: string | null; groups: { name: string; archived_at: string | null } | null }[] };
      const [students, balances] = await Promise.all([
        db
          .from('students')
          .select('id, full_name, parent_phone, group_students(left_at, groups(name, archived_at))')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .order('full_name'),
        db
          .from('tuition_balances')
          .select('charge_id, student_id, amount_due, paid_amount, last_payment_on')
          .eq('organization_id', orgId)
          .eq('period_month', month),
      ]);
      if (students.error) fail(students.error, 'تعذّر تحميل الطلاب.');
      if (balances.error) fail(balances.error, 'تعذّر تحميل الرسوم.');
      const chargeIds = (balances.data ?? []).map((b) => b.charge_id as string);
      const payments = chargeIds.length
        ? await db.from('tuition_payments').select('charge_id, receipt_number, created_at').in('charge_id', chargeIds).order('created_at', { ascending: false })
        : { data: [], error: null };
      if (payments.error) fail(payments.error, 'تعذّر تحميل الدفعات.');
      const lastReceipt = new Map<string, string>();
      for (const p of payments.data ?? []) if (p.receipt_number && !lastReceipt.has(p.charge_id)) lastReceipt.set(p.charge_id, p.receipt_number);
      const byStudent = new Map((balances.data ?? []).map((b) => [b.student_id as string, b]));
      return ((students.data ?? []) as unknown as StDb[]).map((s) => {
        const b = byStudent.get(s.id);
        const g = s.group_students?.find((m) => !m.left_at && m.groups && !m.groups.archived_at)?.groups;
        const due = Number(b?.amount_due ?? 0);
        const paid = Number(b?.paid_amount ?? 0);
        return {
          studentId: s.id,
          studentName: s.full_name,
          groupName: g?.name ?? '',
          parentPhone: localPhone(s.parent_phone),
          chargeId: (b?.charge_id as string) ?? null,
          amountDue: due,
          paidAmount: paid,
          status: tuitionStatus(due, paid, !!b),
          lastPaymentOn: (b?.last_payment_on as string) ?? null,
          lastReceipt: b ? lastReceipt.get(b.charge_id as string) ?? null : null,
        };
      });
    },

    async createMonthCharges(month, defaultAmount) {
      const [students, current, previous] = await Promise.all([
        db.from('students').select('id').eq('organization_id', orgId).eq('status', 'active'),
        db.from('tuition_charges').select('student_id').eq('organization_id', orgId).eq('period_month', month),
        db
          .from('tuition_charges')
          .select('student_id, amount_due, period_month')
          .eq('organization_id', orgId)
          .lt('period_month', month)
          .order('period_month', { ascending: false })
          .limit(5000),
      ]);
      if (students.error || current.error || previous.error) fail(students.error ?? current.error ?? previous.error, 'تعذّر تجهيز رسوم الشهر.');
      const has = new Set((current.data ?? []).map((c) => c.student_id));
      const last = new Map<string, number>();
      for (const c of previous.data ?? []) if (!last.has(c.student_id)) last.set(c.student_id, Number(c.amount_due));
      const rows = (students.data ?? [])
        .filter((s) => !has.has(s.id))
        .map((s) => ({ organization_id: orgId, student_id: s.id, period_month: month, amount_due: last.get(s.id) ?? defaultAmount }));
      if (!rows.length) return 0;
      const { error } = await db.from('tuition_charges').upsert(rows, { onConflict: 'student_id,period_month', ignoreDuplicates: true });
      if (error) fail(error, 'تعذّر تجهيز رسوم الشهر.');
      return rows.length;
    },

    async setChargeAmount(studentId, month, amount) {
      const existing = await chargeFor(studentId, month);
      const { error } = existing
        ? await db.from('tuition_charges').update({ amount_due: amount }).eq('id', existing.id)
        : await db.from('tuition_charges').insert({ organization_id: orgId, student_id: studentId, period_month: month, amount_due: amount });
      if (error) fail(error, 'تعذّر حفظ الرسم.');
    },

    async recordTuitionPayment({ studentId, month, amount, method, notes }) {
      let charge = await chargeFor(studentId, month);
      if (!charge) {
        // No charge yet for this month: the payment itself sets what is due.
        const { data, error } = await db
          .from('tuition_charges')
          .insert({ organization_id: orgId, student_id: studentId, period_month: month, amount_due: amount })
          .select('id, student_id, amount_due')
          .single();
        if (error) fail(error, 'تعذّر تسجيل الدفعة.');
        charge = data as ChargeDb;
      }
      const { data, error } = await db
        .from('tuition_payments')
        .insert({
          organization_id: orgId,
          student_id: studentId,
          charge_id: charge.id,
          amount,
          method: method || null,
          notes: notes.trim() || null,
          receipt_number: newReceiptNumber(month),
        })
        .select('id, student_id, charge_id, amount, paid_on, method, receipt_number, notes')
        .single();
      if (error) fail(error, 'تعذّر تسجيل الدفعة.');
      return toPayment(data as PaymentDb);
    },

    async listTuitionPayments(studentId, month) {
      const charge = await chargeFor(studentId, month);
      if (!charge) return [];
      const { data, error } = await db
        .from('tuition_payments')
        .select('id, student_id, charge_id, amount, paid_on, method, receipt_number, notes')
        .eq('charge_id', charge.id)
        .order('created_at', { ascending: false });
      if (error) fail(error, 'تعذّر تحميل الدفعات.');
      return ((data ?? []) as PaymentDb[]).map(toPayment);
    },
  };
}

// ---------------------------------------------------------------------------
// Demo (in memory)
// ---------------------------------------------------------------------------
export function createDemoBilling(): BillingStore {
  const month0 = monthStart();
  const plan: PlanInfo = {
    name: 'باقة المدرّس',
    target: 'teachers',
    cycle: 'monthly',
    pricingModel: 'per_student',
    pricePerStudent: PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent,
    tiers: [],
    minimumCharge: 0,
    installments: 1,
  };
  const charges = new Map<string, number>(); // `${studentId}|${month}` -> amount
  const payments: (TuitionPayment & { month: string })[] = [];
  MOCK_STUDENTS.forEach((s, i) => {
    charges.set(`${s.id}|${month0}`, 150);
    const paid = i % 4 === 0 ? 0 : i % 4 === 1 ? 75 : 150;
    if (paid)
      payments.push({ id: `tp${i}`, studentId: s.id, amount: paid, paidOn: month0, method: 'نقداً', receiptNumber: newReceiptNumber(month0), notes: '', month: month0 });
  });
  const invoices: InvoiceRow[] = [1, 2, 3].map((back) => {
    const d = new Date();
    d.setMonth(d.getMonth() - back);
    const start = monthStart(d);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const n = MOCK_STUDENTS.length;
    return {
      id: `inv${back}`,
      number: `INV-${start.slice(0, 7)}`,
      periodStart: start,
      periodEnd: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
      installmentNo: 1,
      activeStudents: n,
      pricePerStudent: plan.pricePerStudent,
      amount: periodDue(plan, n),
      status: back === 1 ? 'issued' : 'paid',
      dueOn: start,
      paidAt: back === 1 ? null : start,
      pricingModel: 'per_student',
      units: n,
      paidAmount: back === 1 ? 0 : periodDue(plan, n),
      notes: '',
      receipt: back === 1 ? null : { status: 'confirmed', note: null },
    };
  });
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
  let pause: SubscriptionPause | null = null;
  const today = () => new Date().toISOString().slice(0, 10);

  return {
    async getBilling() {
      return wait({
        currency: { code: PLATFORM_CONFIG.currencyCode, symbol: PLATFORM_CONFIG.currencySymbol },
        plan,
        subscriptionStatus: 'active',
        trialEndsOn: null,
        activeStudents: MOCK_STUDENTS.length,
        estimatedDue: pause?.active ? 0 : periodDue(plan, MOCK_STUDENTS.length),
        estimatedUnits: MOCK_STUDENTS.length,
        invoices: invoices.map((i) => ({ ...i })),
        paymentAccounts: [
          { title: 'حساب بنكي (تجريبي)', holder: 'يُضاف من إعدادات المنصة', number: '—' },
          { title: 'محفظة إلكترونية (تجريبي)', number: '—', note: 'اكتب اسمك في ملاحظة التحويل.' },
        ],
        pause: pause ? { ...pause } : null,
      });
    },
    async pauseSubscription(from, until) {
      const start = from || today();
      if (start < today()) throw new Error('تاريخ بداية الإيقاف لا يمكن أن يكون في الماضي');
      if (until && until < start) throw new Error('تاريخ الرجوع يجب أن يكون بعد تاريخ الإيقاف');
      pause = { startsOn: start, endsOn: until, active: start <= today() };
      await wait(null);
    },
    async resumeSubscription() {
      pause = null;
      await wait(null);
    },
    async uploadPaymentReceipt(invoiceId) {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        inv.status = 'pending_confirmation';
        inv.receipt = { status: 'pending', note: null };
      }
      await wait(null);
    },
    async listTuition(month) {
      return wait(
        MOCK_STUDENTS.map((s) => {
          const due = charges.get(`${s.id}|${month}`);
          const mine = payments.filter((p) => p.studentId === s.id && p.month === month);
          const paid = mine.reduce((n, p) => n + p.amount, 0);
          return {
            studentId: s.id,
            studentName: s.name,
            groupName: s.group,
            parentPhone: s.parentPhone,
            chargeId: due === undefined ? null : `${s.id}|${month}`,
            amountDue: due ?? 0,
            paidAmount: paid,
            status: tuitionStatus(due ?? 0, paid, due !== undefined),
            lastPaymentOn: mine.at(-1)?.paidOn ?? null,
            lastReceipt: mine.at(-1)?.receiptNumber ?? null,
          };
        }),
      );
    },
    async createMonthCharges(month, defaultAmount) {
      let n = 0;
      for (const s of MOCK_STUDENTS)
        if (!charges.has(`${s.id}|${month}`)) {
          charges.set(`${s.id}|${month}`, charges.get(`${s.id}|${month0}`) ?? defaultAmount);
          n++;
        }
      return wait(n);
    },
    async setChargeAmount(studentId, month, amount) {
      charges.set(`${studentId}|${month}`, amount);
      await wait(null);
    },
    async recordTuitionPayment({ studentId, month, amount, method, notes }) {
      if (!charges.has(`${studentId}|${month}`)) charges.set(`${studentId}|${month}`, amount);
      const p = { id: `tp${Date.now()}`, studentId, amount, paidOn: new Date().toISOString().slice(0, 10), method, receiptNumber: newReceiptNumber(month), notes, month };
      payments.push(p);
      return wait(p);
    },
    async listTuitionPayments(studentId, month) {
      return wait(payments.filter((p) => p.studentId === studentId && p.month === month).reverse());
    },
  };
}

/** wa.me link with a ready message, or null when the number is missing/invalid. */
export function whatsappLink(phone: string, text: string): string | null {
  const intl = phone ? toInternationalPhone(phone) : null;
  return intl ? `https://wa.me/${intl.slice(1)}?text=${encodeURIComponent(text)}` : null;
}
