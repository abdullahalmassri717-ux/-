// Small building blocks shared by the platform admin tabs.
import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { PLATFORM_CONFIG } from '../../mockData';
import type { InvoiceStatus, OrgStatus, PricingModel } from '../../data/admin';

export const SYM = PLATFORM_CONFIG.currencySymbol;
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });
export const dateLabel = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};
export const errText = (e: unknown, fallback: string) => (e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : fallback);

/** Small loader hook for admin data (not tied to an organization). */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
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

export const Spinner = () => (
  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
  </div>
);
export const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{text}</div>
);
export const Card: React.FC<{ title: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }> = ({ title, value, hint, tone = 'text-[#1E3A5F]' }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
    <span className="text-xs text-slate-500 font-bold">{title}</span>
    <div className={`text-2xl font-black font-mono tabular-nums ${tone}`}>{value}</div>
    {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
  </div>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4">
    <div className={`bg-white rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'} w-full p-5 sm:p-6 text-right space-y-3 shadow-2xl max-h-[92vh] overflow-y-auto text-xs`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-base text-[#1E3A5F]">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0" aria-label="إغلاق">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="font-bold text-slate-700">{label}</span>
    {children}
  </label>
);
export const inputCls = 'w-full p-2 border border-slate-300 rounded-lg';

export const KIND_LABEL = { individual_teacher: 'مدرّس', school: 'مدرسة', learning_center: 'مركز' } as const;
export const SUB_LABEL: Record<string, string> = { trial: 'تجريبي', active: 'نشط', past_due: 'متأخر' };
export const ORG_STATUS: Record<OrgStatus, { t: string; c: string }> = {
  pending: { t: 'بانتظار الموافقة', c: 'bg-amber-100 text-amber-800' },
  active: { t: 'مفعّلة', c: 'bg-emerald-100 text-emerald-800' },
  disabled: { t: 'معطّلة', c: 'bg-slate-200 text-slate-600' },
};
export const INVOICE_LABEL: Record<InvoiceStatus, { t: string; c: string }> = {
  issued: { t: 'بانتظار الدفع', c: 'bg-amber-100 text-amber-800' },
  overdue: { t: 'متأخرة', c: 'bg-rose-100 text-rose-800' },
  pending_confirmation: { t: 'إيصال بانتظار التأكيد', c: 'bg-blue-100 text-blue-800' },
  paid: { t: 'مدفوعة', c: 'bg-emerald-100 text-emerald-800' },
  void: { t: 'ملغاة', c: 'bg-slate-100 text-slate-500' },
};
export const MODEL_UNIT: Record<PricingModel, string> = { per_student: 'طالب', per_paper: 'ورقة' };
export const MODEL_LABEL: Record<PricingModel, string> = { per_student: 'لكل طالب مسجّل', per_paper: 'لكل ورقة مصحّحة' };
export const METHOD_LABEL: Record<string, string> = { bank_transfer: 'حوالة بنكية', e_wallet: 'محفظة إلكترونية', cash: 'نقداً', other: 'أخرى' };
