import React from 'react';
import { ScreenId } from '../../types';
import { useLoad } from '../../data/DataContext';
import {
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Sparkles,
  MessageCircle,
  AlertTriangle,
  Award,
  ChevronLeft,
  BookOpen
} from 'lucide-react';

interface StudentProfilePageProps {
  studentId: string;
  onNavigate: (screen: ScreenId) => void;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  studentId,
  onNavigate,
}) => {
  const studentQ = useLoad((st) => st.getStudent(studentId), [studentId]);
  const historyQ = useLoad((st) => st.getStudentHistory(studentId), [studentId]);
  const student = studentQ.data;
  const papers = historyQ.data?.papers ?? [];
  const pct = (p: { score: number; total: number }) => (p.total ? Math.round((p.score / p.total) * 100) : 0);
  // Oldest first for the trajectory.
  const examHistory = [...papers].reverse().map((p) => ({ name: p.title, score: pct(p), date: p.date }));
  const lessonMastery = (historyQ.data?.lessons ?? []).map((l) => ({
    lesson: l.lesson,
    mastery: l.mastery,
    status: l.mastery >= 80 ? 'strong' : l.mastery >= 65 ? 'medium' : 'weak',
  }));
  const weakest = lessonMastery.find((l) => l.status === 'weak') ?? lessonMastery.find((l) => l.status === 'medium');
  const trend =
    examHistory.length < 2 ? null : examHistory[examHistory.length - 1].score >= examHistory[examHistory.length - 2].score ? 'up' : 'down';
  // An honest range only after enough exams: average ± spread, never a single number.
  const expectedRange = (() => {
    if (examHistory.length < 3) return null;
    const scores = examHistory.map((e) => e.score);
    const avg = scores.reduce((n, x) => n + x, 0) / scores.length;
    const spread = Math.max(3, Math.round(Math.sqrt(scores.reduce((n, x) => n + (x - avg) ** 2, 0) / scores.length)));
    return `${Math.max(0, Math.round(avg - spread))} - ${Math.min(100, Math.round(avg + spread))}`;
  })();

  if (studentQ.loading && !student) {
    return <div className="py-24 text-center text-sm text-slate-500">جاري تحميل ملف الطالب...</div>;
  }
  if (!student) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm text-slate-600">{studentQ.error ?? 'لم نجد هذا الطالب.'}</p>
        <button onClick={() => onNavigate('B2')} className="text-xs font-bold text-[#1E3A5F] underline cursor-pointer">العودة لقائمة الطلاب</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right">
      {/* Back button + Student Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('B2')}
          className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة الطلاب</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1E3A5F]">{student.name}</h1>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono tabular-nums">
                رمز: {student.studentCode}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              المجموعة: <strong>{student.group}</strong> · هاتف ولي الأمر: <strong className="font-mono">{student.parentPhone}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('C2')}
              className="bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>إنشاء تمارين علاجية لهذا الطالب</span>
            </button>
            <button
              onClick={() => onNavigate('B12')}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>معاينة الورقة المصححة</span>
            </button>
          </div>
        </div>

        {/* Expected Tawjihi Grade Range [تجريبي] (PDF requirement page 13: نطاق لا رقم واحد e.g. 78-85 مع جملة تقدير مبني على 6 امتحانات وليس ضماناً) */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#1E3A5F]" />
              <span className="text-xs font-bold text-[#1E3A5F]">
                العلامة المتوقعة في امتحان الثانوية العامة (التوجيهي)
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                تجريبي
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              {expectedRange
                ? '«تقدير مبني على سجل امتحانات الطالب، وليس ضماناً». يظهر للمدرّس فقط.'
                : 'يظهر التقدير بعد تصحيح 3 امتحانات على الأقل للطالب. يظهر للمدرّس فقط.'}
            </p>
          </div>

          <div className="bg-white border border-blue-200 px-4 py-2 rounded-lg text-center shrink-0">
            <span className="text-[10px] text-slate-400 block">النطاق التقديري المتوقع</span>
            <span className="text-xl font-black text-[#1E3A5F] font-mono tabular-nums">
              {expectedRange ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Trajectory Graph & Strengths/Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trajectory Graph across exams */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>مسار درجات الطالب عبر الامتحانات السابقة</span>
            </h3>
            {trend === 'up' && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">مسار صاعد ↗</span>
            )}
            {trend === 'down' && (
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">مسار هابط ↘</span>
            )}
          </div>

          {/* Simple Visual Line Chart Bars */}
          <div className="space-y-3 pt-2">
            {examHistory.length === 0 && <p className="text-xs text-slate-500">لا توجد امتحانات معتمدة لهذا الطالب بعد.</p>}
            {examHistory.map((ex, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-medium">{ex.name}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-slate-400 text-[11px]">{ex.date}</span>
                    <strong className="text-[#1E3A5F] text-sm">{ex.score}%</strong>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E3A5F] h-full rounded-full transition-all"
                    style={{ width: `${ex.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strength & Weakness Breakdown by Lesson */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>نقاط القوة والضعف بحسب المهارات والدروس</span>
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {lessonMastery.length === 0 && <p className="text-xs text-slate-500">تظهر نقاط القوة والضعف بعد تصحيح أول امتحان مربوط بدروس المنهج.</p>}
            {lessonMastery.map((lm, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{lm.lesson}</span>
                  <span className={`font-mono font-bold tabular-nums ${
                    lm.status === 'strong' ? 'text-emerald-600' : lm.status === 'medium' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {lm.mastery}% إتقان
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      lm.status === 'strong' ? 'bg-emerald-500' : lm.status === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${lm.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {weakest && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                نصيحة للمعلم: ركّز مع {student.name} في الجلسة القادمة على درس «{weakest.lesson}» (إتقانه {weakest.mastery}%).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* List of Corrected Exam Papers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-[#1E3A5F] text-sm">أوراق الطالب المصححة في المنصة</h3>
        <div className="divide-y divide-slate-100">
          {papers.length === 0 && <p className="py-3 text-xs text-slate-500">لا توجد أوراق مصححة ومعتمدة بعد.</p>}
          {papers.map((p) => (
            <div key={p.submissionId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-slate-800">{p.title}</h4>
                <p className="text-[11px] text-slate-500">تم التصحيح والاعتماد بتاريخ {p.date} · {p.questionsCount} أسئلة</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-sm font-mono tabular-nums ${pct(p) >= 85 ? 'text-emerald-600' : pct(p) >= 65 ? 'text-amber-600' : 'text-red-600'}`}>
                  {p.score} / {p.total}
                </span>
                <button
                  onClick={() => onNavigate('B12')}
                  className="bg-blue-50 hover:bg-blue-100 text-[#1E3A5F] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  عرض الورقة المصححة
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
