import React, { useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { useLoad } from '../../data/DataContext';
import { setSelected } from '../../data/selection';
import { computeDiagnostics } from '../../lib/diagnostics';
import {
  BrainCircuit,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Send,
  Zap,
  Layers,
  ChevronLeft,
  FileText,
  Clock,
  Award,
  Flame,
  HelpCircle,
  ThumbsUp,
  XCircle
} from 'lucide-react';

interface TeacherDiagnosticAnalyticsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const TeacherDiagnosticAnalyticsPage: React.FC<TeacherDiagnosticAnalyticsPageProps> = ({ 
  onNavigate 
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const groupsQ = useLoad((st) => st.listGroups());
  const studentsQ = useLoad((st) => st.listStudents());
  const rowsQ = useLoad((st) => st.listDiagnosticRows(selectedGroupId === 'all' ? null : selectedGroupId), [selectedGroupId]);
  const analytics = useMemo(() => computeDiagnostics(rowsQ.data ?? [], studentsQ.data ?? []), [rowsQ.data, studentsQ.data]);
  const activeStudents = (studentsQ.data ?? []).length;

  const openStudent = (id: string) => {
    setSelected('student', id);
    onNavigate('B3');
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              التحليل التشخيصي الذكي لأوراق الطلاب
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-700" />
            <span>لوحة تحليلات الأستاذ التشخيصية: «افهم طلابك»</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            تحليل بيداغوجي معمّق مستخرج من واقع تصحيح أوراق الامتحانات: يوضح لك أين تركّز وأين لا تضيع وقت الحصة، ومكامن الخلل المفاهيمي لدى طلابك، مع خطة تدخل علاجية مخصصة.
          </p>
        </div>

        {/* Group Selector & Quick Parent Report Preview */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start md:self-auto">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 min-w-0"
          >
            <option value="all">كل المجموعات ({activeStudents} طالباً)</option>
            {(groupsQ.data ?? []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <button
            onClick={() => onNavigate('B10')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>تقارير أولياء الأمور</span>
          </button>
        </div>
      </div>

      {/* Global AI Summary Insight Box */}
      <div className="bg-gradient-to-l from-indigo-900 to-[#1E3A5F] text-white rounded-2xl p-5 shadow-md flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-amber-200">الخلاصة:</h4>
          <p className="text-xs text-slate-100 leading-relaxed">
            {rowsQ.loading ? 'جارٍ تحليل الأوراق المعتمدة…' : rowsQ.error ?? analytics.generalInsight}
          </p>
        </div>
      </div>

      {!rowsQ.loading && !rowsQ.error && analytics.papers > 0 && (<>

      {/* SECTION 1: WHERE TO FOCUS VS WHERE NOT TO FOCUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WHERE TO FOCUS (Critical hotspots) */}
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <div className="flex items-center gap-2 text-red-900">
              <Flame className="w-5 h-5 text-red-600" />
              <h3 className="font-black text-base">أين تركّز؟ (بؤر الضعف والخلل)</h3>
            </div>
            <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full">
              يحتاج معالجة في الحصة القادمة
            </span>
          </div>

          <div className="space-y-3.5">
            {analytics.whereToFocus.map(item => (
              <div 
                key={item.id} 
                className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-red-950 text-sm min-w-0">{item.topic}</h4>
                  <span className="bg-red-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md shrink-0">
                    نسبة الخطأ: {item.errorRate}%
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-red-200/60 text-slate-700 leading-relaxed">
                  <strong className="text-red-900 block mb-0.5">ما الذي فاتهم:</strong>
                  {item.reason}
                </div>

                <div className="text-slate-600">
                  <strong className="text-[#1E3A5F]">اقتراح: </strong>
                  {item.recommendation}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* WHERE NOT TO FOCUS (Mastered concepts - Save lesson time) */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <ThumbsUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-base">أين لا تركّز؟ (وفّر وقت حصتك)</h3>
            </div>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              إتقان 85% فأكثر
            </span>
          </div>

          <div className="space-y-3.5">
            {analytics.whereNotToFocus.map(item => (
              <div 
                key={item.id} 
                className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-emerald-950 text-sm min-w-0">{item.topic}</h4>
                  <span className="bg-emerald-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md shrink-0">
                    إتقان: {item.masteryRate}%
                  </span>
                </div>

                <div className="text-slate-600 font-medium">
                  {item.studentMasteryCount} حصلوا على 80% فأكثر في هذا الدرس.
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-emerald-200/60 text-emerald-900 leading-relaxed font-semibold">
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: STUDENT COHORT HEALTH (وضع الطلاب وتشخيص الفئات) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1E3A5F]" />
              <span>تشخيص وضع الطلاب وتوزيع الفئات</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تصنيف طلابك حسب معدلهم في الأوراق المعتمدة
            </p>
          </div>
        </div>

        {/* 3 Metric Cards for Cohorts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Mastery Group */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">فئة الإتقان والتميز</span>
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-900 font-mono">
                {analytics.cohortHealth.masteryGroup.count}
              </span>
              <span className="text-xs text-emerald-700 font-bold font-mono">
                ({analytics.cohortHealth.masteryGroup.percentage}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              معدلهم 85% فأكثر في الأوراق المعتمدة.
            </p>
            <div className="pt-1 text-[11px] text-emerald-900 font-bold">
              الإجراء: أسئلة إثرائية أصعب.
            </div>
          </div>

          {/* 2. Steady Group */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">فئة الاستقرار والمتوسط</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-900 font-mono">
                {analytics.cohortHealth.steadyGroup.count}
              </span>
              <span className="text-xs text-blue-700 font-bold font-mono">
                ({analytics.cohortHealth.steadyGroup.percentage}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              معدلهم بين 60% و85%.
            </p>
            <div className="pt-1 text-[11px] text-blue-900 font-bold">
              الإجراء: تمارين على نقاط الضعف المشتركة.
            </div>
          </div>

          {/* 3. At Risk Group */}
          <div className="bg-red-50/60 border-2 border-red-300 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-800">فئة التدخل العلاجي العاجل</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-900 font-mono">
                {analytics.cohortHealth.atRiskGroup.count}
              </span>
              <span className="text-xs text-red-700 font-bold font-mono">
                ({analytics.cohortHealth.atRiskGroup.percentage}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              معدلهم أقل من 60%.
            </p>
            <div className="pt-1 text-[11px] text-red-900 font-bold">
              الإجراء: متابعة فردية وتمارين علاجية.
            </div>
          </div>
        </div>

        {/* Detailed At-Risk Students Intervention Table */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800">
              الطلاب الأكثر حاجة للمتابعة:
            </h4>
            <button
              onClick={() => onNavigate('C2')}
              className="text-xs text-[#1E3A5F] hover:underline font-bold flex items-center gap-1"
            >
              <span>أوراق تدريب علاجية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analytics.cohortHealth.atRiskGroup.topStudents.map(st => (
              <div key={st.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900">{st.name}</span>
                  <span className="text-red-600 font-mono">{st.score}</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  مكمن الخلل: <strong className="text-slate-700">{st.weakPoint}</strong>
                </div>
                <button
                  onClick={() => openStudent(st.id)}
                  className="w-full bg-white hover:bg-slate-100 border border-slate-300 text-[#1E3A5F] py-1 rounded-lg font-bold text-[11px] transition-colors"
                >
                  فتح ملف الطالب
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEMATIC MISCONCEPTIONS HEATMAP */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <span>خريطة الأخطاء المفاهيمية الشائعة (الأخطاء المنهجية المتكررة)</span>
        </h3>
        <p className="text-xs text-slate-500">
          معايير تصحيح لم يحققها 20% أو أكثر من طلابك
        </p>

        <div className="space-y-3">
          {analytics.commonMisconceptions.map((misc, idx) => (
            <div key={idx} className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">{misc.title}</strong>
                </div>
                <p className="text-slate-600 mr-7">
                  الأثر الامتحاني: <span className="text-red-700 font-semibold">{misc.impact}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 mr-7 sm:mr-0">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-900 block">{misc.affectedCount} طالباً</span>
                  <span className="text-[10px] text-slate-500 font-mono">({misc.percentage}%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: AI ACTION PLAN FOR NEXT WEEK */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="font-black text-base text-amber-300">
            خطة مقترحة للأسبوع القادم
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          خطوات عملية مبنية على نتائج طلابك:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {analytics.actionPlan.map((action, idx) => (
            <div key={idx} className="p-3.5 bg-white/10 rounded-xl border border-white/15 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed text-slate-100">{action}</span>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </div>
  );
};
