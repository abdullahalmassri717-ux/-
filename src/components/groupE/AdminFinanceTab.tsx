// Platform admin › payments & invoices: confirm uploaded receipts, record payments
// by hand, change an invoice's status, issue invoices (bulk or manual), and send
// a printable invoice to the teacher on WhatsApp.
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Eye, FileText, Plus, Send, Wallet, Trash2, ListChecks } from 'lucide-react';
import { adminApi, type AdminInvoice, type AdminReceipt, type InvoiceStatus, type PaymentMethod } from '../../data/admin';
import type { PaymentAccount } from '../../data/billing';
import { getPublicSetting } from '../../lib/settings';
import { notify } from '../../lib/notify';
import { InvoiceSheet } from '../common/InvoiceSheet';
import { SaveRow } from './AdminOrgsTab';
import { useAsync, Spinner, ErrorBox, Modal, Field, inputCls, fmt, dateLabel, errText, SYM, INVOICE_LABEL, METHOD_LABEL, MODEL_UNIT } from './adminUi';

const api = adminApi();
const STATUSES: InvoiceStatus[] = ['issued', 'pending_confirmation', 'overdue', 'paid', 'void'];

type Dialog =
  | { kind: 'pay'; inv: AdminInvoice; amount: string; method: PaymentMethod; reference: string; note: string }
  | { kind: 'payments'; inv: AdminInvoice; list: AdminReceipt[] | null }
  | { kind: 'manual'; orgId: string; amount: string; note: string; dueOn: string }
  | { kind: 'bulk'; target: 'individual_teacher' | 'schools' | 'all' }
  | { kind: 'sheet'; inv: AdminInvoice };

