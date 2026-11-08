import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId, SupportTicket } from '../../types';
import { adminApi, type AdminPlan, type AdminReceipt } from '../../data/admin';
import { supportApi } from '../../data/support';
import { getPublicSetting, savePlatformSetting } from '../../lib/settings';
import { PLATFORM_CONFIG } from '../../mockData';
import type { PaymentAccount } from '../../data/billing';
import {
  ShieldCheck,
  Building2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  BarChart3,
  Plus,
  Edit,
  Headphones,
  Send,
  LayoutTemplate,
  Loader2,
  Settings,
  Trash2,
  FileText,
} from 'lucide-react';
import { LandingPageCMS } from './LandingPageCMS';
import { notify } from '../../lib/notify';

type Tab = 'overview' | 'financials' | 'analytics' | 'plans' | 'clients' | 'support' | 'landing' | 'settings';

const api = adminApi();
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });
const dateLabel = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};
const errText = (e: unknown, fallback: string) => (e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : fallback);

/** Small loader hook for admin data (not tied to an organization). */
function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    fn()
      .then((v) => alive && setData(v))
      .catch((e) => alive && setError(errText(e, 'تعذّر تحميل البيانات.')));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return { data, error, loading: data === null && !error, reload: () => setTick((t) => t + 1) };
}

