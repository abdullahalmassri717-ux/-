import React, { useState } from 'react';
import { ScreenId, StudentTuitionRecord, Entity } from '../../types';
import { CURRENT_TEACHER, MOCK_STUDENT_TUITIONS, MOCK_TEACHER_FINANCIALS, MOCK_GROUPS } from '../../mockData';
import {
  CreditCard,
  Building,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  Filter,
  Plus,
  Send,
  MessageCircle,
  Printer,
  Download,
  QrCode,
  Check,
  Phone,
  Wallet,
  Sparkles,
  Receipt,
  FileCheck
} from 'lucide-react';
import { notify } from '../../lib/notify';

interface SubscriptionPageProps {
  onNavigate: (screen: ScreenId) => void;
  activeEntity?: Entity;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate, activeEntity }) => {
  const isSchool = activeEntity?.type === 'school' || activeEntity?.type === 'learning_center';
  const isSchoolTeacher = isSchool && activeEntity?.role === 'teacher';

  // Main view switcher: 'student_tuitions' (نظام المعلم المالي ورسوم الطلاب) vs 'platform_subscription' (اشتراك المعلم/المدرسة في دقة)
  const [activeMainTab, setActiveMainTab] = useState<'student_tuitions' | 'platform_subscription'>(
    isSchool ? 'platform_subscription' : 'student_tuitions'
  );

  // Student Tuitions State
  const [tuitionRecords, setTuitionRecords] = useState<StudentTuitionRecord[]>(MOCK_STUDENT_TUITIONS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals for Student Financial System
  const [selectedReceipt, setSelectedReceipt] = useState<StudentTuitionRecord | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    studentId: string;
    amount: number;
    paymentMethod: string;
    notes: string;
  }>({
    studentId: tuitionRecords[0]?.studentId || '',
    amount: 150,
    paymentMethod: 'نقداً (يد بيد)',
    notes: 'قسط شهر نوفمبر 2026',
  });
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Platform Subscription State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  const mockInvoices = [
    { id: 'INV-2026-10', month: 'أكتوبر 2026', students: 180, amount: 900, status: 'paid', date: '15 أكتوبر 2026' },
    { id: 'INV-2026-09', month: 'سبتمبر 2026', students: 165, amount: 825, status: 'paid', date: '15 سبتمبر 2026' },
    { id: 'INV-2026-08', month: 'أغسطس 2026', students: 150, amount: 750, status: 'paid', date: '15 أغسطس 2026' },
  ];

  // Filtering students
  const filteredTuitions = tuitionRecords.filter((record) => {
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesGroup = groupFilter === 'all' || record.group === groupFilter;
    const matchesSearch =
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.parentPhone.includes(searchQuery) ||
      (record.receiptNumber && record.receiptNumber.includes(searchQuery));
    return matchesStatus && matchesGroup && matchesSearch;
  });

  // Calculate live financial statistics
  const currentTotalExpected = MOCK_TEACHER_FINANCIALS.totalExpectedTuition;
  const currentTotalCollected = tuitionRecords.reduce((acc, curr) => acc + curr.paidAmount, 0) + 18450; // offset for mock scale
  const currentTotalRemaining = currentTotalExpected - currentTotalCollected;
  const currentCollectionRate = ((currentTotalCollected / currentTotalExpected) * 100).toFixed(1);
  const teacherPlatformFee = CURRENT_TEACHER.totalStudents * 5; // 900 ILS (5 ILS per student)
  const teacherNetEarnings = currentTotalCollected - teacherPlatformFee;

  // Handle Recording a New Student Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const student = tuitionRecords.find(t => t.studentId === paymentForm.studentId);
    if (!student) return;

    const newAmount = Number(paymentForm.amount);
    const updatedPaid = Math.min(student.monthlyFee, student.paidAmount + newAmount);
    const newStatus: 'paid' | 'partial' | 'unpaid' = updatedPaid >= student.monthlyFee ? 'paid' : (updatedPaid > 0 ? 'partial' : 'unpaid');
    const generatedReceipt = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    setTuitionRecords(prev => prev.map(item => {
      if (item.studentId === paymentForm.studentId) {
        return {
          ...item,
          paidAmount: updatedPaid,
          status: newStatus,
          lastPaymentDate: 'اليوم (5 نوفمبر 2026)',
          receiptNumber: generatedReceipt,
          notes: paymentForm.notes || 'تم سداد الدفعة بنجاح',
        };
      }
      return item;
    }));

    setShowAddPaymentModal(false);
    setSuccessToast(`تم تسجيل دفعة بقيمة ${newAmount} ₪ للطالب (${student.studentName}) وتوليد سند القبض رقم ${generatedReceipt} بنجاح!`);
    setTimeout(() => setSuccessToast(null), 6000);
  };

  // Quick WhatsApp Payment Reminder
  const handleSendReminder = (student: StudentTuitionRecord) => {
    const dueAmount = student.monthlyFee - student.paidAmount;
    const message = `السلام عليكم ولي أمر الطالب ${student.studentName} المحترم،\nنذكركم بلطف بضرورة سداد قسط دورة التوجيهي لشهر نوفمبر المتبقي بقيمة (${dueAmount} شيكل). نسعد دائماً بتميزه معنا.\n— أ. محمد المصري`;
    notify(`[محاكاة إرسال تذكير واتساب]\nتم تجهيز الرسالة إلى الرقم ${student.parentPhone}:\n\n${message}`);
  };

  // If active entity is a school teacher, hide billing completely
  if (isSchoolTeacher) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="font-black text-slate-900 text-lg">الاشتراكات والفواتير خاصة بإدارة المدرسة</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          حسابك مسجل كمعلم ضمن جهة «{activeEntity?.name}». إدارة العقود السنوية والفواتير والتحويلات المالية تتم حصراً من قِبل مدير المدرسة أو الإدارة المالية.
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

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F]">
              {isSchool ? `العقد السنوي والمالية: ${activeEntity?.name || 'المدرسة'}` : 'النظام المالي وحسابات الاشتراكات'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSchool
              ? 'متابعة العقد السنوي للمدرسة (50 ₪/طالب) على دفعتين للفصلين الدراسيين، والتقارير المعتمدة'
              : 'إدارة وتحصيل رسوم الطلاب الخصوصيين، إصدار سندات القبض، ومتابعة اشتراك المعلم في منصة دقة (5 ₪/طالب)'}
          </p>
        </div>

        {/* Dual Mode Switcher Tabs */}
        {!isSchool ? (
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 self-start sm:self-auto border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveMainTab('student_tuitions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'student_tuitions'
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>رسوم واشتراكات طلابي (النظام المالي)</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {currentCollectionRate}%
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('platform_subscription')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === 'platform_subscription'
                  ? 'bg-[#1E3A5F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-300" />
              <span>اشتراكي في منصة دقة</span>
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1E3A5F] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span>عقد سنوي مؤسسي معتمد</span>
          </div>
        )}
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: TEACHER'S FINANCIAL LEDGER & STUDENT TUITIONS */}
      {/* ========================================================= */}
      {activeMainTab === 'student_tuitions' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards for Teacher Finances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Expected Monthly Tuition */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">إجمالي الرسوم المتوقعة</span>
                <span className="p-1.5 bg-blue-50 text-[#1E3A5F] rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">
                {currentTotalExpected.toLocaleString()} <span className="text-xs font-bold">شيكل / شهر</span>
              </div>
              <p className="text-[11px] text-slate-500">
                مجموع {CURRENT_TEACHER.totalStudents} طالب × 150 ₪ لدروس التوجيهي
              </p>
            </div>

            {/* 2. Total Collected So Far */}
            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-2xs space-y-2 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-bold">تم تحصيله هذا الشهر</span>
                <span className="p-1.5 bg-emerald-500 text-white rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                {currentTotalCollected.toLocaleString()} <span className="text-xs font-bold text-emerald-800">شيكل</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${currentCollectionRate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-emerald-800 font-bold font-mono">
                  <span>نسبة التحصيل: {currentCollectionRate}%</span>
                  <span>148 طالباً مسدداً</span>
                </div>
              </div>
            </div>

            {/* 3. Remaining Outstanding Tuition */}
            <div className="bg-white border border-amber-300 rounded-2xl p-5 shadow-2xs space-y-2 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-900 font-bold">متبقي قيد التحصيل</span>
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono tabular-nums">
                {currentTotalRemaining.toLocaleString()} <span className="text-xs font-bold">شيكل</span>
              </div>
              <p className="text-[11px] text-amber-800">
                32 طالباً (16 متأخرين + 16 دفعات جزئية)
              </p>
            </div>

            {/* 4. Teacher's Net Monthly Earnings */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200 font-bold">صافي أرباح الأستاذ</span>
                <span className="p-1.5 bg-white/10 text-emerald-300 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {teacherNetEarnings.toLocaleString()} <span className="text-xs font-normal text-blue-200">شيكل صافي</span>
              </div>
              <p className="text-[10px] text-blue-200">
                بعد خصم تكلفة منصة دقة (5 ₪ فقط لكل طالب = {teacherPlatformFee} ₪)
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل دفعة جديدة لطالب</span>
              </button>

              <button
                onClick={() => {
                  notify('تم إرسال رسائل تذكير لطيفة عبر الواتساب لـ 16 ولي أمر لديهم رسوم متأخرة.');
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>تذكير جماعي للمتأخرين واتساب</span>
              </button>

              <button
                onClick={() => notify('تم تصدير كشف الحساب المالي بصيغة Excel لكافة المجموعات')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>تصدير كشف إكسل (Excel)</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>إيصالات وسندات القبض تصدر آلياً برمز استجابة QR</span>
            </div>
          </div>

          {/* Student Tuition Roster with Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-[#1E3A5F] text-base">
                  كشف حسابات ورسوم الطلاب الخصوصيين ({filteredTuitions.length} طالب)
                </h3>
                <p className="text-xs text-slate-500">
                  متابعة حالة سداد كل طالب، إصدار سند القبض الفوري، وسجل الأقساط الشهرية
                </p>
              </div>

              {/* Status and Group Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الطالب أو رقم الجوال..."
                    className="pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs w-52 focus:bg-white transition-colors"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    مسدد
                  </button>
                  <button
                    onClick={() => setStatusFilter('partial')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      statusFilter === 'partial' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    جزئي
                  </button>
                  <button
                    onClick={() => setStatusFilter('unpaid')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      statusFilter === 'unpaid' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    متأخر
                  </button>
                </div>
              </div>
            </div>

            {/* Tuition Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">اسم الطالب والمجموعة</th>
                    <th className="p-3">رقم جوال ولي الأمر</th>
                    <th className="p-3 text-center">الرسم الشهري</th>
                    <th className="p-3 text-center">المدفوع</th>
                    <th className="p-3 text-center">المتبقي</th>
                    <th className="p-3 text-center">حالة السداد</th>
                    <th className="p-3 text-center">سند القبض</th>
                    <th className="p-3 text-center">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTuitions.map((tui) => {
                    const remaining = tui.monthlyFee - tui.paidAmount;
                    return (
                      <tr key={tui.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <strong className="block text-slate-900 font-bold">{tui.studentName}</strong>
                          <span className="text-[11px] text-slate-500">{tui.group}</span>
                        </td>

                        <td className="p-3 font-mono text-slate-600 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{tui.parentPhone}</span>
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                          {tui.monthlyFee} ₪
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-emerald-700 tabular-nums">
                          {tui.paidAmount} ₪
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-rose-600 tabular-nums">
                          {remaining > 0 ? `${remaining} ₪` : '0 ₪'}
                        </td>

                        <td className="p-3 text-center">
                          {tui.status === 'paid' && (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              مسدد بالكامل
                            </span>
                          )}
                          {tui.status === 'partial' && (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              سداد جزئي ({tui.paidAmount} ₪)
                            </span>
                          )}
                          {tui.status === 'unpaid' && (
                            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              غير مسدد (متأخر)
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {tui.receiptNumber ? (
                            <button
                              onClick={() => setSelectedReceipt(tui)}
                              className="text-blue-700 hover:text-blue-900 font-mono font-bold text-[11px] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              title="عرض وطباعة سند القبض الإلكتروني"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{tui.receiptNumber}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {tui.status !== 'paid' ? (
                              <>
                                <button
                                  onClick={() => handleSendReminder(tui)}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                  title="إرسال تذكير سداد على الواتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>تذكير</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setPaymentForm({
                                      studentId: tui.studentId,
                                      amount: remaining,
                                      paymentMethod: 'نقداً (يد بيد)',
                                      notes: `سداد متبقي قسط نوفمبر`,
                                    });
                                    setShowAddPaymentModal(true);
                                  }}
                                  className="p-1.5 bg-[#1E3A5F] hover:bg-[#152a45] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  title="تسجيل دفعة سريعة"
                                >
                                  + دفعة
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setSelectedReceipt(tui)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                <span>طباعة السند</span>
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TEACHER'S SUBSCRIPTION TO DAQQA PLATFORM */}
      {/* ========================================================= */}
      {activeMainTab === 'platform_subscription' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div>
              <h2 className="font-extrabold text-[#1E3A5F] text-base">فاتورة استخدام منصة دقة</h2>
              <p className="text-xs text-blue-900">
                تسديد رسوم الذكاء الاصطناعي والتصحيح التلقائي البالغة (5 شواكل فقط لكل طالب نشط شهرياً)
              </p>
            </div>
            <button
              onClick={() => setShowReceiptModal(true)}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-2xs"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>رفع إيصال تحويل البنك للمنصة</span>
            </button>
          </div>

          {receiptUploaded && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تم رفع إيصال التحويل بنجاح! سيتم مراجعته وتأكيده من إدارة المنصة خلال ساعتين.</span>
            </div>
          )}

          {/* 3 Metric Summary Cards for Platform Plan / School Contract */}
          {isSchool ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                <span className="text-xs text-slate-400">نوع العقد المؤسسي</span>
                <h3 className="text-lg font-black text-[#1E3A5F]">عقد سنوي للمدرسة</h3>
                <p className="text-[11px] text-slate-500">50 ₪ للطالب سنوياً (يسدد على دفعتين متساويتين)</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                <span className="text-xs text-slate-400">الطلاب المسجلون والمعلمون</span>
                <div className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">
                  450 <span className="text-sm font-normal text-slate-500">طالباً</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-bold">14 معلماً مفعلاً بالمنصة</p>
              </div>

              <div className="bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-2xs space-y-1 bg-emerald-50/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-900 font-bold">دفعة الفصل الأول (11,250 ₪)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">مدفوعة ✓</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums pt-1">
                  الدفعة القادمة: 11,250 <span className="text-xs font-bold">₪</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  استحقاق الفصل الثاني: <strong className="font-mono">1 فبراير 2027</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                <span className="text-xs text-slate-400">الباقة النشطة الحالية</span>
                <h3 className="text-lg font-black text-[#1E3A5F]">{CURRENT_TEACHER.currentPlan}</h3>
                <p className="text-[11px] text-slate-500">حساب معتمد · 5 شواكل للطالب شهرياً</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
                <span className="text-xs text-slate-400">الطلاب النشطون هذا الشهر</span>
                <div className="text-3xl font-black text-[#1E3A5F] font-mono tabular-nums">
                  {CURRENT_TEACHER.totalStudents} <span className="text-sm font-normal text-slate-500">طالب</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-bold">موزعون على 4 مجموعات دراسية</p>
              </div>

              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 shadow-2xs space-y-1 bg-blue-50/20">
                <span className="text-xs text-blue-900 font-bold">المبلغ المستحق لدقة (الدورة الحالية)</span>
                <div className="text-3xl font-black text-blue-900 font-mono tabular-nums">
                  {CURRENT_TEACHER.monthlyDue} <span className="text-sm font-bold">شيكل</span>
                </div>
                <p className="text-[11px] text-blue-700 font-medium">
                  تاريخ الاستحقاق: <strong className="font-mono">{CURRENT_TEACHER.dueDate}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Bank & Digital Wallet Transfer Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#1E3A5F] text-base flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-700" />
              <span>بيانات تحويل اشتراك منصة دقة (غزة - فلسطين)</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              يرجى تحويل رسوم الاشتراك (900 شيكل) عبر أحد الحسابات المعتمدة أدناه، ثم الضغط على زر «رفع إيصال التحويل»:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="block text-slate-800 font-sans text-sm">حساب بنك فلسطين (Bank of Palestine)</strong>
                <p className="text-slate-600 font-sans">اسم الحساب: شركة دقة للحلول التعليمية والذكاء الاصطناعي</p>
                <div className="text-[#1E3A5F] font-bold pt-1">
                  رقم الحساب: 1234567 · فرع الرمال (045)
                </div>
                <div className="text-slate-500 text-[11px]">
                  IBAN: PS04 PALS 0000 0000 0001 2345 6700
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <strong className="block text-slate-800 font-sans text-sm">المحفظة الإلكترونية (جوال باي / بال باي)</strong>
                <p className="text-slate-600 font-sans">رقم المحفظة المعتمد لدى جوال باي:</p>
                <div className="text-emerald-700 font-bold text-sm pt-1">
                  0599-123456 (Jawwal Pay)
                </div>
                <div className="text-slate-500 text-[11px] font-sans">
                  يُرجى كتابة اسم المعلم في خانة ملاحظة التحويل.
                </div>
              </div>
            </div>
          </div>

          {/* Past Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-[#1E3A5F] text-base">سجل فواتير المعلم المسددة لمنصة دقة</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F8FA] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">الشهر الدراسي</th>
                    <th className="p-3 text-center">الطلاب النشطون</th>
                    <th className="p-3 text-center">المبلغ</th>
                    <th className="p-3">تاريخ الدفع</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">تحميل الإشعار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{inv.id}</td>
                      <td className="p-3 text-slate-700 font-semibold">{inv.month}</td>
                      <td className="p-3 text-center font-mono tabular-nums">{inv.students} طالب</td>
                      <td className="p-3 text-center font-mono font-bold text-[#1E3A5F] tabular-nums">
                        {inv.amount} ₪
                      </td>
                      <td className="p-3 font-mono text-slate-500">{inv.date}</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مدفوعة
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => notify(`تحميل فاتورة ${inv.id} بصيغة PDF`)}
                          className="text-blue-700 hover:underline font-bold cursor-pointer"
                        >
                          PDF
                        </button>
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
      {/* MODAL: ELECTRONIC RECEIPT VOUCHER (سند قبض إلكتروني) */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right">
            {/* Receipt Header Banner */}
            <div className="bg-[#1E3A5F] text-white p-5 flex items-center justify-between border-b-4 border-emerald-500">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-base">
                  دِقّـة
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">سند قبض مالي إلكتروني</h3>
                  <p className="text-[11px] text-blue-200">أ. محمد المصري — مدرس الرياضيات للتوجيهي</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Serial & Date Meta */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">رقم السند:</span>
                  <span className="font-bold text-[#1E3A5F] text-sm">{selectedReceipt.receiptNumber || 'REC-2026-9021'}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">تاريخ القبض:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.lastPaymentDate || '5 نوفمبر 2026'}</span>
                </div>
              </div>

              {/* Student Details */}
              <div className="space-y-3 border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">وصلنا من الطالب/ـة:</span>
                  <strong className="text-sm font-black text-slate-900">{selectedReceipt.studentName}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">المجموعة والشعبة:</span>
                  <span className="font-bold text-slate-700">{selectedReceipt.group}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">رقم جوال ولي الأمر:</span>
                  <span className="font-mono text-slate-700">{selectedReceipt.parentPhone}</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-800 block">المبلغ المقبوض:</span>
                    <strong className="text-lg font-mono font-black text-emerald-700">{selectedReceipt.paidAmount} شيكل</strong>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    {selectedReceipt.paidAmount === 150 ? 'مائة وخمسون شيكلاً فقط' : `${selectedReceipt.paidAmount} شيكل فقط`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">وذلك عن:</span>
                  <span className="font-medium text-slate-800">{selectedReceipt.notes || 'قسط دورة التوجيهي لشهر نوفمبر 2026'}</span>
                </div>
              </div>

              {/* QR Verification & Stamp */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-[#1E3A5F]" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 text-[11px] block">سند موثق إلكترونياً</span>
                    <span className="text-[10px] text-slate-500 block">امسح الكود للتحقق من صحة السند المالي</span>
                  </div>
                </div>

                <div className="text-center font-bold text-emerald-700 border-2 border-emerald-500 border-dashed rounded-lg px-2.5 py-1 text-[11px]">
                  تم السداد بنجاح ✓
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  notify(`تم إرسال سند القبض ${selectedReceipt.receiptNumber} لولي الأمر على واتساب رقم: ${selectedReceipt.parentPhone}`);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال السند لولي الأمر (WhatsApp)</span>
              </button>

              <button
                onClick={() => notify('تم إرسال أمر طباعة سند القبض')}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD STUDENT PAYMENT (تسجيل دفعة جديدة) */}
      {/* ========================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 my-auto text-right">
            <div className="bg-[#1E3A5F] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base">تسجيل دفعة مالية جديدة لطالب</h3>
              </div>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">اختر الطالب:</label>
                <select
                  value={paymentForm.studentId}
                  onChange={(e) => {
                    const chosen = tuitionRecords.find(t => t.studentId === e.target.value);
                    const remaining = chosen ? chosen.monthlyFee - chosen.paidAmount : 150;
                    setPaymentForm(prev => ({ ...prev, studentId: e.target.value, amount: remaining > 0 ? remaining : 150 }));
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
                >
                  {tuitionRecords.map(t => (
                    <option key={t.studentId} value={t.studentId}>
                      {t.studentName} — ({t.group}) [المتبقي: {t.monthlyFee - t.paidAmount} ₪]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">المبلغ المدفوع (شيكل):</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">طريقة الاستلام:</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="نقداً (يد بيد)">نقداً (يد بيد في الحصة)</option>
                  <option value="محفظة جوال باي (Jawwal Pay)">محفظة جوال باي (Jawwal Pay)</option>
                  <option value="حوالة بنك فلسطين">حوالة بنك فلسطين</option>
                  <option value="بال باي (PalPay)">بال باي (PalPay)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">ملاحظات أو بيان السند:</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="مثال: قسط شهر نوفمبر 2026 مسدد بالكامل"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="font-bold">المميزات التلقائية عند التسجيل:</div>
                <p>• سيتم توليد سند قبض رسمي فوري برقم متسلسل</p>
                <p>• إمكانية إرسال السند لولي الأمر على الواتساب بضغطة زر واحدة</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                >
                  تأكيد وقبض المبلغ وإصدار السند
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPLOAD RECEIPT FOR PLATFORM SUBSCRIPTION */}
      {/* ========================================================= */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#1E3A5F]">رفع إشعار تحويل البنك / المحفظة لمنصة دقة</h3>
            <p className="text-xs text-slate-600">
              ارفع صورة الإيصال المالي أو لقطة شاشة التحويل من تطبيق بنك فلسطين أو جوال باي:
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600 font-medium">اختر صورة الإشعار (JPG, PNG)</div>
            </div>

            <div className="text-xs space-y-2">
              <label className="block text-slate-700 font-bold">ملاحظات التحويل (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: تحويل اشتراك شهر نوفمبر 2026 - أ. محمد المصري"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setReceiptUploaded(true);
                  setShowReceiptModal(false);
                }}
                className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg font-bold text-xs cursor-pointer"
              >
                تأكيد الرفع
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg font-medium text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