export const AdminFinanceTab: React.FC = () => {
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const receipts = useAsync(() => api.listReceipts(scope), [scope]);
  const invoices = useAsync(() => api.listInvoices());
  const orgs = useAsync(() => api.listOrganizations());
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [review, setReview] = useState<{ r: AdminReceipt; url: string | null; note: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all' | InvoiceStatus>('open');
  const [q, setQ] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    getPublicSetting<{ accounts?: PaymentAccount[] }>('payment_accounts').then((a) => setAccounts(a?.accounts ?? []));
  }, []);

  const phoneOf = useMemo(() => new Map((orgs.data ?? []).map((o) => [o.id, o.ownerPhone])), [orgs.data]);
  const list = (invoices.data ?? []).filter(
    (i) =>
      (filter === 'all' || (filter === 'open' ? ['issued', 'overdue', 'pending_confirmation'].includes(i.status) : i.status === filter)) &&
      (!q || i.orgName.includes(q) || i.number.toLowerCase().includes(q.toLowerCase())),
  );
  const openTotal = (invoices.data ?? [])
    .filter((i) => ['issued', 'overdue', 'pending_confirmation'].includes(i.status))
    .reduce((n, i) => n + Math.max(0, i.amount - i.paidAmount), 0);

  const reloadAll = () => {
    receipts.reload();
    invoices.reload();
    orgs.reload();
  };
  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      setDialog(null);
      reloadAll();
      notify(done);
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const openReceipt = async (r: AdminReceipt) => {
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
      reloadAll();
      notify(status === 'confirmed' ? 'تم تأكيد الدفعة.' : 'تم رفض الإيصال.');
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const openPayments = async (inv: AdminInvoice) => {
    setDialog({ kind: 'payments', inv, list: null });
    try {
      const list = await api.listInvoicePayments(inv.id);
      setDialog({ kind: 'payments', inv, list });
    } catch (e) {
      notify(errText(e, 'تعذّر تحميل الدفعات.'));
      setDialog(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ receipts */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">إيصالات التحويل</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['pending', 'all'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`px-3 py-1 rounded-lg font-bold ${scope === s ? 'bg-white shadow-2xs' : 'text-slate-600'}`}>
                {s === 'pending' ? 'بانتظار التأكيد' : 'كل الدفعات'}
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
                  <th className="p-3 text-center">المبلغ</th>
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
                        {fmt(r.invoiceAmount, 2)} {SYM}
                      </span>
                    </td>
                    <td className={`p-3 text-center font-mono font-bold ${r.amount < r.invoiceAmount ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {fmt(r.amount, 2)} {SYM}
                    </td>
                    <td className="p-3 text-slate-600">
                      {METHOD_LABEL[r.method] ?? r.method}
                      {r.recordedByAdmin && <span className="text-[10px] text-slate-400"> · سجّلها المدير</span>}
                      {r.reference && <span className="block font-mono text-[10px]">{r.reference}</span>}
                    </td>
                    <td className="p-3 text-center">{r.status === 'pending' ? 'بانتظار التأكيد' : r.status === 'confirmed' ? 'مؤكدة' : 'مرفوضة'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => openReceipt(r)} className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1">
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

      {/* ------------------------------------------------ invoices */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">الفواتير</h3>
            <p className="text-[11px] text-slate-500">
              المتبقي على كل الفواتير المفتوحة: <strong className="font-mono text-amber-700">{fmt(openTotal, 2)} {SYM}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDialog({ kind: 'bulk', target: 'individual_teacher' })} className="bg-[#1E3A5F] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> إصدار فواتير الشهر
            </button>
            <button
              onClick={() => setDialog({ kind: 'manual', orgId: '', amount: '', note: '', dueOn: '' })}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> فاتورة يدوية
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالجهة أو رقم الفاتورة" className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs w-56 max-w-full" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-2 py-1.5 border border-slate-300 rounded-xl text-xs">
            <option value="open">غير مدفوعة</option>
            <option value="all">الكل</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_LABEL[s].t}
              </option>
            ))}
          </select>
        </div>

        {invoices.error ? (
          <ErrorBox text={invoices.error} />
        ) : !invoices.data ? (
          <Spinner />
        ) : !list.length ? (
          <p className="text-xs text-slate-500">لا توجد فواتير هنا. أصدرها من زر «إصدار فواتير الشهر» أو من تبويب «الجهات».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[820px]">
              <thead className="bg-[#F7F8FA] text-slate-700 font-bold">
                <tr>
                  <th className="p-3">الرقم / الجهة</th>
                  <th className="p-3">الفترة</th>
                  <th className="p-3 text-center">الاستخدام</th>
                  <th className="p-3 text-center">المبلغ</th>
                  <th className="p-3 text-center">المدفوع</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((i) => (
                  <tr key={i.id} className="align-top">
                    <td className="p-3">
                      <span className="font-mono font-bold block">{i.number}</span>
                      <span className="text-slate-700">{i.orgName}</span>
                      {i.notes && <span className="block text-[10px] text-slate-500">{i.notes}</span>}
                    </td>
                    <td className="p-3 text-[11px]">
                      {i.periodStart === i.periodEnd ? dateLabel(i.periodStart) : `${dateLabel(i.periodStart)} – ${dateLabel(i.periodEnd)}`}
                      {i.dueOn && i.status !== 'paid' && <span className="block text-slate-500">الاستحقاق {dateLabel(i.dueOn)}</span>}
                    </td>
                    <td className="p-3 text-center text-[11px] tabular-nums">
                      {i.pricingModel && i.units ? `${i.units} ${MODEL_UNIT[i.pricingModel]} × ${fmt(i.unitPrice, 2)}` : '—'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {fmt(i.amount, 2)} {SYM}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={i.paidAmount >= i.amount ? 'text-emerald-700 font-bold' : i.paidAmount > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>{fmt(i.paidAmount, 2)}</span>
                      {i.paidAmount > 0 && i.paidAmount < i.amount && <span className="block text-[10px] text-rose-600">باقي {fmt(i.amount - i.paidAmount, 2)}</span>}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={i.status}
                        disabled={busy}
                        onChange={(e) => run(() => api.setInvoiceStatus(i.id, e.target.value as InvoiceStatus), 'تم تغيير حالة الفاتورة.')}
                        className={`px-2 py-1 rounded-full text-[11px] font-bold border-0 ${INVOICE_LABEL[i.status].c}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {INVOICE_LABEL[s].t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5 font-bold">
                        {i.status !== 'void' && i.status !== 'paid' && (
                          <button
                            onClick={() =>
                              setDialog({ kind: 'pay', inv: i, amount: String(Math.max(0, Math.round((i.amount - i.paidAmount) * 100) / 100)), method: 'bank_transfer', reference: '', note: '' })
                            }
                            className="text-emerald-700 flex items-center gap-1"
                          >
                            <Wallet className="w-3.5 h-3.5" /> إضافة دفعة
                          </button>
                        )}
                        <button onClick={() => setDialog({ kind: 'sheet', inv: i })} className="text-blue-700 flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> عرض وإرسال
                        </button>
                        <button onClick={() => openPayments(i)} className="text-slate-600 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> الدفعات
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ dialogs */}
      {review && (
        <Modal title={`إيصال ${review.r.orgName} · ${review.r.invoiceNumber}`} onClose={() => setReview(null)}>
          {review.url ? (
            review.r.storagePath?.endsWith('.pdf') ? (
              <a href={review.url} target="_blank" rel="noreferrer" className="text-blue-700 font-bold flex items-center gap-1">
                <FileText className="w-4 h-4" /> فتح ملف الإيصال (PDF)
              </a>
            ) : (
              <img src={review.url} alt="صورة الإيصال" className="w-full rounded-xl border border-slate-200" />
            )
          ) : (
            <p className="text-slate-500">لا توجد صورة{review.r.recordedByAdmin ? ' (دفعة سجّلها المدير يدوياً)' : ''}.</p>
          )}
          <div className="space-y-1">
            <div>
              المبلغ: <strong className="font-mono">{fmt(review.r.amount, 2)}</strong> من أصل <strong className="font-mono">{fmt(review.r.invoiceAmount, 2)}</strong> {SYM}
            </div>
            {review.r.reference && <div>المرجع: {review.r.reference}</div>}
            {review.r.note && <div>ملاحظة: {review.r.note}</div>}
          </div>
          {review.r.status === 'pending' && (
            <>
              <input
                value={review.note}
                onChange={(e) => setReview({ ...review, note: e.target.value })}
                placeholder="ملاحظة (مطلوبة عند الرفض)"
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              />
              <p className="text-[11px] text-slate-500">إذا كان المبلغ أقل من الفاتورة، تُسجَّل الدفعة ويبقى الباقي مستحقاً.</p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => decide('confirmed')}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" /> تأكيد الدفعة
                </button>
                <button
                  disabled={busy}
                  onClick={() => decide('rejected')}
                  className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" /> رفض
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {dialog?.kind === 'pay' && (
        <Modal title={`إضافة دفعة · ${dialog.inv.number}`} onClose={() => setDialog(null)}>
          <p className="text-slate-500">
            {dialog.inv.orgName} · المبلغ {fmt(dialog.inv.amount, 2)} {SYM}
            {dialog.inv.paidAmount > 0 ? ` · مدفوع ${fmt(dialog.inv.paidAmount, 2)}` : ''}. الدفعة تُسجَّل مؤكدة، والفاتورة تصبح «مدفوعة» عندما يكتمل المبلغ.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المبلغ">
              <input type="number" min={0} value={dialog.amount} onChange={(e) => setDialog({ ...dialog, amount: e.target.value })} className={`${inputCls} font-mono`} />
            </Field>
            <Field label="طريقة الدفع">
              <select value={dialog.method} onChange={(e) => setDialog({ ...dialog, method: e.target.value as PaymentMethod })} className={inputCls}>
                {(['bank_transfer', 'e_wallet', 'cash', 'other'] as const).map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رقم الحوالة / المرجع (اختياري)" className="col-span-2">
              <input value={dialog.reference} onChange={(e) => setDialog({ ...dialog, reference: e.target.value })} dir="ltr" className={`${inputCls} font-mono`} />
            </Field>
            <Field label="ملاحظة (اختياري)" className="col-span-2">
              <input value={dialog.note} onChange={(e) => setDialog({ ...dialog, note: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <SaveRow
            busy={busy}
            label="تسجيل الدفعة"
            onCancel={() => setDialog(null)}
            onSave={() => {
              const amount = Number(dialog.amount);
              if (!Number.isFinite(amount) || amount <= 0) return notify('اكتب مبلغاً أكبر من صفر.');
              void run(() => api.recordPayment(dialog.inv.id, { amount, method: dialog.method, reference: dialog.reference, note: dialog.note }), 'سُجّلت الدفعة.');
            }}
          />
        </Modal>
      )}

      {dialog?.kind === 'payments' && (
        <Modal title={`دفعات ${dialog.inv.number}`} onClose={() => setDialog(null)}>
          {!dialog.list ? (
            <Spinner />
          ) : !dialog.list.length ? (
            <p className="text-slate-500">لا توجد دفعات على هذه الفاتورة.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {dialog.list.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <strong className="font-mono">
                      {fmt(p.amount, 2)} {SYM}
                    </strong>{' '}
                    · {METHOD_LABEL[p.method] ?? p.method} · {p.status === 'confirmed' ? 'مؤكدة' : p.status === 'pending' ? 'بانتظار التأكيد' : 'مرفوضة'}
                    <span className="block text-[11px] text-slate-500">
                      {dateLabel(p.createdAt)}
                      {p.reference ? ` · ${p.reference}` : ''}
                      {p.recordedByAdmin ? ' · سجّلها المدير' : ''}
                    </span>
                  </div>
                  {p.recordedByAdmin && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirmDelete !== p.id) return setConfirmDelete(p.id);
                        setConfirmDelete(null);
                        void run(() => api.deletePayment(p.id), 'حُذفت الدفعة، وأُعيد حساب حالة الفاتورة.');
                      }}
                      className="text-rose-600 font-bold flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {confirmDelete === p.id ? 'اضغط للتأكيد' : 'حذف'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {dialog?.kind === 'manual' && (
        <Modal title="فاتورة يدوية" onClose={() => setDialog(null)}>
          <p className="text-slate-500">لمبلغ متفق عليه خارج الحساب التلقائي (مثل عقد مدرسة أو رسوم إضافية).</p>
          <Field label="الجهة">
            <select value={dialog.orgId} onChange={(e) => setDialog({ ...dialog, orgId: e.target.value })} className={inputCls}>
              <option value="">اختر الجهة…</option>
              {(orgs.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المبلغ">
              <input type="number" min={0} value={dialog.amount} onChange={(e) => setDialog({ ...dialog, amount: e.target.value })} className={`${inputCls} font-mono`} />
            </Field>
            <Field label="آخر موعد للدفع">
              <input type="date" value={dialog.dueOn} onChange={(e) => setDialog({ ...dialog, dueOn: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="البيان">
            <input value={dialog.note} onChange={(e) => setDialog({ ...dialog, note: e.target.value })} placeholder="مثال: الدفعة الأولى من عقد العام الدراسي" className={inputCls} />
          </Field>
          <SaveRow
            busy={busy}
            label="إنشاء الفاتورة"
            onCancel={() => setDialog(null)}
            onSave={() => {
              const amount = Number(dialog.amount);
              if (!dialog.orgId) return notify('اختر الجهة.');
              if (!Number.isFinite(amount) || amount <= 0) return notify('اكتب مبلغاً أكبر من صفر.');
              if (!dialog.note.trim()) return notify('اكتب بيان الفاتورة.');
              void run(() => api.createInvoice(dialog.orgId, amount, dialog.note, dialog.dueOn || null), 'أُنشئت الفاتورة.');
            }}
          />
        </Modal>
      )}

      {dialog?.kind === 'bulk' && (
        <Modal title="إصدار فواتير الشهر" onClose={() => setDialog(null)}>
          <p className="text-slate-600 leading-relaxed">
            تصدر فاتورة لكل جهة مفعّلة حسب استخدامها الفعلي (عدد الطلاب المسجّلين أو عدد الأوراق، حسب باقتها). تُتخطّى الجهات التي ما زالت في الفترة التجريبية، والتي صدرت لها فاتورة هذا الشهر، والتي استخدامها صفر.
          </p>
          <Field label="لمن">
            <select value={dialog.target} onChange={(e) => setDialog({ ...dialog, target: e.target.value as typeof dialog.target })} className={inputCls}>
              <option value="individual_teacher">المدرّسون</option>
              <option value="schools">المدارس والمراكز</option>
              <option value="all">الكل</option>
            </select>
          </Field>
          <SaveRow
            busy={busy}
            label="إصدار"
            onCancel={() => setDialog(null)}
            onSave={async () => {
              setBusy(true);
              try {
                const n = await api.issueInvoicesBulk(dialog.target);
                setDialog(null);
                reloadAll();
                setFilter('issued');
                notify(n ? `صدرت ${n} فاتورة. أرسلها لأصحابها من زر «عرض وإرسال».` : 'لا توجد جهات تحتاج فاتورة الآن.');
              } catch (e) {
                notify(errText(e, 'تعذّر إصدار الفواتير.'));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Modal>
      )}

      {dialog?.kind === 'sheet' && (
        <InvoiceSheet invoice={dialog.inv} sym={SYM} accounts={accounts} phone={phoneOf.get(dialog.inv.orgId) ?? ''} onClose={() => setDialog(null)} />
      )}
    </div>
  );
};