const Spinner = () => (
  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
  </div>
);
const ErrorBox: React.FC<{ text: string }> = ({ text }) => <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{text}</div>;
const Card: React.FC<{ title: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }> = ({ title, value, hint, tone = 'text-[#1E3A5F]' }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
    <span className="text-xs text-slate-500 font-bold">{title}</span>
    <div className={`text-2xl font-black font-mono tabular-nums ${tone}`}>{value}</div>
    {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
  </div>
);

const KIND_LABEL = { individual_teacher: 'مدرّس', school: 'مدرسة', learning_center: 'مركز' } as const;
const SUB_LABEL: Record<string, string> = { trial: 'تجريبي', active: 'نشط', past_due: 'متأخر' };
const INVOICE_LABEL: Record<string, { t: string; c: string }> = {
  issued: { t: 'بانتظار الدفع', c: 'bg-amber-100 text-amber-800' },
  overdue: { t: 'متأخرة', c: 'bg-rose-100 text-rose-800' },
  pending_confirmation: { t: 'إيصال بانتظار التأكيد', c: 'bg-blue-100 text-blue-800' },
  paid: { t: 'مدفوعة', c: 'bg-emerald-100 text-emerald-800' },
  void: { t: 'ملغاة', c: 'bg-slate-100 text-slate-500' },
};

export const PlatformAdminDashboard: React.FC<{
  onNavigate: (screen: ScreenId) => void;
  initialTab?: Tab;
}> = ({ onNavigate, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: ShieldCheck },
    { id: 'financials', label: 'المدفوعات والفواتير', icon: DollarSign },
    { id: 'clients', label: 'الجهات', icon: Building2 },
    { id: 'plans', label: 'الباقات والأسعار', icon: Sliders },
    { id: 'analytics', label: 'جودة وتكلفة التصحيح', icon: BarChart3 },
    { id: 'support', label: 'الدعم الفني', icon: Headphones },
    { id: 'landing', label: 'الصفحة التعريفية', icon: LayoutTemplate },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span>لوحة مدير المنصة</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">الجهات، المدفوعات، الباقات، جودة التصحيح والدعم الفني.</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const on = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                on ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${on ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab go={setActiveTab} />}
      {activeTab === 'financials' && <FinancialsTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'analytics' && <QualityTab />}
      {activeTab === 'support' && <SupportTab />}
      {activeTab === 'landing' && <LandingPageCMS onNavigate={onNavigate} />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
};

// ---------------------------------------------------------------- Overview
const OverviewTab: React.FC<{ go: (t: Tab) => void }> = ({ go }) => {
  const orgs = useAsync(() => api.listOrganizations());
  const receipts = useAsync(() => api.listReceipts('pending'));
  if (orgs.error) return <ErrorBox text={orgs.error} />;
  if (!orgs.data) return <Spinner />;
  const list = orgs.data;
  const tutors = list.filter((o) => o.kind === 'individual_teacher');
  const schools = list.filter((o) => o.kind !== 'individual_teacher');
  const students = list.reduce((n, o) => n + o.activeStudents, 0);
  const cost = list.reduce((n, o) => n + o.gradingCost30d, 0);
  const papers = list.reduce((n, o) => n + o.papers30d, 0);
  const unpaid = list.reduce((n, o) => n + o.unpaidAmount, 0);
  const trials = list.filter((o) => o.subscriptionStatus === 'trial');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="المدرّسون" value={tutors.length} hint={`${trials.length} في الفترة التجريبية`} />
        <Card title="المدارس والمراكز" value={schools.length} />
        <Card title="الطلاب النشطون" value={fmt(students)} />
        <Card title="أوراق آخر 30 يوماً" value={fmt(papers)} hint={`تكلفة التصحيح: $${fmt(cost, 2)}`} />
        <Card title="مبالغ غير مسددة" value={`${fmt(unpaid)} ${PLATFORM_CONFIG.currencySymbol}`} tone="text-amber-700" />
        <Card
          title="إيصالات بانتظار التأكيد"
          value={receipts.data?.length ?? '…'}
          tone={receipts.data?.length ? 'text-blue-700' : 'text-[#1E3A5F]'}
          hint={
            receipts.data?.length ? (
              <button onClick={() => go('financials')} className="text-blue-700 font-bold hover:underline">
                راجعها الآن ←
              </button>
            ) : undefined
          }
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">أحدث الجهات المسجّلة</h3>
          <button onClick={() => go('clients')} className="text-xs text-blue-700 font-bold hover:underline">
            كل الجهات ←
          </button>
        </div>
        {!list.length ? (
          <p className="text-xs text-slate-500">لا توجد جهات بعد.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {list.slice(0, 6).map((o) => (
              <div key={o.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block text-slate-900 truncate">{o.name}</strong>
                  <span className="text-[11px] text-slate-500">
                    {KIND_LABEL[o.kind]} · {o.activeStudents} طالب · {dateLabel(o.createdAt)}
                  </span>
                </div>
                <span className="text-[11px] font-bold shrink-0 text-slate-600">{o.subscriptionStatus ? SUB_LABEL[o.subscriptionStatus] : 'بلا اشتراك'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Financials
const FinancialsTab: React.FC = () => {
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const receipts = useAsync(() => api.listReceipts(scope), [scope]);
  const invoices = useAsync(() => api.listInvoices());
  const [review, setReview] = useState<{ r: AdminReceipt; url: string | null; note: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async (r: AdminReceipt) => {
    const url = r.storagePath ? await api.receiptUrl(r.storagePath) : null;
    setReview({ r, url, note: '' });
  };
  const decide = async (status: 'confirmed' | 'rejected') => {
    if (!review) return;
    if (status === 'rejected' && !review.note.trim()) return notify('اكتب سبب الرفض ليراه صاحب الحساب.');
    setBusy(true);
    try {
      await api.reviewReceipt(review.r.id, status, review.note);
      setReview(null);
      receipts.reload();
      invoices.reload();
      notify(status === 'confirmed' ? 'تم تأكيد الدفع، والفاتورة الآن مدفوعة.' : 'تم رفض الإيصال.');
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">إيصالات التحويل</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['pending', 'all'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`px-3 py-1 rounded-lg font-bold ${scope === s ? 'bg-white shadow-2xs' : 'text-slate-600'}`}>
                {s === 'pending' ? 'بانتظار التأكيد' : 'الكل'}
              </button>
            ))}
          </div>
        </div>
        {receipts.error ? (
          <ErrorBox text={receipts.error} />
        ) : !receipts.data ? (
          <Spinner />
        ) : !receipts.data.length ? (
          <p className="text-xs text-slate-500">لا توجد إيصالات {scope === 'pending' ? 'بانتظار التأكيد' : ''}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[640px]">
              <thead className="bg-[#F7F8FA] text-slate-700 font-bold">
                <tr>
                  <th className="p-3">الجهة</th>
                  <th className="p-3">الفاتورة</th>
                  <th className="p-3 text-center">المبلغ المحوّل</th>
                  <th className="p-3">الطريقة / المرجع</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.data.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-slate-900">{r.orgName}</td>
                    <td className="p-3 font-mono">
                      {r.invoiceNumber}
                      <span className="block text-[10px] text-slate-500">
                        {fmt(r.invoiceAmount, 2)} {PLATFORM_CONFIG.currencySymbol}
                      </span>
                    </td>
                    <td className={`p-3 text-center font-mono font-bold ${r.amount < r.invoiceAmount ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {fmt(r.amount, 2)} {PLATFORM_CONFIG.currencySymbol}
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.method === 'bank_transfer' ? 'حوالة بنكية' : 'محفظة'}
                      {r.reference && <span className="block font-mono text-[10px]">{r.reference}</span>}
                    </td>
                    <td className="p-3 text-center">
                      {r.status === 'pending' ? 'بانتظار التأكيد' : r.status === 'confirmed' ? 'مؤكد' : 'مرفوض'}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => open(r)} className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {r.status === 'pending' ? 'مراجعة' : 'عرض'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-[#1E3A5F] text-sm">الفواتير</h3>
        {invoices.error ? (
          <ErrorBox text={invoices.error} />
        ) : !invoices.data ? (
          <Spinner />
        ) : !invoices.data.length ? (
          <p className="text-xs text-slate-500">لا توجد فواتير. أصدرها من تبويب «الجهات».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[640px]">
              <thead className="bg-[#F7F8FA] text-slate-700 font-bold">
                <tr>
                  <th className="p-3">الرقم</th>
                  <th className="p-3">الجهة</th>
                  <th className="p-3">من</th>
                  <th className="p-3 text-center">المبلغ</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.data.map((i) => (
                  <tr key={i.id}>
                    <td className="p-3 font-mono font-bold">{i.number}</td>
                    <td className="p-3">{i.orgName}</td>
                    <td className="p-3">{dateLabel(i.periodStart)}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      {fmt(i.amount, 2)} {PLATFORM_CONFIG.currencySymbol}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${INVOICE_LABEL[i.status].c}`}>{INVOICE_LABEL[i.status].t}</span>
                    </td>
                    <td className="p-3 text-center">
                      {(i.status === 'issued' || i.status === 'overdue') && (
                        <div className="flex justify-center gap-3">
                          {i.status === 'issued' && (
                            <button
                              onClick={() => api.setInvoiceStatus(i.id, 'overdue').then(invoices.reload, (e) => notify(errText(e, 'تعذّر الحفظ.')))}
                              className="text-amber-700 font-bold hover:underline"
                            >
                              متأخرة
                            </button>
                          )}
                          <button
                            onClick={() => api.setInvoiceStatus(i.id, 'void').then(invoices.reload, (e) => notify(errText(e, 'تعذّر الحفظ.')))}
                            className="text-slate-500 font-bold hover:underline"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {review && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F]">
              إيصال {review.r.orgName} · {review.r.invoiceNumber}
            </h3>
            {review.url ? (
              review.r.storagePath?.endsWith('.pdf') ? (
                <a href={review.url} target="_blank" rel="noreferrer" className="text-blue-700 font-bold text-xs flex items-center gap-1">
                  <FileText className="w-4 h-4" /> فتح ملف الإيصال (PDF)
                </a>
              ) : (
                <img src={review.url} alt="صورة الإيصال" className="w-full rounded-xl border border-slate-200" />
              )
            ) : (
              <p className="text-xs text-slate-500">لا توجد صورة متاحة.</p>
            )}
            <div className="text-xs space-y-1">
              <div>
                المبلغ المحوّل: <strong className="font-mono">{fmt(review.r.amount, 2)}</strong> من أصل{' '}
                <strong className="font-mono">{fmt(review.r.invoiceAmount, 2)}</strong> {PLATFORM_CONFIG.currencySymbol}
              </div>
              {review.r.reference && <div>المرجع: {review.r.reference}</div>}
            </div>
            {review.r.status === 'pending' && (
              <>
                <input
                  value={review.note}
                  onChange={(e) => setReview({ ...review, note: e.target.value })}
                  placeholder="ملاحظة (مطلوبة عند الرفض)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => decide('confirmed')}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" /> تأكيد الدفع
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide('rejected')}
                    className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" /> رفض
                  </button>
                </div>
              </>
            )}
            <button onClick={() => setReview(null)} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold">
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Clients
const ClientsTab: React.FC = () => {
  const orgs = useAsync(() => api.listOrganizations());
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'individual_teacher' | 'school'>('all');
  if (orgs.error) return <ErrorBox text={orgs.error} />;
  if (!orgs.data) return <Spinner />;
  const list = orgs.data.filter(
    (o) =>
      (kind === 'all' || (kind === 'school' ? o.kind !== 'individual_teacher' : o.kind === kind)) &&
      (!q || o.name.includes(q) || o.ownerName.includes(q) || o.ownerPhone.includes(q)),
  );
  const issue = async (id: string, name: string) => {
    try {
      await api.issueInvoice(id);
      orgs.reload();
      notify(`صدرت فاتورة لـ «${name}». تظهر له في شاشة الاشتراك.`);
    } catch (e) {
      notify(errText(e, 'تعذّر إصدار الفاتورة.'));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرقم" className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs w-56 max-w-full" />
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          {(
            [
              ['all', 'الكل'],
              ['individual_teacher', 'مدرّسون'],
              ['school', 'مدارس ومراكز'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setKind(k)} className={`px-3 py-1 rounded-lg font-bold ${kind === k ? 'bg-white shadow-2xs' : 'text-slate-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs min-w-[860px]">
          <thead className="bg-[#F7F8FA] text-slate-700 font-bold">
            <tr>
              <th className="p-3">الجهة</th>
              <th className="p-3">المالك</th>
              <th className="p-3 text-center">الطلاب</th>
              <th className="p-3">الباقة</th>
              <th className="p-3 text-center">أوراق 30 يوماً</th>
              <th className="p-3 text-center">تكلفة AI</th>
              <th className="p-3 text-center">غير مسدد</th>
              <th className="p-3 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((o) => (
              <tr key={o.id}>
                <td className="p-3">
                  <strong className="block text-slate-900">{o.name}</strong>
                  <span className="text-[11px] text-slate-500">
                    {KIND_LABEL[o.kind]}
                    {o.region ? ` · ${o.region}` : ''}
                    {o.teachers ? ` · ${o.teachers} معلم` : ''}
                  </span>
                </td>
                <td className="p-3">
                  {o.ownerName}
                  <span className="block font-mono text-[11px] text-slate-500" dir="ltr">
                    {o.ownerPhone}
                  </span>
                </td>
                <td className="p-3 text-center font-mono">{o.activeStudents}</td>
                <td className="p-3">
                  {o.planName || '—'}
                  <span className="block text-[11px] text-slate-500">
                    {o.subscriptionStatus ? SUB_LABEL[o.subscriptionStatus] : 'بلا اشتراك'}
                    {o.subscriptionStatus === 'trial' && o.trialEndsOn ? ` حتى ${dateLabel(o.trialEndsOn)}` : ''}
                  </span>
                </td>
                <td className="p-3 text-center font-mono">{o.papers30d}</td>
                <td className="p-3 text-center font-mono">${fmt(o.gradingCost30d, 2)}</td>
                <td className={`p-3 text-center font-mono font-bold ${o.unpaidAmount ? 'text-amber-700' : 'text-slate-400'}`}>{fmt(o.unpaidAmount)}</td>
                <td className="p-3 text-center">
                  {o.subscriptionStatus && (
                    <button onClick={() => issue(o.id, o.name)} className="text-blue-700 font-bold hover:underline whitespace-nowrap">
                      إصدار فاتورة
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Plans
const emptyPlan = (): Omit<AdminPlan, 'id'> & { id?: string } => ({
  slug: null,
  name: '',
  target: 'teachers',
  billingCycle: 'monthly',
  pricePerStudent: 0,
  minimumCharge: 0,
  installments: 1,
  features: [],
  isActive: true,
  isPublic: true,
  isPopular: false,
  notes: '',
});

const PlansTab: React.FC = () => {
  const plans = useAsync(() => api.listPlans());
  const [edit, setEdit] = useState<(Omit<AdminPlan, 'id'> & { id?: string }) | null>(null);
  const [featuresText, setFeaturesText] = useState('');
  const [busy, setBusy] = useState(false);
  if (plans.error) return <ErrorBox text={plans.error} />;
  if (!plans.data) return <Spinner />;

  const startEdit = (p: Omit<AdminPlan, 'id'> & { id?: string }) => {
    setEdit(p);
    setFeaturesText(p.features.join('\n'));
  };
  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim()) return notify('اكتب اسم الباقة.');
    setBusy(true);
    try {
      await api.savePlan({ ...edit, features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean) });
      setEdit(null);
      plans.reload();
      notify('حُفظت الباقة. الأسعار الجديدة تُطبَّق على الاشتراكات الجديدة.');
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">الأسعار هنا بيانات: تظهر في صفحة الأسعار وتُستخدم في الفواتير.</p>
        <button onClick={() => startEdit(emptyPlan())} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> باقة جديدة
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.data.map((p) => (
          <div key={p.id} className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-2 ${p.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-[#1E3A5F]">{p.name}</h3>
                <span className="text-[11px] text-slate-500">
                  {p.target === 'teachers' ? 'للمدرّسين' : p.target === 'schools' ? 'للمدارس' : 'مؤسسات'} · {p.billingCycle === 'monthly' ? 'شهري' : 'سنوي'}
                  {p.isPopular ? ' · الأكثر طلباً' : ''}
                  {!p.isActive ? ' · موقوفة' : !p.isPublic ? ' · مخفية' : ''}
                </span>
              </div>
              <button onClick={() => startEdit(p)} className="text-blue-700">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <div className="text-2xl font-black font-mono text-[#1E3A5F]">
              {fmt(p.pricePerStudent, 2)} <span className="text-xs">{PLATFORM_CONFIG.currencySymbol} / طالب</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {p.minimumCharge ? `حد أدنى ${fmt(p.minimumCharge)} · ` : ''}
              {p.installments > 1 ? `${p.installments} دفعات` : 'دفعة واحدة'}
            </div>
            <ul className="text-xs text-slate-700 space-y-1 list-disc pr-4">
              {p.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
            <h3 className="font-bold text-base text-[#1E3A5F]">{edit.id ? 'تعديل الباقة' : 'باقة جديدة'}</h3>
            <label className="block space-y-1">
              <span className="font-bold">الاسم</span>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="font-bold">لمن</span>
                <select value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value as AdminPlan['target'] })} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="teachers">المدرّسين</option>
                  <option value="schools">المدارس والمراكز</option>
                  <option value="enterprise">مؤسسات</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-bold">الدورة</span>
                <select value={edit.billingCycle} onChange={(e) => setEdit({ ...edit, billingCycle: e.target.value as AdminPlan['billingCycle'] })} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-bold">السعر لكل طالب</span>
                <input type="number" min={0} value={edit.pricePerStudent} onChange={(e) => setEdit({ ...edit, pricePerStudent: Number(e.target.value) })} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </label>
              <label className="space-y-1">
                <span className="font-bold">الحد الأدنى</span>
                <input type="number" min={0} value={edit.minimumCharge} onChange={(e) => setEdit({ ...edit, minimumCharge: Number(e.target.value) })} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </label>
              <label className="space-y-1">
                <span className="font-bold">عدد الدفعات</span>
                <input type="number" min={1} value={edit.installments} onChange={(e) => setEdit({ ...edit, installments: Math.max(1, Number(e.target.value)) })} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-bold">المزايا (سطر لكل ميزة)</span>
              <textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </label>
            <label className="block space-y-1">
              <span className="font-bold">ملاحظة تظهر تحت السعر</span>
              <input value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
            </label>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['isActive', 'مفعّلة'],
                  ['isPublic', 'تظهر في صفحة الأسعار'],
                  ['isPopular', 'الأكثر طلباً'],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />
                  {l}
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button disabled={busy} onClick={save} className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-xl font-bold disabled:opacity-60">
                حفظ
              </button>
              <button onClick={() => setEdit(null)} className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Grading quality & cost
const QualityTab: React.FC = () => {
  const [days, setDays] = useState(30);
  const q = useAsync(() => api.gradingQuality(days), [days]);
  if (q.error) return <ErrorBox text={q.error} />;
  if (!q.data) return <Spinner />;
  const d = q.data;
  const editRate = d.answers ? Math.round((d.edited / d.answers) * 1000) / 10 : 0;
  const lowRate = d.answers ? Math.round((d.lowConfidence / d.answers) * 1000) / 10 : 0;
  const perPaper = d.runs ? d.costUsd / d.runs : 0;
  const maxRuns = Math.max(1, ...d.byDay.map((x) => x.runs));

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs w-fit">
        {[7, 30, 90].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={`px-3 py-1 rounded-lg font-bold ${days === n ? 'bg-white shadow-2xs' : 'text-slate-600'}`}>
            آخر {n} يوماً
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="أوراق صُحّحت" value={fmt(d.runs)} hint={`${d.failed} فشلت · ${d.escalated} احتاجت النموذج الأقوى`} />
        <Card title="تكلفة التصحيح" value={`$${fmt(d.costUsd, 2)}`} hint={`≈ $${fmt(perPaper, 4)} للورقة`} />
        <Card title="تعديلات المعلمين" value={`${editRate}%`} hint={`${fmt(d.edited)} من ${fmt(d.answers)} إجابة · متوسط التغيير ${d.avgAbsChange} علامة`} tone={editRate > 10 ? 'text-amber-700' : 'text-emerald-700'} />
        <Card title="ثقة منخفضة" value={`${lowRate}%`} hint="إجابات أرسلت للمراجعة اليدوية" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">الأوراق يومياً</h3>
          {!d.byDay.length ? (
            <p className="text-xs text-slate-500">لا توجد بيانات بعد.</p>
          ) : (
            <div className="flex items-end gap-1 h-32" dir="ltr">
              {d.byDay.map((x) => (
                <div key={x.day} className="flex-1 bg-blue-600/80 rounded-t" style={{ height: `${(x.runs / maxRuns) * 100}%` }} title={`${x.day}: ${x.runs} ورقة · $${fmt(x.costUsd, 2)}`} />
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">حسب النموذج وحسب المادة</h3>
          {d.byModel.map((m) => (
            <div key={m.model} className="flex justify-between">
              <span className="font-mono">{m.model}</span>
              <span>
                {fmt(m.runs)} ورقة · ${fmt(m.costUsd, 2)}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 space-y-1.5">
            {d.bySubject.map((s) => (
              <div key={s.subject} className="flex justify-between">
                <span>{s.subject}</span>
                <span className={s.answers && s.edited / s.answers > 0.1 ? 'text-amber-700 font-bold' : ''}>
                  تعديل المعلم في {s.answers ? Math.round((s.edited / s.answers) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Support
const SupportTab: React.FC = () => {
  const tickets = useAsync(() => supportApi().listTickets());
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (tickets.data ?? []).filter((t) => filter === 'all' || t.status === filter), [tickets.data, filter]);
  const selected = tickets.data?.find((t) => t.id === selectedId) ?? null;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      tickets.reload();
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };
  if (tickets.error) return <ErrorBox text={tickets.error} />;
  if (!tickets.data) return <Spinner />;
  const statusLabel = (s: SupportTicket['status']) => (s === 'open' ? 'مفتوحة' : s === 'in_progress' ? 'قيد المعالجة' : 'محلولة');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-[11px] flex-wrap">
          {(['open', 'in_progress', 'resolved', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg font-bold ${filter === f ? 'bg-white shadow-2xs' : 'text-slate-600'}`}>
              {f === 'all' ? 'الكل' : statusLabel(f)}
            </button>
          ))}
        </div>
        {!list.length ? (
          <p className="text-xs text-slate-500">لا توجد تذاكر.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {list.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-right p-3 rounded-xl border text-xs ${selectedId === t.id ? 'border-[#1E3A5F] bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="flex justify-between gap-2">
                  <strong className="truncate">{t.subject}</strong>
                  {t.priority !== 'normal' && <span className="text-rose-600 font-bold shrink-0">{t.priority === 'urgent' ? 'عاجل' : 'مهم'}</span>}
                </div>
                <span className="text-[11px] text-slate-500 block truncate">
                  {t.senderName}
                  {t.entityName ? ` · ${t.entityName}` : ''} · {t.createdAt}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
        {!selected ? (
          <p className="text-slate-500">اختر تذكرة لعرضها.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#1E3A5F]">{selected.subject}</h3>
                <span className="text-[11px] text-slate-500">
                  {selected.ticketNumber} · {selected.senderName}
                  {selected.phone ? ` · ${selected.phone}` : ''}
                  {selected.entityName ? ` · ${selected.entityName}` : ''}
                </span>
              </div>
              <select
                value={selected.status}
                disabled={busy}
                onChange={(e) => act(() => supportApi().setStatus(selected.id, e.target.value as SupportTicket['status']))}
                className="p-1.5 border border-slate-300 rounded-lg"
              >
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="resolved">محلولة</option>
              </select>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl whitespace-pre-wrap leading-relaxed">{selected.description}</div>
            <div className="space-y-2">
              {(selected.replies ?? []).map((r) => (
                <div key={r.id} className={`p-3 rounded-xl whitespace-pre-wrap ${r.sender === 'support_agent' ? 'bg-emerald-50 border border-emerald-200 mr-8' : 'bg-slate-50 ml-8'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">
                    {r.senderName} · {r.time}
                  </div>
                  {r.message}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="اكتب الرد…" className="flex-1 p-2 border border-slate-300 rounded-xl" />
              <button
                disabled={busy || !reply.trim()}
                onClick={() =>
                  act(async () => {
                    await supportApi().reply(selected.id, reply, true);
                    if (selected.status === 'open') await supportApi().setStatus(selected.id, 'in_progress');
                    setReply('');
                  })
                }
                className="bg-[#1E3A5F] text-white px-4 rounded-xl font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> إرسال
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Settings
const SettingsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<PaymentAccount[] | null>(null);
  const [support, setSupport] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [currency, setCurrency] = useState({ code: PLATFORM_CONFIG.currencyCode, symbol: PLATFORM_CONFIG.currencySymbol, name: PLATFORM_CONFIG.currency });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      getPublicSetting<{ accounts?: PaymentAccount[] }>('payment_accounts'),
      getPublicSetting<{ whatsapp?: string }>('support'),
      getPublicSetting<{ days?: number }>('trial'),
      getPublicSetting<{ code: string; symbol: string; name: string }>('currency'),
    ]).then(([a, s, t, c]) => {
      setAccounts(a?.accounts ?? []);
      setSupport(s?.whatsapp ?? '');
      if (t?.days) setTrialDays(String(t.days));
      if (c) setCurrency(c);
    });
  }, []);

  if (!accounts) return <Spinner />;
  const save = async () => {
    setBusy(true);
    try {
      await savePlatformSetting('payment_accounts', { accounts: accounts.filter((a) => a.title.trim() && a.number.trim()) });
      await savePlatformSetting('support', { whatsapp: support.replace(/[^\d+]/g, '') });
      await savePlatformSetting('trial', { days: Math.max(0, Number(trialDays) || 0) });
      await savePlatformSetting('currency', currency);
      notify('حُفظت الإعدادات.');
    } catch (e) {
      notify(errText(e, 'تعذّر حفظ الإعدادات.'));
    } finally {
      setBusy(false);
    }
  };
  const setAcc = (i: number, patch: Partial<PaymentAccount>) => setAccounts(accounts.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <div className="space-y-6 text-xs max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-[#1E3A5F] text-sm">حسابات استلام الاشتراكات</h3>
        <p className="text-slate-500">تظهر للمدرّسين والمدارس في شاشة الاشتراك ليحوّلوا عليها.</p>
        {accounts.map((a, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 relative">
            <input value={a.title} onChange={(e) => setAcc(i, { title: e.target.value })} placeholder="اسم البنك أو المحفظة" className="p-2 border border-slate-300 rounded-lg" />
            <input value={a.holder ?? ''} onChange={(e) => setAcc(i, { holder: e.target.value })} placeholder="اسم صاحب الحساب" className="p-2 border border-slate-300 rounded-lg" />
            <input value={a.number} onChange={(e) => setAcc(i, { number: e.target.value })} placeholder="رقم الحساب / IBAN / رقم المحفظة" dir="ltr" className="p-2 border border-slate-300 rounded-lg font-mono" />
            <input value={a.note ?? ''} onChange={(e) => setAcc(i, { note: e.target.value })} placeholder="ملاحظة (اختياري)" className="p-2 border border-slate-300 rounded-lg" />
            <button onClick={() => setAccounts(accounts.filter((_, j) => j !== i))} className="text-rose-600 flex items-center gap-1 font-bold w-fit">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </button>
          </div>
        ))}
        <button onClick={() => setAccounts([...accounts, { title: '', number: '' }])} className="text-blue-700 font-bold flex items-center gap-1">
          <Plus className="w-4 h-4" /> إضافة حساب
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="font-bold">رقم واتساب الدعم الفني</span>
          <input value={support} onChange={(e) => setSupport(e.target.value)} placeholder="+970599000000" dir="ltr" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
        </label>
        <label className="space-y-1">
          <span className="font-bold">مدة الفترة التجريبية (أيام)</span>
          <input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
        </label>
        <label className="space-y-1">
          <span className="font-bold">العملة (الاسم)</span>
          <input value={currency.name} onChange={(e) => setCurrency({ ...currency, name: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="font-bold">الرمز</span>
            <input value={currency.symbol} onChange={(e) => setCurrency({ ...currency, symbol: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
          </label>
          <label className="space-y-1">
            <span className="font-bold">الكود</span>
            <input value={currency.code} onChange={(e) => setCurrency({ ...currency, code: e.target.value.toUpperCase() })} dir="ltr" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
          </label>
        </div>
      </div>

      <button disabled={busy} onClick={save} className="bg-[#1E3A5F] text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-60">
        حفظ الإعدادات
      </button>
    </div>
  );
};

// E2 / E3 open the matching tab directly.
export const AdminBillingPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => (
  <PlatformAdminDashboard onNavigate={onNavigate} initialTab="financials" />
);

export const GradingQualityPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => (
  <PlatformAdminDashboard onNavigate={onNavigate} initialTab="analytics" />
);
