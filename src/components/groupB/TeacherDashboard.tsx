import React from 'react';
import { ScreenId } from '../../types';
import { useActiveOrg, useLoad } from '../../data/DataContext';
import { setSelected } from '../../data/selection';
import { useAuth } from '../../lib/auth';
import { PLATFORM_CONFIG, CURRENT_TEACHER } from '../../mockData';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Send,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  Camera,
  Wallet,
  Target
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenAI: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate, onOpenAI }) => {
  const auth = useAuth();
  const org = useActiveOrg();
  const dashQ = useLoad((st) => st.getDashboard());
  const examsQ = useLoad((st) => st.listAssessments());
  const d = dashQ.data;
  const recentExams = (examsQ.data ?? []).slice(0, 5);
  const teacherName = auth.mode === 'real' ? auth.profile?.fullName || org.principalOrOwnerName || '' : CURRENT_TEACHER.name;
  const money = (n: number) => `${Math.round(n).toLocaleString('en-US')} ${PLATFORM_CONFIG.currencySymbol}`;
  const open = (examId: string, screen: ScreenId) => {
    setSelected('exam', examId);
    onNavigate(screen);
  };
  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting + Prominent CTA (PDF requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              لوحة المتابعة اليومية
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{org.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E3A5F] mt-1">
            مرحباً بك{teacherName ? `، ${teacherName}` : ''} 👋
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            لديك <strong>{d?.groupsCount ?? '…'} مجموعات</strong> تضم <strong>{d?.studentsCount ?? '…'} طالباً</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('B15')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            title="تحليلات تشخيصية معمقة: أين تركز في الحصة القادمة وما الذي تتركه"
          >
            <Target className="w-4 h-4 text-indigo-200" />
            <span>تشخيص (افهم طلابك)</span>
          </button>
          <button
            onClick={() => onNavigate('B5')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            title="صوّر ورقة الامتحان المكتوبة بخط اليد بالهاتف لتوليد الأسئلة فورياً"
          >
            <Camera className="w-4 h-4" />
            <span>تصوير امتحان</span>
          </button>
          <button
            onClick={() => onNavigate('B7')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-98"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>رفع أوراق</span>
          </button>
          <button
            onClick={() => onNavigate('B5')}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            + إنشاء يدوي
          </button>
        </div>
      </div>

      {/* 4 Metric Cards (PDF requirement: أوراق هذا الأسبوع، بانتظار مراجعتك بالبرتقالي، متوسط الدرجات، تقارير أرسلت) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>أوراق هذا الأسبوع</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-[#1E3A5F] tabular-nums">{d?.papersThisWeek ?? '…'}</div>
          <p className="text-[11px] text-slate-500">ورقة رُفعت خلال 7 أيام</p>
        </div>

        {/* Card 2: Awaiting Review in Amber (#D97706) */}
        <div 
          onClick={() => onNavigate('B8')}
          className="bg-amber-50/70 border-2 border-amber-400/80 rounded-xl p-4 space-y-1 shadow-2xs cursor-pointer hover:bg-amber-50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>بانتظار مراجعتك</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#D97706] tabular-nums">{d?.answersAwaitingReview ?? '…'} إجابة</div>
          <p className="text-[11px] text-amber-800 font-medium">في {d?.papersAwaitingReview ?? 0} ورقة بانتظار اعتمادك</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>متوسط درجات الطلاب</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#1E3A5F] tabular-nums">{d?.avgPct != null ? `${d.avgPct}%` : '—'}</div>
          <p className={`text-[11px] font-medium ${d?.avgPctChange != null && d.avgPctChange < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {d?.avgPctChange != null ? `${d.avgPctChange > 0 ? '+' : ''}${d.avgPctChange}% مقارنة بالشهر السابق` : 'آخر 30 يوماً'}
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>تقارير أُرسلت للأهالي</span>
            <Send className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#1E3A5F] tabular-nums">{d?.reportsSent ?? '…'} تقرير</div>
          <p className="text-[11px] text-slate-500">عبر رسائل واتساب المباشرة</p>
        </div>
      </div>

      {/* Tuition quick bar (owners only) */}
      {d?.tuition && (
      <div className="bg-gradient-to-r from-[#1E3A5F] via-slate-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              <span>نظام المعلم المالي ورسوم الطلاب</span>
            </span>
            <span className="text-emerald-400 font-mono text-xs font-bold">نسبة التحصيل: {d.tuition.pct}%</span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base">
            تم تحصيل {money(d.tuition.collected)} من رسوم الطلاب لهذا الشهر
          </h3>
          <p className="text-xs text-slate-300">
            متبقي {money(d.tuition.remaining)} ({d.tuition.unpaidStudents} طالباً)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => onNavigate('B11')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>إدارة الرسوم وسندات القبض</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>

      )}

      {/* Main Grid: Recent Exams List + Weakest Lessons Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams List (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-[#1E3A5F] text-base">آخر الامتحانات والواجبات</h2>
            <button
              onClick={() => onNavigate('B4')}
              className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
            >
              عرض جميع الامتحانات ←
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentExams.length === 0 && !examsQ.loading && (
              <p className="py-6 text-center text-xs text-slate-500">لا توجد امتحانات بعد. ابدأ بإنشاء أول امتحان.</p>
            )}
            {recentExams.map((exam) => (
              <div
                key={exam.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg px-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{exam.title}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                      {exam.group.split('(')[0]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>التاريخ: {exam.date}</span>
                    <span>·</span>
                    <span className="tabular-nums">
                      الأوراق المرفوعة: <strong>{exam.uploadedCount} / {exam.totalStudents}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Status Badge */}
                  {exam.status === 'needs_review' && (
                    <button
                      onClick={() => open(exam.id, 'B8')}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      يحتاج مراجعة
                    </button>
                  )}
                  {exam.status === 'completed' && (
                    <button
                      onClick={() => open(exam.id, 'B9')}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-900 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      مكتمل · عرض النتائج
                    </button>
                  )}
                  {exam.status === 'reports_sent' && (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      أُرسلت التقارير
                    </span>
                  )}
                  {exam.status === 'awaiting_papers' && (
                    <button
                      onClick={() => open(exam.id, 'B7')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      بانتظار الأوراق
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weakest 3 Lessons Card (PDF requirement: بطاقة أضعف 3 دروس مع نسبة الإتقان لكل درس) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-[#1E3A5F] text-sm">أضعف 3 دروس في مجموعاتك</h2>
              <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded">
                تتطلب إعادة شرح
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {(d?.weakLessons ?? []).length === 0 && (
                <p className="text-slate-500">تظهر هنا أضعف الدروس بعد اعتماد أول امتحان مربوط بدروس المنهج.</p>
              )}
              {(d?.weakLessons ?? []).map((l, i) => (
                <div key={l.lesson} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 min-w-0 break-words">{i + 1}. {l.lesson}</span>
                    <span className={`font-mono font-bold tabular-nums shrink-0 ${l.mastery < 50 ? 'text-red-600' : 'text-amber-600'}`}>{l.mastery}% إتقان</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${l.mastery < 50 ? 'bg-red-500' : 'bg-amber-500'} h-full rounded-full`} style={{ width: `${l.mastery}%` }} />
                  </div>
                  {l.commonMiss && <p className="text-[10px] text-slate-500 break-words">أشيع خطأ: {l.commonMiss}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('B15')}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Target className="w-4 h-4 text-indigo-600" />
              <span>تقرير تشخيص الطلاب الكامل (أين تركز؟)</span>
            </button>
            <button
              onClick={() => onNavigate('C2')}
              className="w-full bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>توليد تمارين علاجية لهؤلاء الطلاب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
