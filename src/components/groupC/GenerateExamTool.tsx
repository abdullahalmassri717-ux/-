import React, { useState } from 'react';
import { ScreenId } from '../../types';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Trash2,
  FileCheck2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileText,
  Database,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CURRICULA_DATA, MOCK_GROUPS, MOCK_TEACHER_FILES } from '../../mockData';
import { notify } from '../../lib/notify';

interface GenerateExamToolProps {
  onNavigate: (screen: ScreenId) => void;
  preselectedLessonIds?: string[];
}

export const GenerateExamTool: React.FC<GenerateExamToolProps> = ({ 
  onNavigate,
  preselectedLessonIds 
}) => {
  // Selected Group
  const [selectedGroupId, setSelectedGroupId] = useState(MOCK_GROUPS[0].id);
  const currentGroup = MOCK_GROUPS.find(g => g.id === selectedGroupId) || MOCK_GROUPS[0];

  // Active Curriculum / Subject
  const curriculum = CURRICULA_DATA.find(c => c.id === currentGroup.curriculumId) || CURRICULA_DATA[0];
  const grade = curriculum.grades.find(g => g.id === currentGroup.gradeId) || curriculum.grades[0];
  const subject = grade.subjects.find(s => s.id === currentGroup.subjectId) || grade.subjects[0];

  const allLessons = subject.units.flatMap(u => u.lessons);

  // Lesson status simulation for this group (lessons up to l_1_4 are taught, l_2_1, l_2_2 taught, l_2_3 not_taught)
  const taughtLessonIds = new Set(['l_1_1', 'l_1_2', 'l_1_3', 'l_1_4', 'l_2_1', 'l_2_2']);

  // Show all lessons toggle (default: taught lessons only)
  const [showAllLessons, setShowAllLessons] = useState(false);

  // Selected lessons for the exam
  const [selectedLessons, setSelectedLessons] = useState<string[]>(
    preselectedLessonIds && preselectedLessonIds.length > 0 
      ? preselectedLessonIds 
      : ['l_1_1', 'l_1_2']
  );

  // Source selection: 'bank_first' | 'new_ai' | 'mixed'
  const [sourceMode, setSourceMode] = useState<'bank_first' | 'new_ai' | 'mixed'>('mixed');

  // Depend on teacher's uploaded files toggle
  const [useTeacherFiles, setUseTeacherFiles] = useState(true);

  // Exam configuration
  const [qCount, setQCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [duration, setDuration] = useState('45 دقيقة');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated questions list
  const [questions, setQuestions] = useState([
    {
      id: 'q_gen_1',
      lessonId: 'l_1_1',
      lessonTitle: 'متوسط التغير',
      outcome: 'حساب متوسط تغير الاقتران وتفسيره هندسياً وفيزيائياً',
      text: 'إذا كان ق(س) = س² + 3س، وكان متوسط تغير الاقتران ق(س) عندما تتغير س من 1 إلى 3 يساوي 7، فتحقق من صحة القيمة هندسياً بجد ميل القاطع المار بالنقطتين.',
      maxScore: 10,
      verifiedInCurriculum: true,
      source: 'بنك الأسئلة الوزاري (2023)',
      criteria: [
        'كتابة قانون متوسط التغير دلتا ص / دلتا س (3 درجات)',
        'التعويض في ق(3) وق(1) والحساب الجبري (4 درجات)',
        'تفسير الناتج كمعادلة ميل القاطع الهندسي (3 درجات)'
      ]
    },
    {
      id: 'q_gen_2',
      lessonId: 'l_1_2',
      lessonTitle: 'قواعد الاشتقاق',
      outcome: 'تطبيق مشتقة ضرب اقترانين وقسمتهما بدقة واحترافية',
      text: 'جد مشتقة الاقتران هـ(س) = (س³ - 2)(2س + 5) عند س = 2 باستخدام قاعدة ضرب اقترانين دون فك الأقواس أولاً.',
      maxScore: 10,
      verifiedInCurriculum: true,
      source: 'توليد ذكي مدعوم بملفات الأستاذ (ملخص قواعد الاشتقاق)',
      criteria: [
        'تطبيق قاعدة الأول في مشتقة الثاني + الثاني في مشتقة الأول (4 درجات)',
        'التعويض العددي بدقة عند س = 2 (4 درجات)',
        'الوصول إلى الناتج النهائي الصحيح (درجتان)'
      ]
    }
  ]);

  // Alert when un-taught lesson is selected
  const hasUntaughtSelected = selectedLessons.some(lid => !taughtLessonIds.has(lid));

  const toggleLesson = (lid: string) => {
    if (selectedLessons.includes(lid)) {
      setSelectedLessons(selectedLessons.filter(id => id !== lid));
    } else {
      setSelectedLessons([...selectedLessons, lid]);
    }
  };

  const visibleLessons = showAllLessons ? allLessons : allLessons.filter(l => taughtLessonIds.has(l.id));

  // Handle "خارج المنهج" button: deletes question and alerts system
  const handleMarkOutOfSyllabus = (questionId: string, qText: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    notify(`[تم تسجيل الإبلاغ ونقل السؤال للمراجعة]
حُذف السؤال فوراً من الامتحان.
تم توثيق ملاحظتك في سجل تدريب الذكاء الاصطناعي لضمان عدم تكرار الخروج عن سياق درسك.`);
  };

  const handleGenerate = () => {
    if (selectedLessons.length === 0) {
      notify('يرجى اختيار درس واحد على الأقل من المنهاج');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);

      const targetLesson = allLessons.find(l => selectedLessons.includes(l.id)) || allLessons[0];
      const newQ = {
        id: `q_gen_${Date.now()}`,
        lessonId: targetLesson.id,
        lessonTitle: targetLesson.title,
        outcome: targetLesson.outcomes?.[0] || targetLesson.learningOutcomes?.[0] || 'تحقيق نواتج التعلّم المقررة بالمنهاج',
        text: `أثبت بالاستناد إلى خواص ${targetLesson.title} صحة العلاقة الجبرية المعطاة، ثم احسب القيمة العددية عندما س = 1.`,
        maxScore: 10,
        verifiedInCurriculum: true,
        source: sourceMode === 'bank_first' ? 'بنك الأسئلة المعتمد' : useTeacherFiles ? 'توليد ذكي (معتمد على ملفاتك)' : 'توليد ذكي مطابق للمنهاج',
        criteria: [
          'استخدام الرموز والمصطلحات المعتمدة بالمنهاج (3 درجات)',
          'الخطوات الرياضية والمنطقية المتسلسلة (4 درجات)',
          'الحل النهائي والتدقيق (3 درجات)'
        ]
      };

      setQuestions([newQ, ...questions]);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B1')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#1E3A5F] mb-2 font-bold cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </button>
          <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>توليد امتحان ذكي مضبوط بالمنهاج</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            صياغة أسئلة امتحانات وأوراق عمل مطابقة حرفياً لنواتج التعلّم ودروس المجموعة المشروحة، مستندة إلى بنك الأسئلة وملفاتك الخاصة.
          </p>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">المجموعة المستهدفة:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
          >
            {MOCK_GROUPS.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.gradeName})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Untaught Lesson Warning if Selected */}
      {hasUntaughtSelected && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="leading-relaxed">
            <strong className="block font-bold text-amber-950">تنبيه ضبط المنهاج:</strong>
            أحد الدروس المختارة لم يُشرح لطلاب هذه المجموعة بعد وفق سجل «وين وصلنا». يمكنك الاستمرار، لكن يُنصح بالاقتصار على ما درسه الطلاب لضمان مصداقية التقييم.
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">المنهاج والصف والمادة:</span>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1E3A5F]" />
              <span>{curriculum.name} • {grade.name} • {subject.name}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">مصدر الأسئلة:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bank_first', label: 'بنك الأسئلة أولاً' },
                { id: 'mixed', label: 'مزيج (بنك + توليد)' },
                { id: 'new_ai', label: 'توليد جديد كلياً' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSourceMode(opt.id as any)}
                  className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                    sourceMode === opt.id
                      ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher Files Integration Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-700" />
            <div>
              <span className="text-xs font-bold text-indigo-950 block">اعتمد على ملفاتي أيضاً («ملفاتي»)</span>
              <span className="text-[11px] text-indigo-700">
                يقوم الذكاء الاصطناعي بمطابقة أسلوب أسئلتك، أمثلتك الخاصة، وملخصاتك المرفوعة ({MOCK_TEACHER_FILES.length} ملفات جاهزة).
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={useTeacherFiles} 
              onChange={(e) => setUseTeacherFiles(e.target.checked)} 
              className="sr-only peer"
              aria-label="اعتمد على ملفاتي أيضاً"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Lesson Selector with Taught-Only Default */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">اختر الدروس المستهدفة للاختبار:</label>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {selectedLessons.length} دروس مختارة
              </span>
            </div>

            {/* Toggle show all lessons */}
            <button
              type="button"
              onClick={() => setShowAllLessons(!showAllLessons)}
              className="text-xs text-[#1E3A5F] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllLessons ? 'إظهار الدروس المشروحة فقط' : 'أظهر كل دروس المادة'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-xl">
            {visibleLessons.map(lesson => {
              const isTaught = taughtLessonIds.has(lesson.id);
              const isSelected = selectedLessons.includes(lesson.id);

              return (
                <div
                  key={lesson.id}
                  onClick={() => toggleLesson(lesson.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#1E3A5F] bg-blue-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-[#1E3A5F] focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{lesson.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {lesson.outcomes?.[0] || lesson.learningOutcomes?.[0] || 'نواتج المنهاج المعتمدة'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    isTaught ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isTaught ? 'شُرح بالصف ✓' : 'لم يُشرح بعد'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جارٍ فحص المنهاج والملفات وتوليد الأسئلة...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>توليد الأسئلة ونموذج الإجابة وسلم التصحيح</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Questions List with Syllabus Checks & Out-of-syllabus feedback */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <span>الأسئلة المولّدة ونماذج التصحيح ({questions.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">كل سؤال مدقق آلياً داخل المنهاج</span>
        </div>

        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            {/* Question Header & Verification Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#1E3A5F] text-white text-xs font-black px-2.5 py-0.5 rounded-lg">
                  سؤال {idx + 1} ({q.maxScore} درجات)
                </span>
                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  الدرس: {q.lessonTitle}
                </span>

                {/* Requirement: فُحص: داخل المنهج ✓ */}
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>فُحص: داخل المنهج ✓</span>
                </span>
              </div>

              {/* Requirement: زر «خارج المنهج» ليرسل تنبيه ويحذف السؤال */}
              <button
                type="button"
                onClick={() => handleMarkOutOfSyllabus(q.id, q.text)}
                title="اضغط إذا كان السؤال يخرج عن منهاج طلابك لإزالته وتنبيه النظام"
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>خارج المنهج</span>
              </button>
            </div>

            {/* Target Outcome & Source */}
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">الناتج المستهدف:</span>
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                {q.outcome}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">المصدر: {q.source}</span>
            </div>

            {/* Question Body */}
            <p className="text-sm font-bold text-slate-900 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              {q.text}
            </p>

            {/* Scoring Rubric / Criteria */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">معايير التصحيح وتوزيع الدرجات الآلي:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pr-1">
                {q.criteria.map((cr, cIdx) => (
                  <li key={cIdx}>{cr}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
