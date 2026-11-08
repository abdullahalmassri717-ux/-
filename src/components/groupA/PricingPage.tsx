import React, { useState } from 'react';
import { ScreenId, CustomSubscriptionPlan } from '../../types';
import { MOCK_SUBSCRIPTION_PLANS } from '../../mockData';
import { 
  Check, 
  ArrowRight, 
  Calculator, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  CreditCard,
  Edit,
  Trash2,
  Plus,
  Sliders,
  CheckCircle2,
  Zap,
  Sparkles
} from 'lucide-react';

interface PricingPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<CustomSubscriptionPlan[]>(MOCK_SUBSCRIPTION_PLANS);
  const [tab, setTab] = useState<'teacher' | 'school' | 'all'>('teacher');
  const [studentCount, setStudentCount] = useState<number>(60);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Modal State for Adding/Editing Plan
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    target: 'teachers' as 'teachers' | 'schools' | 'enterprise',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    pricePerStudent: 5,
    minStudents: 50,
    featuresText: '',
    notes: '',
    isPopular: false,
    isActive: true,
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Open modal for editing
  const handleOpenEdit = (plan: CustomSubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      target: plan.target,
      billingCycle: plan.billingCycle,
      pricePerStudent: plan.pricePerStudent,
      minStudents: plan.minStudents || 50,
      featuresText: plan.features.join('\n'),
      notes: plan.notes || '',
      isPopular: plan.isPopular || false,
      isActive: plan.isActive,
    });
    setShowPlanModal(true);
  };

  // Open modal for adding a new plan
  const handleOpenAdd = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      target: tab === 'school' ? 'schools' : 'teachers',
      billingCycle: tab === 'school' ? 'yearly' : 'monthly',
      pricePerStudent: tab === 'school' ? 45 : 5,
      minStudents: 50,
      featuresText: 'تصحيح غير محدود لأوراق الامتحانات والواجبات\nتقارير أداء ذكية عبر واتساب\nنماذج بنك الأسئلة المعتمد',
      notes: '',
      isPopular: false,
      isActive: true,
    });
    setShowPlanModal(true);
  };

  // Delete plan
  const handleDeletePlan = (planId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
      setPlans(plans.filter(p => p.id !== planId));
      showToast('تم حذف الباقة بنجاح!');
    }
  };

  // Toggle plan active status
  const handleToggleActive = (planId: string) => {
    setPlans(plans.map(p => p.id === planId ? { ...p, isActive: !p.isActive } : p));
    showToast('تم تحديث حالة الباقة');
  };

  // Save Plan (Add or Edit)
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;

    const featuresList = planForm.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    if (editingPlanId) {
      // Edit existing
      setPlans(plans.map(p => {
        if (p.id === editingPlanId) {
          return {
            ...p,
            name: planForm.name,
            target: planForm.target,
            billingCycle: planForm.billingCycle,
            pricePerStudent: Number(planForm.pricePerStudent),
            minStudents: Number(planForm.minStudents),
            features: featuresList,
            notes: planForm.notes,
            isPopular: planForm.isPopular,
            isActive: planForm.isActive,
          };
        }
        return p;
      }));
      showToast('تم تعديل بيانات الباقة بنجاح!');
    } else {
      // Add new
      const newPlan: CustomSubscriptionPlan = {
        id: `plan_${Date.now()}`,
        name: planForm.name,
        target: planForm.target,
        billingCycle: planForm.billingCycle,
        pricePerStudent: Number(planForm.pricePerStudent),
        minStudents: Number(planForm.minStudents),
        features: featuresList,
        notes: planForm.notes,
        isPopular: planForm.isPopular,
        isActive: planForm.isActive,
      };
      setPlans([...plans, newPlan]);
      showToast('تمت إضافة الباقة الجديدة بنجاح!');
    }

    setShowPlanModal(false);
  };

  // Filtered plans based on selected tab
  const filteredPlans = plans.filter(p => {
    if (tab === 'teacher') return p.target === 'teachers';
    if (tab === 'school') return p.target === 'schools' || p.target === 'enterprise';
    return true;
  });

  // Teacher calculation: 5 ILS/student, minimum 250 ILS
  const calculatedCost = Math.max(250, studentCount * 5);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-right">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E3A5F] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Title & Mode Switcher */}
      <div className="text-center space-y-3">
        <div className="inline-block bg-blue-100 text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full">
          خطط وباقات مرنة ومناسبة لفلسطين
        </div>
        <h1 className="text-3xl font-extrabold text-[#1E3A5F]">
          أسعار واضحة وباقات اشتراك ديناميكية
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          اختر نوع حسابك لتتعرف على التكلفة المناسبة لحجم طلابك، مع أول شهر مجاني بالكامل للمدرسين وعقود سنوية مخفضة للمدارس.
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

          {/* Flexible Edit / Customization Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isEditMode 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>{isEditMode ? 'إغلاق وضع التعديل' : 'تخصيص وتعديل الباقات'}</span>
          </button>

          {isEditMode && (
            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة باقة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Calculator Slider (For Tutors) */}
      {tab === 'teacher' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#1E3A5F]" />
              <span className="text-xs font-bold text-slate-800">حاسبة الاشتراك الشهري للمدرّس (5 ₪/طالب):</span>
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
              {studentCount < 50 ? 'يطبّق الحد الأدنى للاشتراك (250 ₪ شهرياً)' : `حساب مباشر: ${studentCount} طالب × 5 شيكل`}
            </span>
            <div className="text-left">
              <span className="text-sm font-black text-[#1E3A5F] font-mono tabular-nums">
                المبلغ الشهري المستحق: {calculatedCost} ₪
              </span>
            </div>
          </div>
        </div>
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
                    {plan.pricePerStudent === 0 ? 'مجاناً' : `${plan.pricePerStudent} ₪`}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {plan.pricePerStudent === 0 ? 'بدون رسوم' : plan.billingCycle === 'yearly' ? 'لكل طالب / سنوياً' : 'لكل طالب / شهرياً'}
                  </span>
                </div>
                {plan.minStudents && plan.minStudents > 0 && (
                  <span className="text-[10px] text-slate-400 block mt-1">
                    الحد الأدنى: {plan.minStudents} طالباً
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
              {isEditMode ? (
                /* Flexible Admin Controls: Edit, Delete, Toggle Active */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                        plan.isActive 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {plan.isActive ? 'مفعلة للاشتراك ✓' : 'معطلة مؤقتاً'}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">{plan.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plan)}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1E3A5F] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Subscriber CTA */
                <button
                  type="button"
                  onClick={() => onNavigate('A3')}
                  className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>اشترك في هذه الباقة</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-[#1E3A5F] text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>وسائل الدفع والتحويل المحلية المعتمدة في فلسطين:</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <strong className="block text-slate-800">حساب بنك فلسطين:</strong>
            <span className="text-slate-600 font-mono text-[11px]">شركة دقة (فرع الرمال - 045)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <strong className="block text-slate-800">المحافظ الرقمية:</strong>
            <span className="text-slate-600 font-mono text-[11px]">جوال باي (Jawwal Pay) · 0599-123456</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>شهر تجريبي مجاني بدون أي بطاقة بنكية مسبقة.</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <span>{editingPlanId ? 'تعديل بيانات الباقة' : 'إنشاء باقة اشتراك جديدة'}</span>
              </h3>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الباقة</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="مثال: باقة المعلم المتميز VIP"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفئة المستهدفة</label>
                  <select
                    value={planForm.target}
                    onChange={(e) => setPlanForm({ ...planForm, target: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="teachers">المدرّسون الخصوصيون</option>
                    <option value="schools">المدارس الخاصة</option>
                    <option value="enterprise">مراكز ومبادرات إنسانية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">دورة الفوترة</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                  >
                    <option value="monthly">شهرياً (لكل طالب نشط)</option>
                    <option value="yearly">سنوياً (عقد مدرسي - قسطين)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">السعر لكل طالب (₪ شيكل)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={planForm.pricePerStudent}
                    onChange={(e) => setPlanForm({ ...planForm, pricePerStudent: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحد الأدنى للطلاب</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={planForm.minStudents}
                    onChange={(e) => setPlanForm({ ...planForm, minStudents: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المميزات المضمنة (كل ميزة في سطر منفصل)</label>
                <textarea
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  placeholder="تصحيح فوري غير محدود&#10;تقارير واتساب تلقائية للأهالي&#10;توليد نماذج الامتحانات بالذكاء الاصطناعي"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 min-h-[90px] leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية (تظهر أسفل البطاقة)</label>
                <input
                  type="text"
                  value={planForm.notes}
                  onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                  placeholder="مثال: يسدد على دفعتين متساويتين في الفصلين"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                    className="rounded text-[#1E3A5F]"
                  />
                  <span>تمييز كـ "الباقة الأكثر طلباً"</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="rounded text-[#1E3A5F]"
                  />
                  <span>تفعيل الباقة للاشتراك</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  حفظ الباقة
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
