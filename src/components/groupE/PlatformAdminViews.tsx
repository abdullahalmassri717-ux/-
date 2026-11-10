import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId, SupportTicket } from '../../types';
import { adminApi, type OrgGradingCost } from '../../data/admin';
import { AdminOrgsTab } from './AdminOrgsTab';
import { AdminFinanceTab } from './AdminFinanceTab';
import { AdminPlansTab } from './AdminPlansTab';
import { useAsync, Spinner, ErrorBox, Card, fmt, dateLabel, errText, KIND_LABEL, SUB_LABEL, ORG_STATUS } from './adminUi';
import { supportApi } from '../../data/support';
import { getPublicSetting, savePlatformSetting, usePublicSetting } from '../../lib/settings';
import { PLATFORM_CONFIG } from '../../mockData';
import type { PaymentAccount } from '../../data/billing';
import {
  ShieldCheck,
  Building2,
  DollarSign,
  Sliders,
  BarChart3,
  Plus,
  Headphones,
  Send,
  LayoutTemplate,
  Settings,
  Trash2,
  UserCog,
} from 'lucide-react';
import { LandingPageCMS } from './LandingPageCMS';
import { AdminStaffTab } from './AdminStaffTab';
import { notify } from '../../lib/notify';
import { useAdminAccess } from '../../lib/auth';
import { AdminPermission, adminCan, roleLabel, permissionLabel } from '../../lib/adminAccess';

type Tab = 'overview' | 'financials' | 'analytics' | 'plans' | 'clients' | 'support' | 'landing' | 'settings' | 'staff';

// Which section each tab needs ('super' = only a super admin; none = everyone on the staff).
const TAB_NEEDS: Partial<Record<Tab, AdminPermission | 'super'>> = {
  financials: 'finance',
  clients: 'orgs',
  plans: 'plans',
  analytics: 'quality',
  support: 'support',
  landing: 'landing',
  settings: 'settings',
  staff: 'super',
};

const api = adminApi();

export const PlatformAdminDashboard: React.FC<{
  onNavigate: (screen: ScreenId) => void;
  initialTab?: Tab;
}> = ({ onNavigate, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  const access = useAdminAccess();
  const allowed = (t: Tab) => {
    const need = TAB_NEEDS[t];
    if (!need) return true;
    return need === 'super' ? !!access?.isSuper : adminCan(access, need);
  };

  const allTabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: ShieldCheck },
    { id: 'financials', label: 'المدفوعات والفواتير', icon: DollarSign },
    { id: 'clients', label: 'الجهات', icon: Building2 },
    { id: 'plans', label: 'الباقات والأسعار', icon: Sliders },
    { id: 'analytics', label: 'جودة وتكلفة التصحيح', icon: BarChart3 },
    { id: 'support', label: 'الدعم الفني', icon: Headphones },
    { id: 'landing', label: 'الصفحة التعريفية', icon: LayoutTemplate },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
    { id: 'staff', label: 'طاقم الإدارة', icon: UserCog },
  ];
  const tabs = allTabs.filter((t) => allowed(t.id));
  const show = (t: Tab) => activeTab === t && allowed(t);

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

      {show('overview') &&
        (adminCan(access, 'orgs') || adminCan(access, 'finance') ? (
          <OverviewTab go={setActiveTab} showReceipts={adminCan(access, 'finance')} />
        ) : (
          <StaffWelcome />
        ))}
      {show('financials') && <AdminFinanceTab />}
      {show('clients') && <AdminOrgsTab />}
      {show('plans') && <AdminPlansTab />}
      {show('analytics') && <QualityTab />}
      {show('support') && <SupportTab />}
      {show('landing') && <LandingPageCMS onNavigate={onNavigate} />}
      {show('settings') && <SettingsTab />}
      {show('staff') && <AdminStaffTab />}
      {!allowed(activeTab) && <NoAdminAccess />}
    </div>
  );
};

// ---------------------------------------------------------------- Overview
/** Shown when someone opens a section their role doesn't include. */
export const NoAdminAccess: React.FC = () => (
  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 text-center space-y-1">
    <strong className="block text-sm">هذا القسم ليس ضمن صلاحياتك</strong>
    <span>اطلب من المدير العام للمنصة إضافته لك إن كنت تحتاجه.</span>
  </div>
);

/** Wraps a whole admin page that needs one section (e.g. the curricula page). */
export const AdminSectionGate: React.FC<{ need: AdminPermission; children: React.ReactNode }> = ({ need, children }) => {
  const access = useAdminAccess();
  return adminCan(access, need) ? <>{children}</> : <NoAdminAccess />;
};

// A staff member without the organizations or payments sections sees what they can open.
const StaffWelcome: React.FC = () => {
  const access = useAdminAccess();
  if (!access) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
      <h3 className="font-extrabold text-[#1E3A5F] text-sm">أهلاً بك في فريق إدارة المنصة</h3>
      <p className="text-slate-600">
        دورك: <strong>{roleLabel(access.role)}</strong>. الأقسام المتاحة لك:
      </p>
      <div className="flex flex-wrap gap-2">
        {access.permissions.map((p) => (
          <span key={p} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold">
            {permissionLabel(p)}
          </span>
        ))}
      </div>
      <p className="text-slate-500">افتحها من القائمة الجانبية أو من الأزرار أعلاه.</p>
    </div>
  );
};

