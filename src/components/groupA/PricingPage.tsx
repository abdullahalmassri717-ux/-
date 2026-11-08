import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { adminApi, type AdminPlan } from '../../data/admin';
import { usePublicSetting } from '../../lib/settings';
import type { PaymentAccount } from '../../data/billing';
import { PLATFORM_CONFIG } from '../../mockData';
import { Check, ArrowRight, Calculator, Building2, GraduationCap, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';

interface PricingPageProps {
  onNavigate: (screen: ScreenId) => void;
}

// Plans, currency, trial length and payment accounts all come from the
// platform admin's settings. Plans are edited in the admin dashboard only.
export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [tab, setTab] = useState<'teacher' | 'school' | 'all'>('teacher');
  const [studentCount, setStudentCount] = useState<number>(60);
  const currency = usePublicSetting<{ symbol?: string }>('currency', { symbol: PLATFORM_CONFIG.currencySymbol });
  const trial = usePublicSetting<{ days?: number }>('trial', { days: 14 });
  const payment = usePublicSetting<{ accounts?: PaymentAccount[] }>('payment_accounts', {
    accounts: [{ title: 'تحويل بنكي أو محفظة إلكترونية', number: 'تظهر بيانات الحساب هنا بعد أن يضيفها مدير المنصة' }],
  });
  const sym = currency.symbol ?? PLATFORM_CONFIG.currencySymbol;

  useEffect(() => {
    let alive = true;
    adminApi()
      .listPlans()
      .then((all) => alive && setPlans(all.filter((p) => p.isActive && p.isPublic)))
      .catch(() => alive && setPlans([]));
    return () => {
      alive = false;
    };
  }, []);

  const filteredPlans = (plans ?? []).filter((p) => {
    if (tab === 'teacher') return p.target === 'teachers';
    if (tab === 'school') return p.target === 'schools' || p.target === 'enterprise';
    return true;
  });

  // The calculator uses the first public teacher plan.
  const tutorPlan = (plans ?? []).find((p) => p.target === 'teachers' && p.billingCycle === 'monthly');
  const perStudent = tutorPlan?.pricePerStudent ?? 0;
  const minimum = tutorPlan?.minimumCharge ?? 0;
  const calculatedCost = Math.max(minimum, studentCount * perStudent);
  const belowMinimum = minimum > 0 && studentCount * perStudent < minimum;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-right">
      {/* Title & Mode Switcher */}
      <div className="text-center space-y-3">
        <div className="inline-block bg-blue-100 text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full">
          خطط وباقات مرنة
        </div>
        <h1 className="text-3xl font-extrabold text-[#1E3A5F]">
          أسعار واضحة وباقات اشتراك ديناميكية
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          اختر نوع حسابك لتتعرف على التكلفة المناسبة لحجم طلابك، {trial.days ? `مع فترة تجربة مجانية ${trial.days} يوماً لكل حساب جديد.` : ''}
        </p>

        {/* Tab Switcher & Edit Mode Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setTab('teacher')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'teacher' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>المدرّس الفردي</span>
            </button>
            <button
              onClick={() => setTab('school')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'school' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>المدارس والمراكز</span>
            </button>
            <button
              onClick={() => setTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'all' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>جميع الباقات</span>
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Calculator Slider (For Tutors) */}
      {tab === 'teacher' && tutorPlan && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#1E3A5F]" />
              <span className="text-xs font-bold text-slate-800">حاسبة الاشتراك الشهري للمدرّس ({perStudent} {sym}/طالب):</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-sm font-bold text-[#1E3A5F] tabular-nums font-mono">
              {studentCount} طالب نشط
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="300"
            step="5"
            value={studentCount}
            onChange={(e) => setStudentCount(Number(e.target.value))}
            className="w-full accent-[#1E3A5F] cursor-pointer"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
            <span>
              {belowMinimum ? `يطبّق الحد الأدنى للاشتراك (${minimum} ${sym} شهرياً)` : `حساب مباشر: ${studentCount} طالب × ${perStudent} ${sym}`}
            </span>
            <div className="text-left">
              <span className="text-sm font-black text-[#1E3A5F] font-mono tabular-nums">
                المبلغ الشهري المستحق: {calculatedCost} {sym}
              </span>
            </div>
          </div>
        </div>
      )}

      {plans === null && (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      {plans !== null && filteredPlans.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">لا توجد باقات منشورة لهذا النوع من الحسابات بعد.</p>
      )}

      {/* Dynamic Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-3xl p-6 space-y-5 border-2 shadow-sm transition-all flex flex-col justify-between relative ${
              plan.isPopular ? 'border-[#1E3A5F] ring-1 ring-[#1E3A5F]/20' : 'border-slate-200'
            } ${!plan.isActive ? 'opacity-60 bg-slate-50' : ''}`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 left-6 bg-[#1E3A5F] text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                الباقة الأكثر طلباً
              </span>
            )}

            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">
                  {plan.target === 'schools' ? 'للمدارس الخاصة' : plan.target === 'teachers' ? 'للمدرّس الخصوصي' : 'مبادرة وطنية'}
                </span>
                <h3 className="text-lg font-extrabold text-[#1E3A5F] leading-snug">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">
                    {plan.pricePerStudent === 0 ? 'مجاناً' : `${plan.pricePerStudent} ${sym}`}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {plan.pricePerStudent === 0 ? 'بدون رسوم' : plan.billingCycle === 'yearly' ? 'لكل طالب / سنوياً' : 'لكل طالب / شهرياً'}
                  </span>
                </div>
                {plan.minimumCharge > 0 && (
                  <span className="text-[10px] text-slate-400 block mt-1">
                    الحد الأدنى: {plan.minimumCharge} {sym}
                  </span>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-2.5 text-xs text-slate-700">
                <span className="font-bold text-slate-900 block text-xs">المميزات المضمنة:</span>
                <ul className="space-y-2">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
                  {plan.notes}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('A3')}
                  className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>اشترك في هذه الباقة</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-[#1E3A5F] text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>وسائل الدفع المعتمدة:</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(payment.accounts ?? []).map((acc, i) => (
            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl break-words">
              <strong className="block text-slate-800">{acc.title}</strong>
              {acc.holder && <span className="block text-slate-600 text-[11px]">{acc.holder}</span>}
              <span className="text-slate-600 font-mono text-[11px]">{acc.number}</span>
            </div>
          ))}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>ارفع إيصال التحويل من صفحة الاشتراك، ويتم تفعيل حسابك بعد تأكيده.</span>
          </div>
        </div>
      </div>

    </div>
  );
};
