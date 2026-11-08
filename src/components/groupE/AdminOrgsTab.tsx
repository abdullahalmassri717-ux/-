// Platform admin › organizations: approve new sign-ups, disable, edit, change plan,
// issue an invoice from real usage, delete, or add an organization directly.
import React, { useState } from 'react';
import { CheckCircle2, Ban, Edit, Layers, FileText, Trash2, Plus, RotateCcw } from 'lucide-react';
import { adminApi, type AdminOrg, type AdminPlan, type UsageQuote } from '../../data/admin';
import { toInternationalPhone } from '../../lib/phone';
import { notify } from '../../lib/notify';
import {
  useAsync,
  Spinner,
  ErrorBox,
  Modal,
  Field,
  inputCls,
  fmt,
  dateLabel,
  errText,
  SYM,
  KIND_LABEL,
  SUB_LABEL,
  ORG_STATUS,
  MODEL_UNIT,
} from './adminUi';

const api = adminApi();

type Dialog =
  | { kind: 'edit'; org: AdminOrg; name: string; orgKind: AdminOrg['kind']; region: string }
  | { kind: 'plan'; org: AdminOrg; planId: string }
  | { kind: 'disable'; org: AdminOrg; note: string }
  | { kind: 'delete'; org: AdminOrg; confirm: string }
  | { kind: 'invoice'; org: AdminOrg; quote: UsageQuote | null; amount: string; note: string }
  | { kind: 'new'; name: string; orgKind: AdminOrg['kind']; region: string; ownerName: string; ownerPhone: string; planId: string };

