// Warning strip above every screen of an organization about its payment:
// the last days of the free trial, an invoice waiting to be paid, or AI tools
// stopped because an invoice is overdue. Data is never deleted; paying (and the
// platform admin confirming it) turns everything back on at once.
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Lock } from 'lucide-react';
import type { ScreenId } from '../../types';
import { getBillingState, type BillingState } from '../../data/billingHold';

const dateLabel = (d: string) => {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  } catch {
    return d;
  }
};
const money = (n: number, cur: string) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${cur === 'ILS' ? '₪' : cur}`;

export const BillingBanner: React.FC<{ orgId: string; onNavigate: (s: ScreenId) => void }> = ({ orgId, onNavigate }) => {
  const [state, setState] = useState<BillingState | null>(null);
  useEffect(() => {
    let alive = true;
    setState(null);
    void getBillingState(orgId).then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [orgId]);
  if (!state) return null;

  const payButton = state.owner && (
    <button onClick={() => onNavigate('B11')} className="shrink-0 bg-white/90 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold">
      {state.pendingReceipt ? 'عرض الاشتراك' : 'ادفع الآن'}
    </button>
  );
  const box = (cls: string, icon: React.ReactNode, text: React.ReactNode) => (
    <div className={`mb-4 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs leading-relaxed ${cls}`}>
      <span className="shrink-0">{icon}</span>
      <p className="flex-1 min-w-[12rem] font-bold">{text}</p>
      {payButton}
    </div>
  );

  if (state.locked) {
    const text = !state.owner
      ? 'أدوات الذكاء الاصطناعي والتصحيح ورفع الأوراق متوقفة مؤقتاً بسبب الاشتراك. بياناتك محفوظة. تواصل مع إدارة الجهة.'
      : state.locked === 'manual'
        ? 'أوقفت إدارة المنصة أدوات الذكاء الاصطناعي والتصحيح ورفع الأوراق مؤقتاً. بياناتك كلها محفوظة. تواصل مع الدعم.'
        : state.pendingReceipt
          ? 'استلمنا إيصال الدفع وننتظر تأكيده. تعود أدوات الذكاء الاصطناعي والتصحيح فور التأكيد. بياناتك كلها محفوظة.'
          : `لم تُدفع فاتورة الاشتراك${state.invoice ? ` (${money(state.invoice.amount, state.invoice.currency)})` : ''}، فتوقفت أدوات الذكاء الاصطناعي والتصحيح ورفع الأوراق. بياناتك كلها محفوظة، وتعود الخدمة فور تأكيد الدفع.`;
    return box('bg-rose-600 text-white', <Lock className="w-5 h-5" />, text);
  }
  if (!state.owner) return null;
  if (state.invoice && !state.pendingReceipt) {
    return box(
      'bg-amber-50 border border-amber-200 text-amber-900',
      <AlertTriangle className="w-5 h-5 text-amber-600" />,
      `فاتورة الاشتراك ${money(state.invoice.amount, state.invoice.currency)} مستحقة حتى ${dateLabel(state.invoice.dueOn)}. ادفعها قبل هذا التاريخ حتى لا تتوقف أدوات الذكاء الاصطناعي والتصحيح.`,
    );
  }
  if (state.trialEndsOn) {
    return box(
      'bg-blue-50 border border-blue-200 text-blue-900',
      <Clock className="w-5 h-5 text-blue-600" />,
      `الفترة التجريبية المجانية تنتهي في ${dateLabel(state.trialEndsOn)}. بعدها تصدر فاتورة الاشتراك، وتستمر الخدمة بعد دفعها.`,
    );
  }
  return null;
};