const OverviewTab: React.FC<{ go: (t: Tab) => void; showReceipts: boolean }> = ({ go, showReceipts }) => {
  const orgs = useAsync(() => api.listOrganizations());
  const receipts = useAsync(() => (showReceipts ? api.listReceipts('pending') : Promise.resolve([])), [showReceipts]);
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
  const pending = list.filter((o) => o.status === 'pending');

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <button
          onClick={() => go('clients')}
          className="w-full p-4 bg-amber-50 border border-amber-300 rounded-2xl text-right text-xs text-amber-900 flex items-center justify-between gap-3"
        >
          <span>
            <strong className="text-sm block">{pending.length} {pending.length === 1 ? 'جهة جديدة تنتظر' : 'جهات جديدة تنتظر'} موافقتك</strong>
            {pending.slice(0, 3).map((o) => o.name).join('، ')}
            {pending.length > 3 ? '…' : ''}
          </span>
          <span className="font-bold shrink-0">راجعها ←</span>
        </button>
      )}
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
                <span className={`text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-full ${o.status === 'active' ? 'text-slate-600' : ORG_STATUS[o.status].c}`}>
                  {o.status === 'active' ? (o.subscriptionStatus ? SUB_LABEL[o.subscriptionStatus] : 'بلا اشتراك') : ORG_STATUS[o.status].t}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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

      <OrgCostTable rows={d.byOrg} rate={d.usdToIls} days={days} />
    </div>
  );
};

/** Real AI cost per organization next to what it was invoiced, so the admin can see if a plan's price covers it. */
const OrgCostTable: React.FC<{ rows: OrgGradingCost[]; rate: number; days: number }> = ({ rows, rate, days }) => {
  const sym = usePublicSetting<{ symbol?: string }>('currency', { symbol: PLATFORM_CONFIG.currencySymbol }).symbol ?? '';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
      <div>
        <h3 className="font-extrabold text-[#1E3A5F] text-sm">التكلفة الفعلية لكل جهة (آخر {days} يوماً)</h3>
        <p className="text-slate-500 mt-1">
          تكلفة الذكاء الاصطناعي محسوبة بسعر الدولار {fmt(rate, 2)} {sym} (تغيّره من «الإعدادات»). قارنها بما فوترته للجهة في نفس الفترة.
        </p>
      </div>
      {!rows.length ? (
        <p className="text-slate-500">لم تُصحَّح أوراق في هذه الفترة.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[640px]">
            <thead className="bg-[#F7F8FA] text-slate-700 font-bold">
              <tr>
                <th className="p-2.5">الجهة</th>
                <th className="p-2.5 text-center">أوراق / صفحات</th>
                <th className="p-2.5 text-center">للنموذج الأقوى</th>
                <th className="p-2.5 text-center">التكلفة</th>
                <th className="p-2.5 text-center">لكل طالب نشط</th>
                <th className="p-2.5 text-center">فوترنا لها</th>
                <th className="p-2.5 text-center">نسبة التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const cost = r.costUsd * rate;
                const share = r.billed > 0 ? Math.round((cost / r.billed) * 100) : null;
                return (
                  <tr key={r.orgId}>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-900">{r.name}</span>
                      <span className="text-slate-500"> · {KIND_LABEL[r.kind as keyof typeof KIND_LABEL] ?? r.kind}</span>
                    </td>
                    <td className="p-2.5 text-center font-mono tabular-nums">
                      {fmt(r.papers)} / {fmt(r.pages)}
                    </td>
                    <td className="p-2.5 text-center font-mono tabular-nums">{r.papers ? Math.round((r.escalated / r.papers) * 100) : 0}%</td>
                    <td className="p-2.5 text-center font-mono tabular-nums font-bold">
                      {fmt(cost, 2)} {sym}
                    </td>
                    <td className="p-2.5 text-center font-mono tabular-nums">
                      {r.activeStudents ? `${fmt(cost / r.activeStudents, 2)} ${sym}` : '—'}
                    </td>
                    <td className="p-2.5 text-center font-mono tabular-nums">{r.billed ? `${fmt(r.billed)} ${sym}` : '—'}</td>
                    <td className="p-2.5 text-center">
                      {share === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${share > 30 ? 'bg-red-100 text-red-800' : share > 15 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                          {share}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
  const [usdRate, setUsdRate] = useState('3.7');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      getPublicSetting<{ accounts?: PaymentAccount[] }>('payment_accounts'),
      getPublicSetting<{ whatsapp?: string }>('support'),
      getPublicSetting<{ days?: number }>('trial'),
      getPublicSetting<{ code: string; symbol: string; name: string }>('currency'),
      getPublicSetting<{ usd_to_ils?: number }>('exchange'),
    ]).then(([a, s, t, c, x]) => {
      if (x?.usd_to_ils) setUsdRate(String(x.usd_to_ils));
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
      if (Number(usdRate) > 0) await savePlatformSetting('exchange', { usd_to_ils: Number(usdRate) }, false);
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
        <label className="space-y-1">
          <span className="font-bold">سعر الدولار بعملة المنصة</span>
          <input type="number" min={0} step="0.01" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} dir="ltr" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
          <span className="block text-[11px] text-slate-500">تكلفة الذكاء الاصطناعي بالدولار. نستخدم هذا السعر لعرضها بعملتك في «جودة التصحيح».</span>
        </label>
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