export const AdminOrgsTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const orgs = useAsync(() => api.listOrganizations());
  const plans = useAsync(() => api.listPlans());
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'individual_teacher' | 'school'>('all');
  const [status, setStatus] = useState<'all' | AdminOrg['status']>('all');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);

  if (orgs.error) return <ErrorBox text={orgs.error} />;
  if (!orgs.data) return <Spinner />;
  const all = orgs.data;
  const pendingCount = all.filter((o) => o.status === 'pending').length;
  const list = all.filter(
    (o) =>
      (kind === 'all' || (kind === 'school' ? o.kind !== 'individual_teacher' : o.kind === kind)) &&
      (status === 'all' || o.status === status) &&
      (!q || o.name.includes(q) || o.ownerName.includes(q) || o.ownerPhone.includes(q)),
  );
  const activePlans = (plans.data ?? []).filter((p) => p.isActive);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      setDialog(null);
      orgs.reload();
      onChanged?.();
      notify(done);
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = async (org: AdminOrg) => {
    try {
      const quote = await api.invoicePreview(org.id);
      setDialog({ kind: 'invoice', org, quote, amount: quote ? String(quote.amount) : '', note: '' });
    } catch (e) {
      notify(errText(e, 'تعذّر حساب الفاتورة.'));
    }
  };

  const approve = (o: AdminOrg) => run(() => api.setOrgStatus(o.id, 'active'), `تمت الموافقة على «${o.name}». يستطيع الآن الدخول للوحة التحكم.`);

  return (
    <div className="space-y-4">
      {pendingCount > 0 && status !== 'pending' && (
        <button
          onClick={() => setStatus('pending')}
          className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold text-right"
        >
          {pendingCount} {pendingCount === 1 ? 'جهة جديدة تنتظر' : 'جهات جديدة تنتظر'} موافقتك قبل أن تدخل للوحة التحكم ← عرضها
        </button>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
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
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="px-2 py-1.5 border border-slate-300 rounded-xl text-xs">
            <option value="all">كل الحالات</option>
            <option value="pending">بانتظار الموافقة</option>
            <option value="active">مفعّلة</option>
            <option value="disabled">معطّلة</option>
          </select>
          <button
            onClick={() => setDialog({ kind: 'new', name: '', orgKind: 'individual_teacher', region: '', ownerName: '', ownerPhone: '', planId: '' })}
            className="ms-auto bg-[#1E3A5F] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> إضافة جهة
          </button>
        </div>

        {!list.length ? (
          <p className="text-xs text-slate-500">لا توجد جهات بهذا البحث.</p>
        ) : (
          <div className="space-y-3">
            {list.map((o) => (
              <div key={o.id} className={`border rounded-2xl p-3 sm:p-4 space-y-3 ${o.status === 'pending' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-slate-900">{o.name}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ORG_STATUS[o.status].c}`}>{ORG_STATUS[o.status].t}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {KIND_LABEL[o.kind]}
                      {o.region ? ` · ${o.region}` : ''}
                      {o.teachers ? ` · ${o.teachers} معلم` : ''} · سُجّلت {dateLabel(o.createdAt)}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      المالك: {o.ownerName || '—'}{' '}
                      <span className="font-mono" dir="ltr">
                        {o.ownerPhone}
                      </span>
                      {o.ownerInvited ? ' (مدعو، لم يسجّل بعد)' : ''}
                    </span>
                    {o.statusNote && o.status === 'disabled' && <span className="text-[11px] text-rose-700 block">سبب التعطيل: {o.statusNote}</span>}
                  </div>
                  {o.status === 'pending' && (
                    <button
                      disabled={busy}
                      onClick={() => approve(o)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" /> موافقة وتفعيل
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500 block">الباقة</span>
                    <strong>{o.planName || '—'}</strong>
                    <span className="block text-slate-500">
                      {o.subscriptionStatus ? SUB_LABEL[o.subscriptionStatus] : 'بلا اشتراك'}
                      {o.subscriptionStatus === 'trial' && o.trialEndsOn ? ` حتى ${dateLabel(o.trialEndsOn)}` : ''}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500 block">طلاب مسجّلون</span>
                    <strong className="font-mono">{o.activeStudents}</strong>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500 block">أوراق 30 يوماً</span>
                    <strong className="font-mono">{o.papers30d}</strong>
                    <span className="block text-slate-500">تكلفة AI ${fmt(o.gradingCost30d, 2)}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500 block">غير مسدد</span>
                    <strong className={`font-mono ${o.unpaidAmount ? 'text-amber-700' : 'text-slate-400'}`}>
                      {fmt(o.unpaidAmount, 2)} {SYM}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
                  <button onClick={() => setDialog({ kind: 'edit', org: o, name: o.name, orgKind: o.kind, region: o.region })} className="text-blue-700 flex items-center gap-1">
                    <Edit className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button onClick={() => setDialog({ kind: 'plan', org: o, planId: o.planId ?? '' })} className="text-blue-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> تغيير الباقة
                  </button>
                  {o.subscriptionStatus && (
                    <button onClick={() => openInvoice(o)} className="text-blue-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> إصدار فاتورة
                    </button>
                  )}
                  {o.status === 'active' ? (
                    <button onClick={() => setDialog({ kind: 'disable', org: o, note: '' })} className="text-amber-700 flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" /> تعطيل
                    </button>
                  ) : o.status === 'disabled' ? (
                    <button
                      disabled={busy}
                      onClick={() => run(() => api.setOrgStatus(o.id, 'active'), `أُعيد تفعيل «${o.name}».`)}
                      className="text-emerald-700 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> إعادة التفعيل
                    </button>
                  ) : (
                    <button onClick={() => setDialog({ kind: 'disable', org: o, note: '' })} className="text-amber-700 flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" /> رفض الطلب
                    </button>
                  )}
                  <button onClick={() => setDialog({ kind: 'delete', org: o, confirm: '' })} className="text-rose-600 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog?.kind === 'edit' && (
        <Modal title={`تعديل «${dialog.org.name}»`} onClose={() => setDialog(null)}>
          <Field label="الاسم">
            <input value={dialog.name} onChange={(e) => setDialog({ ...dialog, name: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="النوع">
              <select value={dialog.orgKind} onChange={(e) => setDialog({ ...dialog, orgKind: e.target.value as AdminOrg['kind'] })} className={inputCls}>
                <option value="individual_teacher">مدرّس</option>
                <option value="school">مدرسة</option>
                <option value="learning_center">مركز</option>
              </select>
            </Field>
            <Field label="المنطقة">
              <input value={dialog.region} onChange={(e) => setDialog({ ...dialog, region: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <SaveRow
            busy={busy}
            onCancel={() => setDialog(null)}
            onSave={() => {
              if (dialog.name.trim().length < 2) return notify('اكتب اسم الجهة.');
              void run(() => api.updateOrg(dialog.org.id, { name: dialog.name.trim(), kind: dialog.orgKind, region: dialog.region }), 'حُفظت بيانات الجهة.');
            }}
          />
        </Modal>
      )}

      {dialog?.kind === 'plan' && (
        <Modal title={`تغيير باقة «${dialog.org.name}»`} onClose={() => setDialog(null)}>
          <p className="text-slate-500">السعر الجديد يُطبَّق على الفواتير القادمة. الفواتير السابقة لا تتغير.</p>
          <PlanPicker plans={activePlans} value={dialog.planId} onChange={(planId) => setDialog({ ...dialog, planId })} />
          <SaveRow
            busy={busy}
            onCancel={() => setDialog(null)}
            onSave={() => {
              if (!dialog.planId) return notify('اختر باقة.');
              void run(() => api.changePlan(dialog.org.id, dialog.planId), 'تم تغيير الباقة.');
            }}
          />
        </Modal>
      )}

      {dialog?.kind === 'disable' && (
        <Modal title={dialog.org.status === 'pending' ? `رفض طلب «${dialog.org.name}»` : `تعطيل «${dialog.org.name}»`} onClose={() => setDialog(null)}>
          <p className="text-slate-600 leading-relaxed">
            لن يستطيع أصحاب الجهة ومعلموها الدخول لبياناتها، وتتوقف روابط تسليم الطلاب. البيانات لا تُحذف، ويمكنك إعادة التفعيل في أي وقت.
          </p>
          <Field label="السبب (يظهر لصاحب الحساب)">
            <input value={dialog.note} onChange={(e) => setDialog({ ...dialog, note: e.target.value })} placeholder="مثال: تأخر دفع الاشتراك" className={inputCls} />
          </Field>
          <SaveRow
            busy={busy}
            danger
            label={dialog.org.status === 'pending' ? 'رفض' : 'تعطيل'}
            onCancel={() => setDialog(null)}
            onSave={() => void run(() => api.setOrgStatus(dialog.org.id, 'disabled', dialog.note), `تم تعطيل «${dialog.org.name}».`)}
          />
        </Modal>
      )}

      {dialog?.kind === 'delete' && (
        <Modal title={`حذف «${dialog.org.name}» نهائياً`} onClose={() => setDialog(null)}>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 leading-relaxed">
            سيُحذف كل شيء يخص هذه الجهة: الطلاب، المجموعات، الامتحانات، الدرجات، الفواتير والعضويات. <strong>لا يمكن التراجع عن الحذف.</strong> إن كنت تريد إيقافها فقط، استخدم «تعطيل».
          </div>
          <Field label={`للتأكيد اكتب اسم الجهة: ${dialog.org.name}`}>
            <input value={dialog.confirm} onChange={(e) => setDialog({ ...dialog, confirm: e.target.value })} className={inputCls} />
          </Field>
          <SaveRow
            busy={busy || dialog.confirm.trim() !== dialog.org.name.trim()}
            danger
            label="حذف نهائي"
            onCancel={() => setDialog(null)}
            onSave={() => void run(() => api.deleteOrg(dialog.org.id, dialog.confirm), `حُذفت «${dialog.org.name}».`)}
          />
        </Modal>
      )}

      {dialog?.kind === 'invoice' && (
        <Modal title={`فاتورة «${dialog.org.name}»`} onClose={() => setDialog(null)}>
          {!dialog.quote ? (
            <p className="text-slate-500">لا يوجد اشتراك لهذه الجهة. اختر لها باقة أولاً.</p>
          ) : (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div>
                  الباقة: <strong>{dialog.quote.planName}</strong>
                </div>
                <div>
                  الفترة: {dateLabel(dialog.quote.periodStart)} – {dateLabel(dialog.quote.periodEnd)}
                </div>
                <div>
                  الاستخدام الفعلي:{' '}
                  <strong className="font-mono">
                    {dialog.quote.units} {MODEL_UNIT[dialog.quote.pricingModel]} × {fmt(dialog.quote.unitPrice, 2)} {SYM}
                  </strong>
                  {dialog.quote.billingCycle === 'yearly' ? ' (مقسوم على عدد الدفعات)' : ''}
                </div>
                <div className="text-sm">
                  المبلغ المحسوب:{' '}
                  <strong className="font-mono text-[#1E3A5F]">
                    {fmt(dialog.quote.amount, 2)} {SYM}
                  </strong>
                </div>
              </div>
              <Field label="مبلغ الفاتورة (يمكنك تعديله)">
                <input type="number" min={0} value={dialog.amount} onChange={(e) => setDialog({ ...dialog, amount: e.target.value })} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="ملاحظة على الفاتورة (اختياري)">
                <input value={dialog.note} onChange={(e) => setDialog({ ...dialog, note: e.target.value })} placeholder="مثال: خصم 10% لأول شهر" className={inputCls} />
              </Field>
              <SaveRow
                busy={busy}
                label="إصدار الفاتورة"
                onCancel={() => setDialog(null)}
                onSave={() => {
                  const amount = Number(dialog.amount);
                  if (!Number.isFinite(amount) || amount < 0) return notify('اكتب مبلغاً صحيحاً.');
                  void run(
                    () => api.issueInvoice(dialog.org.id, amount === dialog.quote!.amount ? undefined : amount, dialog.note),
                    `صدرت فاتورة لـ «${dialog.org.name}». تجدها في «المدفوعات والفواتير» لترسلها له.`,
                  );
                }}
              />
            </>
          )}
        </Modal>
      )}

      {dialog?.kind === 'new' && (
        <Modal title="إضافة جهة جديدة" onClose={() => setDialog(null)}>
          <p className="text-slate-500 leading-relaxed">
            الجهة التي تضيفها أنت تكون مفعّلة مباشرة. صاحبها يدخل برقم واتساب هذا؛ إن لم يكن له حساب بعد، تصله الجهة تلقائياً عند أول تسجيل دخول.
          </p>
          <Field label="اسم الجهة">
            <input value={dialog.name} onChange={(e) => setDialog({ ...dialog, name: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="النوع">
              <select value={dialog.orgKind} onChange={(e) => setDialog({ ...dialog, orgKind: e.target.value as AdminOrg['kind'] })} className={inputCls}>
                <option value="individual_teacher">مدرّس</option>
                <option value="school">مدرسة</option>
                <option value="learning_center">مركز</option>
              </select>
            </Field>
            <Field label="المنطقة">
              <input value={dialog.region} onChange={(e) => setDialog({ ...dialog, region: e.target.value })} className={inputCls} />
            </Field>
            <Field label="اسم المالك">
              <input value={dialog.ownerName} onChange={(e) => setDialog({ ...dialog, ownerName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="واتساب المالك">
              <input value={dialog.ownerPhone} onChange={(e) => setDialog({ ...dialog, ownerPhone: e.target.value })} placeholder="0599123456" dir="ltr" className={`${inputCls} font-mono`} />
            </Field>
          </div>
          <span className="font-bold text-slate-700 block">الباقة (اختياري، وإلا تبدأ بالفترة التجريبية)</span>
          <PlanPicker plans={activePlans} value={dialog.planId} onChange={(planId) => setDialog({ ...dialog, planId })} allowNone />
          <SaveRow
            busy={busy}
            label="إضافة"
            onCancel={() => setDialog(null)}
            onSave={() => {
              const phone = toInternationalPhone(dialog.ownerPhone);
              if (dialog.name.trim().length < 2) return notify('اكتب اسم الجهة.');
              if (!phone) return notify('اكتب رقم واتساب صحيحاً للمالك، مثال: 0599123456');
              void run(
                () =>
                  api.createOrg({
                    name: dialog.name.trim(),
                    kind: dialog.orgKind,
                    region: dialog.region.trim(),
                    ownerName: dialog.ownerName.trim(),
                    ownerPhone: phone,
                    planId: dialog.planId || null,
                  }),
                `أُضيفت «${dialog.name.trim()}».`,
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
};

const PlanPicker: React.FC<{ plans: AdminPlan[]; value: string; onChange: (id: string) => void; allowNone?: boolean }> = ({ plans, value, onChange, allowNone }) => (
  <div className="space-y-2">
    {allowNone && (
      <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer ${!value ? 'border-[#1E3A5F] bg-blue-50/40' : 'border-slate-200'}`}>
        <input type="radio" checked={!value} onChange={() => onChange('')} />
        <span>الباقة التلقائية مع الفترة التجريبية</span>
      </label>
    )}
    {plans.map((p) => (
      <label key={p.id} className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer ${value === p.id ? 'border-[#1E3A5F] bg-blue-50/40' : 'border-slate-200'}`}>
        <input type="radio" checked={value === p.id} onChange={() => onChange(p.id)} />
        <span className="min-w-0">
          <strong>{p.name}</strong>
          <span className="block text-[11px] text-slate-500">
            {fmt(p.pricePerStudent, 2)} {SYM} لكل {MODEL_UNIT[p.pricingModel]}
            {p.tiers.length ? ' (بشرائح)' : ''} · {p.billingCycle === 'monthly' ? 'شهري' : 'سنوي'}
          </span>
        </span>
      </label>
    ))}
  </div>
);

export const SaveRow: React.FC<{ busy: boolean; onSave: () => void; onCancel: () => void; label?: string; danger?: boolean }> = ({ busy, onSave, onCancel, label = 'حفظ', danger }) => (
  <div className="flex gap-2 pt-2">
    <button
      disabled={busy}
      onClick={onSave}
      className={`flex-1 ${danger ? 'bg-rose-600' : 'bg-[#1E3A5F]'} text-white py-2.5 rounded-xl font-bold disabled:opacity-50`}
    >
      {label}
    </button>
    <button onClick={onCancel} className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl">
      إلغاء
    </button>
  </div>
);
