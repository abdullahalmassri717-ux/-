import React, { useState } from 'react';
import { ScreenId, PlatformClient, CustomSubscriptionPlan, SupportTicket } from '../../types';
import {
  MOCK_PLATFORM_ADMIN,
  MOCK_PLATFORM_CLIENTS,
  MOCK_SUBSCRIPTION_PLANS,
  MOCK_SUPPORT_TICKETS
} from '../../mockData';
import {
  ShieldCheck,
  Users,
  Building2,
  FileCheck2,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Sparkles,
  BarChart3,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Check,
  RefreshCw,
  Server,
  Zap,
  Percent,
  Download,
  Filter,
  Search,
  School,
  GraduationCap,
  Headphones,
  MessageCircle,
  Send,
  Clock,
  Paperclip,
  LayoutTemplate
} from 'lucide-react';
import { LandingPageCMS } from './LandingPageCMS';
import { notify } from '../../lib/notify';

export const PlatformAdminDashboard: React.FC<{ 
  onNavigate: (screen: ScreenId) => void;
  initialTab?: 'overview' | 'financials' | 'analytics' | 'plans' | 'clients' | 'support' | 'landing';
}> = ({ onNavigate, initialTab = 'overview' }) => {
  // Navigation Tabs inside Platform Admin Center
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'analytics' | 'plans' | 'clients' | 'support' | 'landing'>(initialTab);

  // Clients & Billing state
  const [clients, setClients] = useState<PlatformClient[]>(MOCK_PLATFORM_CLIENTS);
  const [viewingReceipt, setViewingReceipt] = useState<PlatformClient | null>(null);

  // Dynamic Subscription Plans State (from centralized mock data)
  const [plans, setPlans] = useState<CustomSubscriptionPlan[]>(MOCK_SUBSCRIPTION_PLANS);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_SUPPORT_TICKETS);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Delete plan handler
  const handleDeletePlan = (planId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الباقة؟ لن تتمكن المؤسسات والمعلمون الجدد من الاشتراك بها.')) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      showToast('تم حذف باقة الاشتراك بنجاح.');
    }
  };

  // Toggle plan active status
  const handleTogglePlanActive = (planId: string) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, isActive: !p.isActive } : p));
    showToast('تم تحديث حالة تفعيل الباقة.');
  };

  // Admin reply to support ticket
  const handleAdminReplyTicket = () => {
    if (!adminReplyText.trim() || !selectedTicket) return;

    const newReply = {
      id: `rep_${Date.now()}`,
      sender: 'support_agent' as const,
      senderName: 'فريق دعم المنصة (مدير النظام)',
      message: adminReplyText,
      time: 'الآن',
    };

    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: 'resolved' as const,
          replies: [...(t.replies || []), newReply],
        };
      }
      return t;
    }));

    setSelectedTicket(prev => prev ? {
      ...prev,
      status: 'resolved',
      replies: [...(prev.replies || []), newReply],
    } : null);

    setAdminReplyText('');
    showToast('تم إرسال رد الدعم الفني وتحديث حالة التذكرة بنجاح!');
  };

  // Update Ticket Status
  const handleUpdateTicketStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
    showToast('تم تحديث حالة التذكرة.');
  };

  // Modal State for Editing / Adding Plan
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CustomSubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    target: 'schools' as 'schools' | 'teachers' | 'enterprise',
    billingCycle: 'yearly' as 'monthly' | 'yearly',
    pricePerStudent: 45,
    minStudents: 50,
    featuresText: '',
    notes: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprovePayment = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, paymentStatus: 'paid' } : c));
    setViewingReceipt(null);
    showToast('تم اعتماد إشعار التحويل وتجديد اشتراك العميل بنجاح!');
  };

  const handleRejectPayment = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, paymentStatus: 'overdue' } : c));
    setViewingReceipt(null);
    showToast('تم رفض الإشعار وإرسال تنبيه للعميل عبر الواتساب لتصحيح الحوالة.');
  };

  const handleOpenEditPlan = (plan: CustomSubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      target: plan.target,
      billingCycle: plan.billingCycle,
      pricePerStudent: plan.pricePerStudent,
      minStudents: plan.minStudents || 0,
      featuresText: plan.features.join('\n'),
      notes: plan.notes || '',
    });
    setShowPlanModal(true);
  };

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      target: 'schools',
      billingCycle: 'yearly',
      pricePerStudent: 45,
      minStudents: 50,
      featuresText: 'تصحيح شامل لجميع المواد\nتقارير واتساب للأهالي\nلوحة مؤشرات الفاقد التعليمي',
      notes: '',
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresList = planForm.featuresText.split('\n').map(f => f.trim()).filter(Boolean);

    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? {
        ...p,
        name: planForm.name,
        target: planForm.target,
        billingCycle: planForm.billingCycle,
        pricePerStudent: Number(planForm.pricePerStudent),
        minStudents: Number(planForm.minStudents),
        features: featuresList,
        notes: planForm.notes,
      } : p));
      showToast(`تم حفظ وتحديث باقة (${planForm.name}) بنجاح!`);
    } else {
      const newPlan: CustomSubscriptionPlan = {
        id: `plan_${Date.now()}`,
        name: planForm.name,
        target: planForm.target,
        billingCycle: planForm.billingCycle,
        pricePerStudent: Number(planForm.pricePerStudent),
        minStudents: Number(planForm.minStudents),
        features: featuresList,
        isActive: true,
        notes: planForm.notes,
      };
      setPlans(prev => [...prev, newPlan]);
      showToast(`تم إنشاء وتفعيل باقة الاشتراك الجديدة (${planForm.name}) بنجاح!`);
    }

    setShowPlanModal(false);
  };

  // Performance trends
  const dailyCorrectionTrend = [
    { day: 'السبت', count: 1820 },
    { day: 'الأحد', count: 2450 },
    { day: 'الإثنين', count: 2180 },
    { day: 'الثلاثاء', count: 2600 },
    { day: 'الأربعاء', count: 2340 },
    { day: 'الخميس', count: 1980 },
    { day: 'الجمعة', count: 1480 },
  ];

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="bg-[#1E3A5F] text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 border border-blue-900/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>لوحة الإدارة والتحكم المركزية لمنصة دِقّـة</span>
            </span>
            <span className="text-xs text-blue-200">سيرفرات فلسطين وغزة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">
            نظام المراقبة المركزية والعمليات المالية والتحليلات
          </h1>
          <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
            متابعة فورية للمدارس الخاصة (الصفوف 1 - 9) ومدرسي التوجيهي، تدفق الإيرادات، تخصيص باقات الاشتراكات، ومراقبة جودة استدلال نماذج الذكاء الاصطناعي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-2.5 text-center text-xs">
            <span className="text-[10px] text-blue-200 block">حالة الخوادم</span>
            <strong className="text-emerald-300 font-mono text-sm">متصل (0.8s)</strong>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-2.5 text-center text-xs">
            <span className="text-[10px] text-blue-200 block">أوراق اليوم</span>
            <strong className="text-white font-mono text-sm">3,420 ورقة</strong>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Main Tab Navigation for Admin */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'overview', label: 'لوحة القيادة والمؤشرات العامة', icon: ShieldCheck },
          { id: 'landing', label: 'إدارة الصفحة التعريفية (Landing Page)', icon: LayoutTemplate },
          { id: 'financials', label: 'النظام المالي وإيرادات المنصة', icon: DollarSign },
          { id: 'analytics', label: 'قسم التحليلات والذكاء الاصطناعي', icon: BarChart3 },
          { id: 'plans', label: 'إدارة باقات الاشتراكات والتسعير', icon: Sliders },
          { id: 'clients', label: 'العملاء والمدارس والفواتير', icon: Building2 },
          { id: 'support', label: 'الدعم الفني وتذاكر المعلمين', icon: Headphones },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 5 Primary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">المدرّسون النشطون</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {MOCK_PLATFORM_ADMIN.activeTutors} معلم
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">+5 هذا الشهر</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">المدارس الخاصة الشريكة</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {MOCK_PLATFORM_ADMIN.activeSchools} مدارس
              </div>
              <span className="text-[11px] text-blue-700 font-bold">الصفوف 1 - 9</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">الطلاب النشطون</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {MOCK_PLATFORM_ADMIN.activeStudents}
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">طالب مسجل</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">أوراق صُححت هذا الشهر</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {MOCK_PLATFORM_ADMIN.correctedPapersThisMonth}
              </div>
              <span className="text-[11px] text-slate-500">بمتوسط 0.011$ للورقة</span>
            </div>

            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 space-y-1 shadow-2xs bg-emerald-50/20">
              <span className="text-xs text-emerald-900 font-bold">الإيراد الشهري المتوقع</span>
              <div className="text-2xl font-black text-emerald-800 font-mono tabular-nums">
                {MOCK_PLATFORM_ADMIN.projectedRevenueILS.toLocaleString()} ₪
              </div>
              <span className="text-[11px] text-emerald-700 font-bold">صافي أرباح 84.7%</span>
            </div>
          </div>

          {/* Quick Alert Banner: Physics Override Rate 18.4% */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <strong className="block text-amber-950 font-bold text-sm">
                  تنبيه جودة التصحيح: معدل تعديل درجات الفيزياء بلغ 18.4%
                </strong>
                <span className="text-amber-800">
                  تجاوز مؤشر التعديل اليدوي للمعلمين حاجز 15%. يوصى بضبط معايير خطوات قوانين كيرشوف والتحريض الكهرومغناطيسي.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('analytics')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-colors shrink-0"
            >
              فحص تحليلات الفيزياء ←
            </button>
          </div>

          {/* Quick 2-Column Split: Daily Traffic + Client Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-[#1E3A5F] text-base">نشاط وتصحيح الأوراق خلال الأسبوع</h3>
                <span className="text-xs text-slate-500">14,850 ورقة مصححة</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4">
                {dailyCorrectionTrend.map((t) => {
                  const pct = (t.count / 3000) * 100;
                  return (
                    <div key={t.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[9px] font-mono text-slate-500">{t.count}</span>
                      <div
                        className="w-full bg-[#1E3A5F] hover:bg-emerald-600 rounded-t-lg transition-all"
                        style={{ height: `${pct}%` }}
                      ></div>
                      <span className="text-[10px] text-slate-700 font-bold">{t.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-[#1E3A5F] text-base">حالة الاشتراكات والتحصيلات</h3>
                <button
                  onClick={() => setActiveTab('financials')}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  التفاصيل المالية ←
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-950">اشتراكات مفعلة ومسددة بالكامل</span>
                  <strong className="font-mono text-emerald-800 text-sm">45 عميلاً (41,600 ₪)</strong>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-950">تحويلات بنكية بانتظار اعتماد الإدارة</span>
                  <strong className="font-mono text-amber-800 text-sm">2 إيصالات (3,200 ₪)</strong>
                </div>
                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="font-bold text-rose-950">فواتير متأخرة أو قيد السداد</span>
                  <strong className="font-mono text-rose-800 text-sm">3 عملاء (3,400 ₪)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: COMPREHENSIVE PLATFORM FINANCIAL SYSTEM */}
      {/* ========================================================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Revenue & Margin Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <span className="text-xs text-slate-500 font-bold">إجمالي الإيرادات الشهرية</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                48,200 ₪
              </div>
              <p className="text-[11px] text-slate-500">
                من 8 مدارس خاصة (الصفوف 1-9) و42 مدرساً
              </p>
            </div>

            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-2xs space-y-2 bg-emerald-50/20">
              <span className="text-xs text-emerald-900 font-bold">المحصل في حسابات البنك والمحافظ</span>
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                41,600 ₪
              </div>
              <div className="flex justify-between text-[11px] text-emerald-800 font-bold">
                <span>نسبة التحصيل: 86.3%</span>
                <span>بنك فلسطين + جوال باي</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <span className="text-xs text-slate-500 font-bold">تكاليف التشغيل المباشرة</span>
              <div className="text-2xl font-black text-slate-700 font-mono tabular-nums">
                7,350 ₪
              </div>
              <p className="text-[11px] text-slate-500">
                AI Inference + خوادم سحابية + بوابات واتساب
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1E3A5F] to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs text-blue-200 font-bold">صافي أرباح المنصة</span>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                40,850 ₪
              </div>
              <p className="text-[11px] text-emerald-300 font-bold">
                هامش ربح قياسي 84.7%
              </p>
            </div>
          </div>

          {/* Payment Gateways Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#1E3A5F] text-base">
              توزيع طرق التحصيل المالي في فلسطين (قطاع غزة والضفة)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-800 text-sm">حسابات بنك فلسطين</strong>
                  <span className="bg-blue-100 text-[#1E3A5F] px-2 py-0.5 rounded font-bold font-mono">52%</span>
                </div>
                <div className="text-xl font-black text-[#1E3A5F] font-mono">25,064 ₪</div>
                <p className="text-[11px] text-slate-500">تحويلات رسمية من إدارات المدارس الخاصة والمدرسين</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-800 text-sm">محفظة جوال باي (Jawwal Pay)</strong>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">34%</span>
                </div>
                <div className="text-xl font-black text-emerald-700 font-mono">16,388 ₪</div>
                <p className="text-[11px] text-slate-500">الأكثر استخداماً من المدرسين والتحويلات اللحظية</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-800 text-sm">بال باي (PalPay) ونقداً</strong>
                  <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold font-mono">14%</span>
                </div>
                <div className="text-xl font-black text-slate-800 font-mono">6,748 ₪</div>
                <p className="text-[11px] text-slate-500">سندات قبض نقدية وعقود سنوية مباشرة</p>
              </div>
            </div>
          </div>

          {/* Pending Approvals Queue */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-[#1E3A5F] text-base">
                  طلبات وإيصالات التحويل بانتظار تأكيد واعتماد مدير المنصة
                </h3>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
                2 بانتظار المراجعة
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">مدرسة الرواد الخاصة (الصفوف 1 - 9)</strong>
                    <span className="bg-blue-100 text-[#1E3A5F] px-2 py-0.5 rounded text-[10px] font-bold">مدرسة خاصة</span>
                  </div>
                  <p className="text-slate-500">
                    مبلغ: <strong className="font-mono text-slate-800">4,200 شيكل</strong> (عن 105 طالب × 40 ₪) • تحويل عبر بنك فلسطين
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => notify('معاينة صورة إيصال تحويل مدرسة الرواد الخاصة (بنك فلسطين)')}
                    className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    معاينة الإشعار
                  </button>
                  <button
                    onClick={() => showToast('تم تأكيد استلام الحوالة وتفعيل اشتراك مدرسة الرواد الخاصة!')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    اعتماد وتفعيل
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">أ. حسام البطة (معلم فيزياء)</strong>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">معلم خصوصي</span>
                  </div>
                  <p className="text-slate-500">
                    مبلغ: <strong className="font-mono text-slate-800">600 شيكل</strong> (عن 120 طالب × 5 ₪) • تحويل عبر جوال باي
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => notify('معاينة لقطة شاشة تحويل جوال باي - أ. حسام البطة')}
                    className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    معاينة الإشعار
                  </button>
                  <button
                    onClick={() => showToast('تم اعتماد إشعار أ. حسام وتجديد اشتراكه بنجاح!')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    اعتماد وتفعيل
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DEEP ANALYTICS & AI PERFORMANCE */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">متوسط دقة التصحيح التلقائي</span>
              <div className="text-3xl font-black text-emerald-700 font-mono">95.2%</div>
              <p className="text-[11px] text-slate-500">مبني على 14,850 ورقة مصححة</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">معدل التعديل اليدوي للمعلمين (Override)</span>
              <div className="text-3xl font-black text-[#1E3A5F] font-mono">7.8%</div>
              <p className="text-[11px] text-slate-500">ضمن المعايير العالمية المقبولة</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">تكلفة الذكاء الاصطناعي لكل ورقة</span>
              <div className="text-3xl font-black text-slate-800 font-mono">$0.011</div>
              <p className="text-[11px] text-emerald-600 font-bold">أقل من نصف قرش شيكل للورقة</p>
            </div>
          </div>

          {/* Override Rates Categorized by Stage & Subject */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#1E3A5F] text-base">
              مؤشر دقة التصحيح ونسبة التعديل اليدوي حسب المادة والمرحلة الدراسية
            </h3>

            <div className="space-y-3">
              {[
                { subject: 'الرياضيات (التوجيهي والأساسي)', rate: 6.2, papers: 6200, status: 'ممتاز', color: 'emerald' },
                { subject: 'الفيزياء (توجيهي)', rate: 18.4, papers: 3100, status: 'تنبيه (يحتاج ضبط)', color: 'amber', alert: true },
                { subject: 'العلوم العامة (الصفوف 1 - 9)', rate: 4.8, papers: 2400, status: 'فائق الدقة', color: 'emerald' },
                { subject: 'الكيمياء', rate: 8.1, papers: 2850, status: 'جيد جداً', color: 'blue' },
                { subject: 'اللغة الإنجليزية (Writing & Reading)', rate: 9.5, papers: 2700, status: 'جيد جداً', color: 'blue' },
                { subject: 'اللغة العربية والتربية الإسلامية (الصفوف 1 - 9)', rate: 3.9, papers: 1600, status: 'فائق الدقة', color: 'emerald' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold text-sm">{item.subject}</strong>
                      {item.alert && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                          ⚠️ تنبيه
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px] font-mono">
                      {item.papers.toLocaleString()} ورقة مصححة
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-500 block">نسبة التعديل</span>
                      <strong className={`text-sm ${item.alert ? 'text-amber-800' : 'text-[#1E3A5F]'}`}>
                        {item.rate}%
                      </strong>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      item.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                      item.color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DYNAMIC SUBSCRIPTION & PRICING PLANS MANAGER */}
      {/* ========================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-3xl p-5">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#1E3A5F]" />
                <h3 className="font-extrabold text-[#1E3A5F] text-base">
                  إدارة وتخصيص باقات الاشتراكات (الأسعار ديناميكية وليست ثابتة)
                </h3>
              </div>
              <p className="text-xs text-blue-900 mt-0.5">
                يمكن لمدير المنصة تعديل أسعار باقات المدارس والمعلمين، إنشاء عروض خاصة، أو تفعيل إعفاءات للمدارس المتضررة.
              </p>
            </div>
            <button
              onClick={handleOpenAddPlan}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-2xs flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إنشاء باقة اشتراك جديدة</span>
            </button>
          </div>

          {/* Dynamic Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white border-2 rounded-3xl p-6 space-y-4 shadow-sm relative transition-all ${
                  plan.isPopular ? 'border-[#1E3A5F]' : 'border-slate-200'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-6 bg-[#1E3A5F] text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                    الباقة الأكثر استخداماً
                  </span>
                )}

                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {plan.target === 'schools' ? 'للمدارس الخاصة (الصفوف 1 - 9)' : plan.target === 'teachers' ? 'للمدرسين الخصوصيين' : 'مبادرة إنسانية'}
                    </span>
                    <h4 className="text-base font-extrabold text-[#1E3A5F] mt-0.5">{plan.name}</h4>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                      {plan.pricePerStudent === 0 ? 'مجاناً' : `${plan.pricePerStudent} ₪`}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {plan.pricePerStudent === 0 ? 'دعم كامل' : plan.billingCycle === 'yearly' ? 'لكل طالب / سنوياً' : 'لكل طالب / شهرياً'}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-700">المميزات والصلاحيات المضمنة:</div>
                  <ul className="space-y-1.5 text-slate-600">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-xl">
                    ملاحظات: {plan.notes}
                  </p>
                )}

                {/* Action Toolbar for Plan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleTogglePlanActive(plan.id)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer self-start ${
                      plan.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {plan.isActive ? 'نشطة ومتاحة للاشتراك ✓' : 'معطلة مؤقتاً'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlan(plan)}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1E3A5F] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CLIENTS, SCHOOLS & INVOICING */}
      {/* ========================================================= */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-[#1E3A5F] text-base">سجل عملاء المنصة والمدارس الخاصة</h3>
              <p className="text-xs text-slate-500">متابعة الاشتراكات وتواريخ التجديد والتحويلات</p>
            </div>
            <span className="text-xs text-slate-600 font-mono">إجمالي العملاء: {clients.length}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">العميل / المؤسسة</th>
                    <th className="p-3.5">نوع العميل</th>
                    <th className="p-3.5 text-center">عدد الطلاب</th>
                    <th className="p-3.5">الباقة المخصصة</th>
                    <th className="p-3.5 text-center">المبلغ المستحق</th>
                    <th className="p-3.5 text-center">حالة الاشتراك</th>
                    <th className="p-3.5 text-center">إجراءات المدير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <strong className="block text-slate-900 font-bold text-xs">{c.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{c.id}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.type === 'school' ? 'bg-blue-100 text-[#1E3A5F]' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.type === 'school' ? 'مدرسة خاصة' : 'معلم خصوصي'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-slate-800 tabular-nums">
                        {c.studentsCount} طالب
                      </td>

                      <td className="p-3.5 text-slate-700 font-medium">
                        {c.plan}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-[#1E3A5F] tabular-nums">
                        {c.amount} ₪
                      </td>

                      <td className="p-3.5 text-center">
                        {c.paymentStatus === 'paid' && (
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            مفعل ومدفوع
                          </span>
                        )}
                        {c.paymentStatus === 'pending_confirmation' && (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            بانتظار التأكيد
                          </span>
                        )}
                        {c.paymentStatus === 'overdue' && (
                          <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            متأخر
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              showToast(`تم إرسال فاتورة وسند تجديد للعميل (${c.name}) عبر واتساب.`);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            إرسال فاتورة
                          </button>
                          <button
                            onClick={() => {
                              showToast(`تم منح شهر مجاني للعميل (${c.name}) كإكرامية دعم.`);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            منح خصم
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: SUPPORT & TICKETS MANAGEMENT (إدارة الدعم الفني) */}
      {/* ========================================================= */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 rounded-3xl p-5">
            <div>
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-emerald-800" />
                <h3 className="font-extrabold text-emerald-950 text-base">
                  إدارة تذاكر الدعم الفني ومساندة المعلمين والمدارس
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                استقبال استفسارات المعلمين والمدارس المباشرة حول التصحيح والـ QR وطباعة الأوراق، والرد السريع وتتبع جودة الخدمة.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-white border border-emerald-300 text-emerald-900 font-bold px-3 py-1 rounded-xl">
                متوسط الرد: 6.8 دقيقة
              </span>
            </div>
          </div>

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">التذاكر النشطة حالياً</span>
              <div className="text-2xl font-black text-amber-600 font-mono">
                {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} تذاكر
              </div>
              <span className="text-[11px] text-slate-400">تتطلب استجابة سريعة</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">تذاكر تم حلها بنجاح</span>
              <div className="text-2xl font-black text-emerald-600 font-mono">
                {tickets.filter(t => t.status === 'resolved').length + 42} تذكرة
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">نسبة حل 99.2%</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">أكثر التصنيفات طلباً للدعم</span>
              <div className="text-base font-black text-[#1E3A5F]">
                التصحيح التلقائي وأوراق الـ QR
              </div>
              <span className="text-[11px] text-slate-400">حالات الخط الرصاص الخفيف</span>
            </div>
          </div>

          {/* Ticket Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-600">تصفية التذاكر:</span>
            {[
              { id: 'all', label: 'كافة التذاكر' },
              { id: 'open', label: 'جديدة بانتظار الرد' },
              { id: 'in_progress', label: 'قيد المعالجة' },
              { id: 'resolved', label: 'تم الحل بنجاح' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTicketFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ticketFilter === f.id
                    ? 'bg-[#1E3A5F] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 2-Column Tickets Management Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets Sidebar */}
            <div className="lg:col-span-1 space-y-3">
              {tickets
                .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
                .map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;

                  const statusBadge = {
                    open: { label: 'جديدة', color: 'bg-amber-100 text-amber-800' },
                    in_progress: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' },
                    resolved: { label: 'محلولة ✓', color: 'bg-emerald-100 text-emerald-800' },
                    closed: { label: 'مغلقة', color: 'bg-slate-200 text-slate-600' },
                  }[ticket.status];

                  const priorityBadge = {
                    urgent: 'text-red-700 bg-red-50 border-red-200 font-bold',
                    high: 'text-amber-700 bg-amber-50 border-amber-200 font-bold',
                    normal: 'text-slate-600 bg-slate-50 border-slate-200',
                  }[ticket.priority];

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-blue-50/60 border-[#1E3A5F] ring-1 ring-[#1E3A5F]/20 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-400 font-bold">{ticket.ticketNumber}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityBadge}`}>
                            {ticket.priority === 'urgent' ? 'طارئة' : ticket.priority === 'high' ? 'مستعجلة' : 'عادية'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {ticket.subject}
                      </h4>

                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>{ticket.senderName} ({ticket.entityType === 'school' ? 'مدرسة' : 'معلم'})</span>
                        <span className="font-mono">{ticket.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Ticket Management & Reply Panel */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {selectedTicket.ticketNumber}
                        </span>
                        <span className="text-xs text-slate-400">{selectedTicket.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                        >
                          <option value="open">جديدة بانتظار الرد</option>
                          <option value="in_progress">قيد المعالجة</option>
                          <option value="resolved">تم الحل بنجاح</option>
                          <option value="closed">إغلاق التذكرة</option>
                        </select>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {selectedTicket.subject}
                    </h3>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>المرسل: <strong className="text-slate-800">{selectedTicket.senderName}</strong></span>
                      <span>•</span>
                      <span>الجهة: <strong className="text-[#1E3A5F]">{selectedTicket.entityName}</strong></span>
                      <span>•</span>
                      <span className="font-mono">هاتف: {selectedTicket.phone}</span>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block">نص المشكلة المرسلة:</span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {selectedTicket.description}
                    </p>
                    {selectedTicket.attachedExamOrPaper && (
                      <div className="pt-2 border-t border-slate-200/60 text-[#1E3A5F] font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>مرفق: {selectedTicket.attachedExamOrPaper}</span>
                      </div>
                    )}
                  </div>

                  {/* Previous Replies */}
                  {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-slate-700 block">المحادثة والردود:</span>
                      {selectedTicket.replies.map(rep => (
                        <div
                          key={rep.id}
                          className={`p-3.5 rounded-xl text-xs space-y-1 ${
                            rep.sender === 'support_agent'
                              ? 'bg-emerald-50 border border-emerald-200 mr-4 text-emerald-950'
                              : 'bg-slate-100 border border-slate-200 ml-4 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span>{rep.senderName}</span>
                            <span className="font-mono text-slate-400">{rep.time}</span>
                          </div>
                          <p className="leading-relaxed">{rep.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin Reply Form */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-700">الرد على المعلم/المدرسة وإرسال الحل:</label>
                    <textarea
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder="اكتب التوجيه الفني أو تأكيد حل المشكلة للمعلم..."
                      className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-900 min-h-[80px]"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">سيصل الرد فورياً إلى شاشة المعلم وإلى حسابه.</span>
                      <button
                        onClick={handleAdminReplyTicket}
                        className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال الرد وتعيين التذكرة كمحلولة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 text-slate-400">
                  <Headphones className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">اختر تذكرة لمعاينتها والرد عليها</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    يمكنك تصفح التذاكر المفتوحة والرد عليها لتصل الحلول إلى المعلمين والمدارس فورياً.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: LANDING PAGE CMS & SETTINGS */}
      {/* ========================================================= */}
      {activeTab === 'landing' && (
        <LandingPageCMS onNavigate={onNavigate} />
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT / CREATE SUBSCRIPTION PLAN */}
      {/* ========================================================= */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right">
            <div className="bg-[#1E3A5F] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingPlan ? 'تعديل باقة الاشتراك والأسعار' : 'إنشاء باقة اشتراك جديدة'}
                </h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">اسم باقة الاشتراك:</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: باقة المدارس الخاصة للتعليم الأساسي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">الفئة المستهدفة:</label>
                  <select
                    value={planForm.target}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, target: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="schools">مدارس خاصة (صفوف 1 - 9)</option>
                    <option value="teachers">معلمون خصوصيون</option>
                    <option value="enterprise">مبادرة / مؤسسات كبرى</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">دورة الفوترة:</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, billingCycle: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="yearly">سنوياً (للمدارس)</option>
                    <option value="monthly">شهرياً (للمعلمين)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">سعر الطالب (شيكل):</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.pricePerStudent}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, pricePerStudent: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-emerald-700"
                    required
                  />
                  <span className="text-[10px] text-slate-400">0 شيكل تعني إعفاء مجاني</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">الحد الأدنى للطلاب:</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.minStudents}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, minStudents: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  المميزات والصلاحيات المضمنة (سطر لكل ميزة):
                </label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, featuresText: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  placeholder="تصحيح شامل لجميع المواد&#10;تقارير واتساب فورية&#10;خريطة الفاقد التعليمي"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">ملاحظات إدارية:</label>
                <input
                  type="text"
                  value={planForm.notes}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظة حول الباقة أو الشروط الخاصة"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                >
                  حفظ وتفعيل الباقة ديناميكياً
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-5 rounded-xl font-bold text-xs cursor-pointer"
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

// Aliases for sub-views if invoked directly
export const AdminBillingPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  return <PlatformAdminDashboard onNavigate={onNavigate} />;
};

export const GradingQualityPage: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  return <PlatformAdminDashboard onNavigate={onNavigate} />;
};
