// Platform admin › plans & prices. Pricing is usage-based: per registered student
// or per graded paper, with optional volume brackets. No minimum charge.
import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { adminApi, unitPriceFor, type AdminPlan, type PriceTier } from '../../data/admin';
import { notify } from '../../lib/notify';
import { SaveRow } from './AdminOrgsTab';
import { useAsync, Spinner, ErrorBox, Modal, Field, inputCls, fmt, errText, SYM, MODEL_LABEL, MODEL_UNIT } from './adminUi';

const api = adminApi();
type Draft = Omit<AdminPlan, 'id'> & { id?: string };

const emptyPlan = (): Draft => ({
  slug: null,
  name: '',
  target: 'teachers',
  billingCycle: 'monthly',
  pricingModel: 'per_student',
  pricePerStudent: 0,
  tiers: [],
  minimumCharge: 0,
  installments: 1,
  features: [],
  isActive: true,
  isPublic: true,
  isPopular: false,
  notes: '',
});

/** "حتى 50: 5 ₪ · 51–200: 4 ₪ · أكثر: 3 ₪" */
export function tiersText(tiers: PriceTier[], unit: string): string {
  const sorted = [...tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  let from = 1;
  return sorted
    .map((t) => {
      const label = t.upTo === null ? `${from} ${unit} فأكثر` : from === 1 ? `حتى ${t.upTo}` : `${from}–${t.upTo}`;
      if (t.upTo !== null) from = t.upTo + 1;
      return `${label}: ${fmt(t.price, 2)} ${SYM}`;
    })
    .join(' · ');
}

export const AdminPlansTab: React.FC = () => {
  const plans = useAsync(() => api.listPlans());
  const [edit, setEdit] = useState<Draft | null>(null);
  const [featuresText, setFeaturesText] = useState('');
  const [busy, setBusy] = useState(false);
  const [tryUnits, setTryUnits] = useState(30);
  if (plans.error) return <ErrorBox text={plans.error} />;
  if (!plans.data) return <Spinner />;

  const startEdit = (p: Draft) => {
    setEdit({ ...p, tiers: p.tiers.map((t) => ({ ...t })) });
    setFeaturesText(p.features.join('\n'));
  };
  const setTier = (i: number, patch: Partial<PriceTier>) => edit && setEdit({ ...edit, tiers: edit.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim()) return notify('اكتب اسم الباقة.');
    const tiers = edit.tiers.filter((t) => Number.isFinite(t.price) && t.price >= 0);
    const bounded = tiers.filter((t) => t.upTo !== null).map((t) => t.upTo as number);
    if (new Set(bounded).size !== bounded.length || bounded.some((n) => !Number.isInteger(n) || n < 1)) return notify('حدود الشرائح يجب أن تكون أعداداً مختلفة أكبر من صفر.');
    if (tiers.filter((t) => t.upTo === null).length > 1) return notify('شريحة واحدة فقط تكون «فأكثر».');
    setBusy(true);
    try {
      await api.savePlan({ ...edit, tiers, minimumCharge: 0, features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean) });
      setEdit(null);
      plans.reload();
      notify('حُفظت الباقة. الأسعار الجديدة تظهر في صفحة الأسعار وتُطبَّق على الفواتير القادمة.');
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const preview = edit ? unitPriceFor(edit.tiers, edit.pricePerStudent, tryUnits) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-xs text-slate-500 max-w-xl">
          الدفع حسب الاستخدام الفعلي: إما لكل طالب يسجّله المدرّس، أو لكل ورقة تُصحَّح، من طالب واحد إلى أي عدد. يمكنك إضافة شرائح (سعر أقل للأعداد الكبيرة). لا يوجد حد أدنى.
        </p>
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
              <button onClick={() => startEdit(p)} className="text-blue-700" aria-label="تعديل">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <div className="text-2xl font-black font-mono text-[#1E3A5F]">
              {fmt(p.pricePerStudent, 2)} <span className="text-xs">{SYM} / {MODEL_UNIT[p.pricingModel]}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {MODEL_LABEL[p.pricingModel]} · {p.installments > 1 ? `${p.installments} دفعات` : 'دفعة واحدة'}
            </div>
            {p.tiers.length > 0 && <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2">{tiersText(p.tiers, MODEL_UNIT[p.pricingModel])}</div>}
            <ul className="text-xs text-slate-700 space-y-1 list-disc pr-4">
              {p.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل الباقة' : 'باقة جديدة'} onClose={() => setEdit(null)} wide>
          <Field label="الاسم">
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label="لمن">
              <select value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value as AdminPlan['target'] })} className={inputCls}>
                <option value="teachers">المدرّسين</option>
                <option value="schools">المدارس والمراكز</option>
                <option value="enterprise">مؤسسات</option>
              </select>
            </Field>
            <Field label="الدورة">
              <select value={edit.billingCycle} onChange={(e) => setEdit({ ...edit, billingCycle: e.target.value as AdminPlan['billingCycle'] })} className={inputCls}>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </Field>
            <Field label="عدد الدفعات">
              <input type="number" min={1} value={edit.installments} onChange={(e) => setEdit({ ...edit, installments: Math.max(1, Number(e.target.value) || 1) })} className={`${inputCls} font-mono`} />
            </Field>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-800 block">طريقة التسعير</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['per_student', 'per_paper'] as const).map((m) => (
                <label key={m} className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer bg-white ${edit.pricingModel === m ? 'border-[#1E3A5F]' : 'border-slate-200'}`}>
                  <input type="radio" checked={edit.pricingModel === m} onChange={() => setEdit({ ...edit, pricingModel: m })} className="mt-0.5" />
                  <span>
                    <strong>{MODEL_LABEL[m]}</strong>
                    <span className="block text-[11px] text-slate-500">
                      {m === 'per_student' ? 'عدد الطلاب الذين سجّلهم المدرّس في مجموعاته وقت الفاتورة.' : 'عدد الأوراق التي رُفعت للتصحيح منذ الفاتورة السابقة.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Field label={`السعر لكل ${MODEL_UNIT[edit.pricingModel]} (${SYM})`}>
              <input type="number" min={0} step="0.01" value={edit.pricePerStudent} onChange={(e) => setEdit({ ...edit, pricePerStudent: Number(e.target.value) })} className={`${inputCls} font-mono`} />
            </Field>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 block">شرائح حسب العدد (اختياري)</span>
              <p className="text-[11px] text-slate-500">مثال: حتى 50 طالباً بـ 5، وحتى 200 بـ 4، وأكثر من ذلك بـ 3. العدد كله يُحسب بسعر الشريحة التي يقع فيها.</p>
              {edit.tiers.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span>حتى</span>
                  <input
                    type="number"
                    min={1}
                    value={t.upTo ?? ''}
                    placeholder="فأكثر"
                    onChange={(e) => setTier(i, { upTo: e.target.value === '' ? null : Math.max(1, Math.floor(Number(e.target.value))) })}
                    className="w-24 p-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span>{MODEL_UNIT[edit.pricingModel]} بسعر</span>
                  <input type="number" min={0} step="0.01" value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) })} className="w-24 p-1.5 border border-slate-300 rounded-lg font-mono" />
                  <span>{SYM}</span>
                  <button onClick={() => setEdit({ ...edit, tiers: edit.tiers.filter((_, j) => j !== i) })} className="text-rose-600" aria-label="حذف الشريحة">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEdit({ ...edit, tiers: [...edit.tiers, { upTo: null, price: edit.pricePerStudent }] })}
                className="text-blue-700 font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> إضافة شريحة
              </button>
              <p className="text-[11px] text-slate-500">اترك خانة «حتى» فارغة لشريحة «فأكثر».</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <span>تجربة: لو عنده</span>
              <input type="number" min={1} value={tryUnits} onChange={(e) => setTryUnits(Math.max(1, Number(e.target.value) || 1))} className="w-20 p-1.5 border border-slate-300 rounded-lg font-mono" />
              <span>{MODEL_UNIT[edit.pricingModel]}</span>
              <strong className="font-mono text-[#1E3A5F]">
                = {fmt(tryUnits * preview, 2)} {SYM}
              </strong>
              <span className="text-slate-500">
                ({fmt(preview, 2)} {SYM} للواحد)
              </span>
            </div>
          </div>

          <Field label="المزايا (سطر لكل ميزة)">
            <textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} className={inputCls} />
          </Field>
          <Field label="ملاحظة تظهر تحت السعر">
            <input value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className={inputCls} />
          </Field>
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
          <SaveRow busy={busy} onSave={save} onCancel={() => setEdit(null)} />
        </Modal>
      )}
    </div>
  );
};
