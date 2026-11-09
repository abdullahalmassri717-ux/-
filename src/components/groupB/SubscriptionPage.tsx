import React, { useMemo, useState } from 'react';
import { ScreenId, Entity } from '../../types';
import { errorMessage, useData, useLoad } from '../../data/DataContext';
import { monthStart, whatsappLink, type InvoiceRow, type TuitionPayment, type TuitionRow } from '../../data/billing';
import {
  CreditCard,
  Building,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  MessageCircle,
  Printer,
  Download,
  Phone,
  Wallet,
  Receipt,
  FileCheck,
  CalendarPlus,
  Loader2,
  XCircle,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { InvoiceSheet } from '../common/InvoiceSheet';

interface SubscriptionPageProps {
  onNavigate: (screen: ScreenId) => void;
  activeEntity?: Entity;
}

const monthLabel = (m: string) => {
  try {
    return new Date(`${m}T00:00:00`).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  } catch {
    return m;
  }
};
const dateLabel = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
};
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

const METHODS = ['نقداً', 'محفظة إلكترونية', 'حوالة بنكية'];

const INVOICE_STATUS: Record<InvoiceRow['status'], { label: string; cls: string }> = {
  issued: { label: 'بانتظار الدفع', cls: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'متأخرة', cls: 'bg-rose-100 text-rose-800' },
  pending_confirmation: { label: 'بانتظار تأكيد الإيصال', cls: 'bg-blue-100 text-blue-800' },
  paid: { label: 'مدفوعة', cls: 'bg-emerald-100 text-emerald-800' },
  void: { label: 'ملغاة', cls: 'bg-slate-100 text-slate-500' },
};

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate, activeEntity }) => {
  const isSchool = activeEntity?.type === 'school' || activeEntity?.type === 'learning_center';
  const isOwner = activeEntity?.role !== 'teacher';
  const store = useData();

  const [activeMainTab, setActiveMainTab] = useState<'student_tuitions' | 'platform_subscription'>(
    isSchool ? 'platform_subscription' : 'student_tuitions',
  );
  const [month, setMonth] = useState(monthStart());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const billingQ = useLoad((st) => (isOwner ? st.getBilling() : Promise.resolve(null)));
  const tuitionQ = useLoad((st) => (isOwner && !isSchool ? st.listTuition(month) : Promise.resolve([] as TuitionRow[])), [month]);
  const billing = billingQ.data ?? null;
  const rows = tuitionQ.data ?? [];
  const sym = billing?.currency.symbol ?? '';

  // Modals
  const [payFor, setPayFor] = useState<{ studentId: string; amount: number; method: string; notes: string } | null>(null);
  const [voucher, setVoucher] = useState<{ row: TuitionRow; payment: TuitionPayment } | null>(null);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [defaultFee, setDefaultFee] = useState('');
  const [remindOpen, setRemindOpen] = useState(false);
  const [editFee, setEditFee] = useState<{ studentId: string; value: string } | null>(null);
  const [receiptFor, setReceiptFor] = useState<InvoiceRow | null>(null);
  const [sheetFor, setSheetFor] = useState<InvoiceRow | null>(null);
  const [receiptForm, setReceiptForm] = useState<{ file: File | null; method: 'bank_transfer' | 'e_wallet'; amount: string; reference: string }>({
    file: null,
    method: 'bank_transfer',
    amount: '',
    reference: '',
  });
  const [busy, setBusy] = useState(false);
  // Pause a monthly subscription (vacation months).
  const [pauseForm, setPauseForm] = useState<{ from: string; until: string } | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);

  const filtered = rows.filter((r) => {
    const st = r.status === 'none' ? 'unpaid' : r.status;
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    const q = searchQuery.trim();
    return !q || r.studentName.includes(q) || r.parentPhone.includes(q) || (r.lastReceipt ?? '').includes(q);
  });

  const totals = useMemo(() => {
    const charged = rows.filter((r) => r.chargeId);
    const expected = charged.reduce((n, r) => n + r.amountDue, 0);
    const collected = charged.reduce((n, r) => n + Math.min(r.paidAmount, r.amountDue), 0);
    return {
      expected,
      collected,
      remaining: Math.max(0, expected - collected),
      rate: expected ? Math.round((collected / expected) * 1000) / 10 : 0,
      paidCount: charged.filter((r) => r.status === 'paid').length,
      unpaid: charged.filter((r) => r.status === 'unpaid').length,
      partial: charged.filter((r) => r.status === 'partial').length,
      missing: rows.length - charged.length,
    };
  }, [rows]);
  const late = rows.filter((r) => r.status === 'unpaid' || r.status === 'partial');
  const platformFee = billing?.plan?.cycle === 'monthly' ? billing.estimatedDue : 0;

  const reminderText = (r: TuitionRow) =>
    `السلام عليكم ولي أمر الطالب/ة ${r.studentName}،\nنذكّركم بلطف بالمتبقي من رسوم شهر ${monthLabel(month)}: ${fmt(r.amountDue - r.paidAmount)} ${sym}.\nمع الشكر — ${activeEntity?.name ?? ''}`;

  const voucherText = (v: { row: TuitionRow; payment: TuitionPayment }) =>
    `سند قبض رقم ${v.payment.receiptNumber}\nوصلنا من الطالب/ة ${v.row.studentName} مبلغ ${fmt(v.payment.amount)} ${sym}\nعن رسوم شهر ${monthLabel(month)}\nبتاريخ ${dateLabel(v.payment.paidOn)}\n— ${activeEntity?.name ?? ''}`;

  const handlePause = async () => {
    if (!pauseForm) return;
    setPauseBusy(true);
    try {
      await store.pauseSubscription(pauseForm.from || null, pauseForm.until || null);
      notify('تم إيقاف الاشتراك. أيام الإيقاف لا تُحسب في الفاتورة.', 'success');
      setPauseForm(null);
      billingQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setPauseBusy(false);
    }
  };

  const handleResume = async () => {
    setPauseBusy(true);
    try {
      await store.resumeSubscription();
      notify('رجع الاشتراك يعمل من اليوم.', 'success');
      billingQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setPauseBusy(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFor) return;
    const row = rows.find((r) => r.studentId === payFor.studentId);
    if (!row || !(payFor.amount > 0)) {
      notify('اختر الطالب واكتب مبلغاً صحيحاً.');
      return;
    }
    setBusy(true);
    try {
      const payment = await store.recordTuitionPayment({ studentId: row.studentId, month, amount: payFor.amount, method: payFor.method, notes: payFor.notes });
      setPayFor(null);
      tuitionQ.reload();
      setVoucher({ row, payment });
    } catch (err) {
      notify(errorMessage(err, 'تعذّر تسجيل الدفعة.'));
    } finally {
      setBusy(false);
    }
  };

  const openVoucher = async (row: TuitionRow) => {
    try {
      const list = await store.listTuitionPayments(row.studentId, month);
      if (!list.length) return notify('لا توجد دفعات لهذا الطالب في هذا الشهر.');
      setVoucher({ row, payment: list[0] });
    } catch (err) {
      notify(errorMessage(err, 'تعذّر تحميل السند.'));
    }
  };

  const handleCreateCharges = async () => {
    const amount = Number(defaultFee);
    if (!(amount >= 0) || defaultFee.trim() === '') return notify('اكتب الرسم الشهري الافتراضي.');
    setBusy(true);
    try {
      const n = await store.createMonthCharges(month, amount);
      setChargesOpen(false);
      tuitionQ.reload();
      notify(n ? `تم تجهيز رسوم ${n} طالباً لشهر ${monthLabel(month)}.` : 'كل الطلاب لديهم رسوم لهذا الشهر.');
    } catch (err) {
      notify(errorMessage(err, 'تعذّر تجهيز الرسوم.'));
    } finally {
      setBusy(false);
    }
  };

  const saveFee = async () => {
    if (!editFee) return;
    const amount = Number(editFee.value);
    if (!(amount >= 0) || editFee.value.trim() === '') return setEditFee(null);
    try {
      await store.setChargeAmount(editFee.studentId, month, amount);
      tuitionQ.reload();
    } catch (err) {
      notify(errorMessage(err, 'تعذّر حفظ الرسم.'));
    } finally {
      setEditFee(null);
    }
  };

  const exportCsv = () => {
    const head = ['الطالب', 'المجموعة', 'جوال ولي الأمر', 'الرسم', 'المدفوع', 'المتبقي', 'الحالة', 'آخر سند'];
    const label = { paid: 'مسدد', partial: 'جزئي', unpaid: 'غير مسدد', none: 'بلا رسم' };
    const lines = rows.map((r) => [r.studentName, r.groupName, r.parentPhone, r.amountDue, r.paidAmount, Math.max(0, r.amountDue - r.paidAmount), label[r.status], r.lastReceipt ?? '']);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `رسوم-${month.slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleUploadReceipt = async () => {
    if (!receiptFor) return;
    const amount = Number(receiptForm.amount);
    if (!receiptForm.file) return notify('اختر صورة الإيصال.');
    if (!(amount > 0)) return notify('اكتب المبلغ المحوَّل.');
    setBusy(true);
    try {
      await store.uploadPaymentReceipt(receiptFor.id, {
        file: receiptForm.file,
        fileName: receiptForm.file.name,
        method: receiptForm.method,
        amount,
        reference: receiptForm.reference,
      });
      setReceiptFor(null);
      billingQ.reload();
      notify('تم رفع الإيصال. ستؤكده إدارة المنصة قريباً.');
    } catch (err) {
      notify(errorMessage(err, 'تعذّر رفع الإيصال.'));
    } finally {
      setBusy(false);
    }
  };

  // School teachers never see billing.
  if (!isOwner) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="font-black text-slate-900 text-lg">الاشتراك والفواتير خاصة بإدارة الجهة</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          حسابك مسجّل كمعلّم ضمن «{activeEntity?.name}». الاشتراك والفواتير يديرها مالك الجهة فقط.
        </p>
        <button
          onClick={() => onNavigate('B2')}
          className="mt-2 bg-[#1E3A5F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#152a45] transition-colors"
        >
          العودة للمجموعات والطلاب
        </button>
      </div>
    );
  }

  const openInvoice = billing?.invoices.find((i) => i.status === 'issued' || i.status === 'overdue');
  const plan = billing?.plan ?? null;

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F]">
            {isSchool ? `الاشتراك والفواتير: ${activeEntity?.name ?? ''}` : 'رسوم الطلاب والاشتراك'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSchool
              ? 'متابعة اشتراك الجهة في دقة، الفواتير، ورفع إيصالات التحويل'
              : 'تسجيل ما دفعه كل طالب وإصدار سندات القبض، ومتابعة اشتراكك في دقة'}
          </p>
        </div>

        {!isSchool ? (
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 self-start sm:self-auto border border-slate-200 shadow-inner max-w-full">
            <button
              onClick={() => setActiveMainTab('student_tuitions')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'student_tuitions' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>رسوم طلابي</span>
              {totals.expected > 0 && (
                <span className="bg-emerald-500/20 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">{totals.rate}%</span>
              )}
            </button>
            <button
              onClick={() => setActiveMainTab('platform_subscription')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'platform_subscription' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-300 shrink-0" />
              <span>اشتراكي في دقة</span>
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1E3A5F] flex items-center gap-2 self-start">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span>{plan?.name ?? 'لا يوجد اشتراك مفعّل'}</span>
          </div>
        )}
      </div>

      {/* ============================ TUITION ============================ */}
      {activeMainTab === 'student_tuitions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="font-bold text-slate-700">الشهر:</label>
            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => e.target.value && setMonth(`${e.target.value}-01`)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono"
            />
            <span className="text-slate-500">{monthLabel(month)}</span>
          </div>

          {tuitionQ.error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{tuitionQ.error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">الرسوم المطلوبة هذا الشهر</span>
                <span className="p-1.5 bg-blue-50 text-[#1E3A5F] rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {fmt(totals.expected)} <span className="text-xs font-bold">{sym}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {rows.length - totals.missing} طالباً لهم رسم{totals.missing ? ` · ${totals.missing} بلا رسم بعد` : ''}
              </p>
            </div>

            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-2xs space-y-2 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-bold">تم تحصيله</span>
                <span className="p-1.5 bg-emerald-500 text-white rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                {fmt(totals.collected)} <span className="text-xs font-bold text-emerald-800">{sym}</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${totals.rate}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-emerald-800 font-bold font-mono">
                  <span>نسبة التحصيل: {totals.rate}%</span>
                  <span>{totals.paidCount} مسدد</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-amber-300 rounded-2xl p-5 shadow-2xs space-y-2 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-900 font-bold">المتبقي</span>
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono tabular-nums">
                {fmt(totals.remaining)} <span className="text-xs font-bold">{sym}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                {totals.unpaid} لم يدفعوا · {totals.partial} دفعوا جزءاً
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1E3A5F] to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200 font-bold">الصافي بعد اشتراك دقة</span>
                <span className="p-1.5 bg-white/10 text-emerald-300 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {fmt(totals.collected - platformFee)} <span className="text-xs font-normal text-blue-200">{sym}</span>
              </div>
              <p className="text-[10px] text-blue-200">
                اشتراك دقة المتوقع هذا الشهر: {fmt(platformFee)} {sym}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const first = late[0] ?? rows[0];
                if (!first) return notify('أضف طلاباً أولاً من شاشة الطلاب والمجموعات.');
                setPayFor({ studentId: first.studentId, amount: Math.max(0, first.amountDue - first.paidAmount), method: METHODS[0], notes: '' });
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل دفعة</span>
            </button>
            {totals.missing > 0 && (
              <button
                onClick={() => setChargesOpen(true)}
                className="bg-blue-50 hover:bg-blue-100 text-[#1E3A5F] border border-blue-200 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>تجهيز رسوم الشهر ({totals.missing})</span>
              </button>
            )}
            <button
              onClick={() => (late.length ? setRemindOpen(true) : notify('لا يوجد متأخرون هذا الشهر.'))}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>تذكير المتأخرين ({late.length})</span>
            </button>
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>تصدير Excel</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-[#1E3A5F] text-base">كشف رسوم الطلاب ({filtered.length})</h3>
                <p className="text-xs text-slate-500">اضغط على الرسم لتعديله لطالب معيّن</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الجوال أو رقم السند"
                    className="pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs w-56 max-w-full focus:bg-white transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {(
                    [
                      ['all', 'الكل', 'bg-white text-slate-900'],
                      ['paid', 'مسدد', 'bg-emerald-600 text-white'],
                      ['partial', 'جزئي', 'bg-amber-500 text-white'],
                      ['unpaid', 'غير مسدد', 'bg-rose-600 text-white'],
                    ] as const
                  ).map(([key, label, on]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${statusFilter === key ? `${on} shadow-2xs` : 'text-slate-600'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {tuitionQ.loading ? (
              <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : !rows.length ? (
              <div className="py-10 text-center text-xs text-slate-500">لا يوجد طلاب بعد. أضفهم من شاشة «الطلاب والمجموعات».</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[760px]">
                  <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">الطالب والمجموعة</th>
                      <th className="p-3">جوال ولي الأمر</th>
                      <th className="p-3 text-center">الرسم</th>
                      <th className="p-3 text-center">المدفوع</th>
                      <th className="p-3 text-center">المتبقي</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">آخر سند</th>
                      <th className="p-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((r) => {
                      const remaining = Math.max(0, r.amountDue - r.paidAmount);
                      const remindUrl = whatsappLink(r.parentPhone, reminderText(r));
                      return (
                        <tr key={r.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <strong className="block text-slate-900 font-bold">{r.studentName}</strong>
                            <span className="text-[11px] text-slate-500">{r.groupName || '—'}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-600 tabular-nums">
                            {r.parentPhone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span dir="ltr">{r.parentPhone}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                            {editFee?.studentId === r.studentId ? (
                              <input
                                autoFocus
                                type="number"
                                min={0}
                                value={editFee.value}
                                onChange={(e) => setEditFee({ studentId: r.studentId, value: e.target.value })}
                                onBlur={saveFee}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                className="w-20 p-1 border border-blue-300 rounded-lg text-center"
                              />
                            ) : (
                              <button
                                onClick={() => setEditFee({ studentId: r.studentId, value: r.chargeId ? String(r.amountDue) : '' })}
                                className="hover:underline cursor-pointer"
                                title="تعديل الرسم"
                              >
                                {r.chargeId ? `${fmt(r.amountDue)} ${sym}` : <span className="text-blue-700 text-[11px]">+ حدّد الرسم</span>}
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700 tabular-nums">
                            {fmt(r.paidAmount)} {sym}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-rose-600 tabular-nums">
                            {fmt(remaining)} {sym}
                          </td>
                          <td className="p-3 text-center">
                            {r.status === 'paid' && (
                              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> مسدد
                              </span>
                            )}
                            {r.status === 'partial' && (
                              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> جزئي
                              </span>
                            )}
                            {r.status === 'unpaid' && (
                              <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> غير مسدد
                              </span>
                            )}
                            {r.status === 'none' && <span className="text-slate-400 text-[10px]">بلا رسم</span>}
                          </td>
                          <td className="p-3 text-center">
                            {r.lastReceipt ? (
                              <button
                                onClick={() => openVoucher(r)}
                                className="text-blue-700 hover:text-blue-900 font-mono font-bold text-[11px] hover:underline cursor-pointer inline-flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>{r.lastReceipt}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {r.status !== 'paid' && remindUrl && (
                                <a
                                  href={remindUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>تذكير</span>
                                </a>
                              )}
                              {r.status !== 'paid' && (
                                <button
                                  onClick={() => setPayFor({ studentId: r.studentId, amount: remaining || r.amountDue, method: METHODS[0], notes: '' })}
                                  className="p-1.5 bg-[#1E3A5F] hover:bg-[#152a45] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  + دفعة
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================= PLATFORM SUBSCRIPTION ========================= */}
      {activeMainTab === 'platform_subscription' && (
        <div className="space-y-6">
          {billingQ.loading ? (
            <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
            </div>
          ) : billingQ.error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{billingQ.error}</div>
          ) : (
            billing && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                    <span className="text-xs text-slate-400">الباقة</span>
                    <h3 className="text-lg font-black text-[#1E3A5F]">{plan?.name ?? 'لا يوجد اشتراك مفعّل بعد'}</h3>
                    {plan ? (
                      <p className="text-[11px] text-slate-500">
                        {fmt(plan.pricePerStudent)} {sym} {plan.pricingModel === 'per_paper' ? 'لكل ورقة مصحّحة' : 'لكل طالب مسجّل'}{' '}
                        {plan.cycle === 'monthly' ? 'شهرياً' : 'سنوياً'}
                        {plan.tiers.length ? ' · سعر أقل للأعداد الكبيرة' : ''}
                        {plan.installments > 1 ? ` · على ${plan.installments} دفعات` : ''}
                        <span className="block">تدفع حسب استخدامك الفعلي، بدون حد أدنى.</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">تواصل مع الدعم الفني لتفعيل اشتراكك.</p>
                    )}
                    {billing.subscriptionStatus === 'trial' && (
                      <p className="text-[11px] text-blue-700 font-bold">فترة تجريبية{billing.trialEndsOn ? ` حتى ${dateLabel(billing.trialEndsOn)}` : ''}</p>
                    )}
                    {billing.subscriptionStatus === 'past_due' && <p className="text-[11px] text-rose-700 font-bold">يوجد مبلغ متأخر على الاشتراك</p>}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                    <span className="text-xs text-slate-400">{plan?.pricingModel === 'per_paper' ? 'الأوراق منذ آخر فاتورة' : 'الطلاب المسجّلون الآن'}</span>
                    <div className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">
                      {billing.estimatedUnits} <span className="text-sm font-normal text-slate-500">{plan?.pricingModel === 'per_paper' ? 'ورقة' : 'طالب'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      الفاتورة القادمة تقريباً: {fmt(billing.estimatedDue)} {sym}
                    </p>
                  </div>

                  <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 shadow-2xs space-y-1 bg-blue-50/20">
                    <span className="text-xs text-blue-900 font-bold">المستحق الآن</span>
                    <div className="text-3xl font-black text-blue-900 font-mono tabular-nums">
                      {fmt(openInvoice ? Math.max(0, openInvoice.amount - openInvoice.paidAmount) : 0)} <span className="text-sm font-bold">{sym}</span>
                    </div>
                    <p className="text-[11px] text-blue-700 font-medium">
                      {openInvoice ? `فاتورة ${openInvoice.number} · الاستحقاق ${dateLabel(openInvoice.dueOn)}` : 'لا توجد فاتورة مستحقة.'}
                    </p>
                    {openInvoice && (
                      <button
                        onClick={() => {
                          setReceiptForm({ file: null, method: 'bank_transfer', amount: String(Math.max(0, openInvoice.amount - openInvoice.paidAmount)), reference: '' });
                          setReceiptFor(openInvoice);
                        }}
                        className="mt-2 bg-[#1E3A5F] hover:bg-[#152a45] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" /> رفع إيصال التحويل
                      </button>
                    )}
                  </div>
                </div>

                {plan?.cycle === 'monthly' && (
                  <div className={`border rounded-2xl p-5 shadow-2xs space-y-3 ${billing.pause ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
                    <h3 className="font-extrabold text-[#1E3A5F] text-base flex items-center gap-2">
                      <PauseCircle className="w-5 h-5 text-amber-600" />
                      <span>إيقاف الاشتراك مؤقتاً</span>
                    </h3>
                    {billing.pause ? (
                      <>
                        <p className="text-xs text-amber-900 leading-relaxed font-bold">
                          {billing.pause.active ? 'اشتراكك موقوف الآن' : `اشتراكك سيتوقف من ${dateLabel(billing.pause.startsOn)}`}
                          {billing.pause.endsOn ? ` حتى ${dateLabel(billing.pause.endsOn)}` : ' حتى ترجعه بنفسك'}.
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          أيام الإيقاف لا تُحسب في الفاتورة. خلالها لا تستقبل أوراقاً جديدة، وكل طلابك ودرجاتك محفوظة.
                        </p>
                        <button
                          disabled={pauseBusy}
                          onClick={handleResume}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" /> {billing.pause.active ? 'أرجِع الاشتراك الآن' : 'ألغِ الإيقاف'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          في أشهر الإجازة أو إذا توقفت عن التدريس، أوقف اشتراكك ولن تدفع عن أيام الإيقاف. طلابك ودرجاتك تبقى محفوظة، وترجع متى بدك.
                          لإيقاف طالب أو مجموعة فقط، عطّلهم من شاشة «المجموعات والطلاب».
                        </p>
                        <button
                          onClick={() => setPauseForm({ from: '', until: '' })}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <PauseCircle className="w-4 h-4" /> إيقاف الاشتراك
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-[#1E3A5F] text-base flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-700" />
                    <span>طرق الدفع</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    حوّل المبلغ إلى أحد الحسابات التالية، ثم ارفع صورة الإيصال. تؤكد إدارة المنصة الدفع يدوياً.
                  </p>
                  {billing.paymentAccounts.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {billing.paymentAccounts.map((a, i) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 min-w-0">
                          <strong className="block text-slate-800 text-sm">{a.title}</strong>
                          {a.holder && <p className="text-slate-600">اسم الحساب: {a.holder}</p>}
                          <div className="text-[#1E3A5F] font-bold font-mono break-all" dir="ltr">
                            {a.number}
                          </div>
                          {a.note && <div className="text-slate-500 text-[11px]">{a.note}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      بيانات الحسابات لم تُضف بعد. تواصل مع الدعم الفني لمعرفة طريقة الدفع.
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-[#1E3A5F] text-base">الفواتير</h3>
                  {!billing.invoices.length ? (
                    <p className="text-xs text-slate-500">لا توجد فواتير بعد.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs min-w-[640px]">
                        <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">رقم الفاتورة</th>
                            <th className="p-3">الفترة</th>
                            <th className="p-3 text-center">الاستخدام</th>
                            <th className="p-3 text-center">المبلغ</th>
                            <th className="p-3 text-center">الحالة</th>
                            <th className="p-3 text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {billing.invoices.map((inv) => {
                            const st = INVOICE_STATUS[inv.status];
                            const canPay = inv.status === 'issued' || inv.status === 'overdue';
                            return (
                              <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-800">{inv.number}</td>
                                <td className="p-3 text-slate-700">
                                  {plan?.cycle === 'yearly' || inv.installmentNo > 1
                                    ? `${dateLabel(inv.periodStart)} – ${dateLabel(inv.periodEnd)}`
                                    : monthLabel(inv.periodStart)}
                                </td>
                                <td className="p-3 text-center font-mono tabular-nums">
                                  {inv.pricingModel && inv.units ? `${inv.units} ${inv.pricingModel === 'per_paper' ? 'ورقة' : 'طالب'}` : '—'}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-[#1E3A5F] tabular-nums">
                                  {fmt(inv.amount)} {sym}
                                  {inv.paidAmount > 0 && inv.paidAmount < inv.amount && (
                                    <span className="block text-[10px] font-normal text-amber-700">مدفوع {fmt(inv.paidAmount)} · باقي {fmt(inv.amount - inv.paidAmount)}</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`${st.cls} px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-block`}>{st.label}</span>
                                  {inv.receipt?.status === 'rejected' && (
                                    <div className="text-[10px] text-rose-700 mt-1 flex items-center justify-center gap-1">
                                      <XCircle className="w-3 h-3" /> رُفض الإيصال{inv.receipt.note ? `: ${inv.receipt.note}` : ''}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    {canPay ? (
                                      <button
                                        onClick={() => {
                                          setReceiptForm({ file: null, method: 'bank_transfer', amount: String(Math.max(0, inv.amount - inv.paidAmount)), reference: '' });
                                          setReceiptFor(inv);
                                        }}
                                        className="text-blue-700 hover:underline font-bold cursor-pointer"
                                      >
                                        رفع إيصال
                                      </button>
                                    ) : inv.paidAt ? (
                                      <span className="text-slate-500">{dateLabel(inv.paidAt)}</span>
                                    ) : null}
                                    <button onClick={() => setSheetFor(inv)} className="text-slate-600 hover:underline font-bold cursor-pointer flex items-center gap-1">
                                      <Printer className="w-3.5 h-3.5" /> عرض وطباعة
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {sheetFor && billing && (
        <InvoiceSheet
          invoice={{ ...sheetFor, orgName: activeEntity?.name ?? '', unitPrice: sheetFor.pricePerStudent }}
          sym={sym}
          accounts={billing.paymentAccounts}
          onClose={() => setSheetFor(null)}
        />
      )}
      {voucher && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="print-area bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right">
            <div className="bg-[#1E3A5F] text-white p-5 flex items-center justify-between border-b-4 border-emerald-500">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base">سند قبض</h3>
                <p className="text-[11px] text-blue-200 truncate">{activeEntity?.name}</p>
              </div>
              <button
                onClick={() => setVoucher(null)}
                className="print:hidden w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">رقم السند:</span>
                  <span className="font-bold text-[#1E3A5F] text-sm">{voucher.payment.receiptNumber}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">التاريخ:</span>
                  <span className="font-semibold text-slate-800">{dateLabel(voucher.payment.paidOn)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">وصلنا من الطالب/ة:</span>
                <strong className="text-sm font-black text-slate-900">{voucher.row.studentName}</strong>
              </div>
              {voucher.row.groupName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">المجموعة:</span>
                  <span className="font-bold text-slate-700">{voucher.row.groupName}</span>
                </div>
              )}
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                <span className="text-[11px] text-emerald-800">المبلغ:</span>
                <strong className="text-lg font-mono font-black text-emerald-700">
                  {fmt(voucher.payment.amount)} {sym}
                </strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">وذلك عن:</span>
                <span className="font-medium text-slate-800">{voucher.payment.notes || `رسوم شهر ${monthLabel(month)}`}</span>
              </div>
              {voucher.payment.method && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">طريقة الدفع:</span>
                  <span className="font-medium text-slate-800">{voucher.payment.method}</span>
                </div>
              )}
            </div>
            <div className="print:hidden p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              {(() => {
                const url = whatsappLink(voucher.row.parentPhone, voucherText(voucher));
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال لولي الأمر واتساب</span>
                  </a>
                ) : (
                  <span className="flex-1 text-[11px] text-slate-500">لا يوجد رقم ولي أمر صحيح لهذا الطالب.</span>
                );
              })()}
              <button
                onClick={() => window.print()}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1E3A5F] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base">تسجيل دفعة — {monthLabel(month)}</h3>
              </div>
              <button
                onClick={() => setPayFor(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">الطالب:</label>
                <select
                  value={payFor.studentId}
                  onChange={(e) => {
                    const r = rows.find((x) => x.studentId === e.target.value);
                    setPayFor({ ...payFor, studentId: e.target.value, amount: r ? Math.max(0, r.amountDue - r.paidAmount) : payFor.amount });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
                >
                  {rows.map((r) => (
                    <option key={r.studentId} value={r.studentId}>
                      {r.studentName}
                      {r.chargeId ? ` — المتبقي ${fmt(Math.max(0, r.amountDue - r.paidAmount))} ${sym}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">المبلغ ({sym}):</label>
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={payFor.amount || ''}
                  onChange={(e) => setPayFor({ ...payFor, amount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">طريقة الدفع:</label>
                <select
                  value={payFor.method}
                  onChange={(e) => setPayFor({ ...payFor, method: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">ملاحظة (اختياري):</label>
                <input
                  type="text"
                  value={payFor.notes}
                  onChange={(e) => setPayFor({ ...payFor, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} تسجيل وإصدار السند
                </button>
                <button
                  type="button"
                  onClick={() => setPayFor(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {chargesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F]">تجهيز رسوم {monthLabel(month)}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              يُضاف رسم هذا الشهر لـ {totals.missing} طالباً ليس لهم رسم بعد. كل طالب يأخذ رسمه من الشهر الماضي، ومن ليس له رسم سابق يأخذ المبلغ التالي:
            </p>
            <input
              type="number"
              min={0}
              value={defaultFee}
              onChange={(e) => setDefaultFee(e.target.value)}
              placeholder={`الرسم الشهري (${sym})`}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateCharges}
                disabled={busy}
                className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-60"
              >
                تجهيز
              </button>
              <button onClick={() => setChargesOpen(false)} className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl text-xs">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {remindOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F]">تذكير المتأخرين ({late.length})</h3>
            <p className="text-xs text-slate-600">اضغط على كل اسم لفتح رسالة جاهزة في واتساب.</p>
            <div className="space-y-2">
              {late.map((r) => {
                const url = whatsappLink(r.parentPhone, reminderText(r));
                return (
                  <div key={r.studentId} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="min-w-0">
                      <strong className="block truncate">{r.studentName}</strong>
                      <span className="text-rose-600 font-mono">
                        {fmt(r.amountDue - r.paidAmount)} {sym}
                      </span>
                    </div>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold shrink-0">
                        واتساب
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px] shrink-0">لا يوجد رقم</span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setRemindOpen(false)} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold">
              إغلاق
            </button>
          </div>
        </div>
      )}

      {pauseForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F]">إيقاف الاشتراك مؤقتاً</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">يبدأ الإيقاف من</label>
                <input
                  type="date"
                  value={pauseForm.from}
                  onChange={(e) => setPauseForm({ ...pauseForm, from: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
                <p className="text-[11px] text-slate-500 mt-1">اتركه فارغاً ليبدأ من اليوم.</p>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">يرجع الاشتراك بعد</label>
                <input
                  type="date"
                  value={pauseForm.until}
                  onChange={(e) => setPauseForm({ ...pauseForm, until: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
                <p className="text-[11px] text-slate-500 mt-1">آخر يوم في الإيقاف. اتركه فارغاً إذا بدك توقف لحد ما ترجعه بنفسك (مثل الإلغاء، بس بياناتك بتضل محفوظة).</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                disabled={pauseBusy}
                onClick={handlePause}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60"
              >
                {pauseBusy ? 'لحظة...' : 'أوقف الاشتراك'}
              </button>
              <button onClick={() => setPauseForm(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium text-xs cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#1E3A5F]">رفع إيصال التحويل — {receiptFor.number}</h3>
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-5 text-center space-y-2 bg-slate-50 cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600 font-medium break-all">
                {receiptForm.file ? receiptForm.file.name : 'اختر صورة الإيصال أو ملف PDF'}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptForm({ ...receiptForm, file: e.target.files?.[0] ?? null })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">طريقة التحويل</label>
                <select
                  value={receiptForm.method}
                  onChange={(e) => setReceiptForm({ ...receiptForm, method: e.target.value as 'bank_transfer' | 'e_wallet' })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="bank_transfer">حوالة بنكية</option>
                  <option value="e_wallet">محفظة إلكترونية</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">المبلغ ({sym})</label>
                <input
                  type="number"
                  min={0}
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="text-xs space-y-1">
              <label className="block text-slate-700 font-bold">رقم الحوالة أو العملية (اختياري)</label>
              <input
                type="text"
                value={receiptForm.reference}
                onChange={(e) => setReceiptForm({ ...receiptForm, reference: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleUploadReceipt}
                disabled={busy}
                className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} رفع الإيصال
              </button>
              <button onClick={() => setReceiptFor(null)} className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg font-medium text-xs cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
