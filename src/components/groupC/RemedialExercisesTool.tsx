import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { MOCK_STUDENTS, MOCK_GROUPS, MOCK_EXAMS } from '../../mockData';
import {
  Sparkles,
  ArrowRight,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  MessageCircle,
  HelpCircle,
  Check
} from 'lucide-react';

interface RemedialExercisesToolProps {
  onNavigate: (screen: ScreenId) => void;
}

export const RemedialExercisesTool: React.FC<RemedialExercisesToolProps> = ({ onNavigate }) => {
  const [scope, setScope] = useState<'single_student' | 'whole_group'>('single_student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('s2'); // محمود خليل البطش
  const [selectedGroupId, setSelectedGroupId] = useState<string>('g1');
  const [selectedExamId, setSelectedExamId] = useState<string>('ex1');
  const [groupSheetMode, setGroupSheetMode] = useState<'individual' | 'combined'>('individual');
  const [sentSuccess, setSentSuccess] = useState(false);

  const student = MOCK_STUDENTS.find(s => s.id === selectedStudentId) || MOCK_STUDENTS[0];

  const remedialExercises = [
    {
      num: 1,
      difficulty: 'سهل (تثبيت مفهوم)',
      text: 'إذا كان س² + 3ص² = 12، جد دص/دس عند النقطة (0, 2).',
      answerKey: '2س + 6ص ص\' = 0  ⇒  عند (0, 2): 0 + 12 ص\' = 0  ⇒  ص\' = 0.',
    },
    {
      num: 2,
      difficulty: 'متوسط (وزاري مع كسر)',
      text: 'إذا كان س / ص + ص / س = 2، أوجد دص/دس عند النقطة (1, 1).',
      answerKey: 'نوحد المقامات: س² + ص² = 2س ص. بالاشتقاق: 2س + 2ص ص\' = 2ص + 2س ص\'. عند (1, 1) المشتقة = 1.',
    },
    {
      num: 3,
      difficulty: 'متوسط (تطبيق المشتقة الثانية)',
      text: 'إذا كان س³ - ص³ = 1، أثبت أن ص\'\' = -2س / ص⁵.',
      answerKey: '3س² - 3ص² ص\' = 0  ⇒  ص\' = س²/ص². ص\'\' = (2س ص² - س²(2ص ص\')) / ص⁴ = (2س ص³ - 2س⁴) / ص⁵ = -2س/ص⁵.',
    },
    {
      num: 4,
      difficulty: 'متقدم (متميزين)',
      text: 'جد معادلة المماس لمنحنى العلاقة الضمنية جا(س ص) = س عند النقطة (1, ط/2).',
      answerKey: 'جتا(س ص) * (ص + س ص\') = 1. عند (1, ط/2): جتا(ط/2)=0، الميل غير معرّف والمعادلة س = 1.',
    },
  ];

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمركز الأدوات الذكية</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">
            تمارين علاجية وشرح أخطاء الطلاب
          </h1>
          <p className="text-xs text-slate-500">
            توليد أوراق تدريبية علاجية تستهدف نقاط الضعف المرصودة في الامتحان مع شرح مباشر للأخطاء.
          </p>
        </div>

        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
          متاح الآن
        </span>
      </div>

      {/* Scope & Exam Selection Form (PDF requirement: طالب واحد / مجموعة كاملة، ثم الامتحان المرجعي) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h2 className="font-bold text-slate-900 text-sm">تحديد نطاق التمارين العلاجية</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">النطاق</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope('single_student')}
                className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  scope === 'single_student' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                طالب واحد
              </button>
              <button
                type="button"
                onClick={() => setScope('whole_group')}
                className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  scope === 'whole_group' ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                مجموعة كاملة
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {scope === 'single_student' ? 'اختر الطالب' : 'اختر المجموعة'}
            </label>
            {scope === 'single_student' ? (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold"
              >
                {MOCK_STUDENTS.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.latestScore}%)</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold"
              >
                {MOCK_GROUPS.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">الامتحان المرجعي للتحليل</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold"
            >
              {MOCK_EXAMS.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Automatic Weakness Summary Banner (PDF requirement: ملخص تلقائي: نقاط الضعف: الاشتقاق الضمني 40%، النهايات 55%) */}
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <strong className="block text-red-900 font-bold">
                ملخّص تشخيص نقاط الضعف التلقائي:
              </strong>
              <span>
                الاشتقاق الضمني والمشتقات العليا (إتقان 40%) · النهايات والاتصال (إتقان 55%)
              </span>
            </div>
          </div>
          <span className="text-[11px] bg-white border border-red-200 text-red-700 px-2 py-1 rounded font-bold shrink-0">
            محدد تلقائياً من إجابات الامتحان
          </span>
        </div>
      </div>

      {/* Error Explanation Section (PDF requirement: قسم "شرح الخطأ": إجابته، الإجابة الصحيحة، وشرح قصير لماذا أخطأ وكيف يحل) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-[#1E3A5F] text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>قسم شرح الخطأ في الامتحان: كيف يحل الطالب المسألة بالشكل الصحيح؟</span>
        </h3>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
          <div className="font-bold text-slate-900 border-b border-slate-200 pb-2">
            السؤال الأول: إذا كان س² + ص² = 25، أوجد د²ص / دس² عند النقطة (3, 4).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student's Wrong Answer */}
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg space-y-1">
              <span className="text-red-700 font-bold block text-[11px]">إجابة الطالب في الورقة:</span>
              <p className="font-mono text-red-900 text-[11px] leading-relaxed">
                ص'' = (-4 - 3(-3/4)) / 16 = (-4 + 9/4) / 16 = -7 / 64
              </p>
            </div>

            {/* Correct Model Answer */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
              <span className="text-emerald-700 font-bold block text-[11px]">الإجابة الوزارية النموذجية:</span>
              <p className="font-mono text-emerald-900 text-[11px] leading-relaxed">
                ص'' = (-ص² - س²) / ص³ = -25 / 64
              </p>
            </div>
          </div>

          {/* Explanation Why it happened & How to solve */}
          <div className="p-3 bg-white border border-blue-200 rounded-lg text-slate-800 space-y-1 text-[11px]">
            <strong className="block text-[#1E3A5F] font-bold">لماذا أخطأ الطالب وكيف يحل؟</strong>
            <p className="leading-relaxed">
              «أخطأ الطالب في توحيد مقامات بسط الكسر: -4 + 9/4 = -16/4 + 9/4 = -7/4 بدلاً من التعويض المباشر بالمعادلة الأصلية س² + ص² = 25. الأسهل دائماً في المشتقة الثانية للدائرة ضرب البسط والمقام في (ص) للاستفادة من معادلة المنحنى المعطاة».
            </p>
          </div>
        </div>
      </div>

      {/* Remedial Exercises List (PDF requirement: 5-10 تمارين متدرجة الصعوبة مع مفتاح الحل منفصلاً) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-[#1E3A5F] text-base">
              التمارين العلاجية المقترحة (متدرّجة الصعوبة)
            </h3>
            <p className="text-xs text-slate-500">تمارين موجهة لعلاج خلل الاشتقاق الضمني وتوحيد المقامات</p>
          </div>
          <span className="text-xs bg-blue-50 text-[#1E3A5F] font-bold px-2.5 py-1 rounded-lg">
            4 مسائل متدرجة
          </span>
        </div>

        <div className="space-y-3">
          {remedialExercises.map((ex) => (
            <div
              key={ex.num}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">مسألة {ex.num}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                  {ex.difficulty}
                </span>
              </div>
              <p className="font-medium text-slate-800 text-[12px]">{ex.text}</p>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px]">
                <strong className="text-slate-800 font-sans block mb-0.5">مفتاح الحل المنفصل:</strong>
                {ex.answerKey}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export & WhatsApp Dispatch Buttons (PDF requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {scope === 'whole_group' ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">خيارات تصدير المجموعة:</span>
            <button
              onClick={() => setGroupSheetMode('individual')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                groupSheetMode === 'individual' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              ورقة مخصصة لكل طالب (حسب ضعفه)
            </button>
            <button
              onClick={() => setGroupSheetMode('combined')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                groupSheetMode === 'combined' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              ورقة واحدة موحدة للمجموعة
            </button>
          </div>
        ) : (
          <span className="text-slate-500 font-medium">
            تصدير للطالب: <strong>{student.name}</strong>
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('تم تصدير ورقة التمارين العلاجية مع مفتاح الحل بصيغة PDF!')}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تحميل PDF</span>
          </button>

          <button
            onClick={() => {
              setSentSuccess(true);
              setTimeout(() => setSentSuccess(false), 2500);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{sentSuccess ? 'تم الإرسال على واتساب ✓' : 'إرسال على واتساب'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
