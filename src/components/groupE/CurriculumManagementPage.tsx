import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown, 
  ChevronLeft, 
  Edit3, 
  Trash2, 
  Eye, 
  Layers, 
  Award, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { CURRICULA_DATA } from '../../mockData';
import { Curriculum, Subject, Unit, Lesson, ScreenId } from '../../types';

interface CurriculumManagementPageProps {
  onNavigate?: (screenId: ScreenId) => void;
}

export const CurriculumManagementPage: React.FC<CurriculumManagementPageProps> = () => {
  const [curricula, setCurricula] = useState<Curriculum[]>(CURRICULA_DATA);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('curr_ps');
  const [selectedGradeId, setSelectedGradeId] = useState('g_12_sci');
  const [selectedSubjectId, setSelectedSubjectId] = useState('s_math_12');

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    'u_1': true,
    'u_2': true,
  });

  // Modal for PDF Book AI Extraction
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<{
    unitsCount: number;
    lessonsCount: number;
    outcomesCount: number;
    termsCount: number;
  } | null>(null);

  // Active Curriculum / Grade / Subject
  const currentCurriculum = curricula.find(c => c.id === selectedCurriculumId) || curricula[0];
  const currentGrade = currentCurriculum.grades.find(g => g.id === selectedGradeId) || currentCurriculum.grades[0];
  const currentSubject = currentGrade.subjects.find(s => s.id === selectedSubjectId) || currentGrade.subjects[0];

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Toggle Subject Status: draft vs published
  const handleToggleSubjectStatus = () => {
    const newStatus = currentSubject.status === 'published' ? 'draft' : 'published';
    setCurricula(curricula.map(c => {
      if (c.id !== currentCurriculum.id) return c;
      return {
        ...c,
        grades: c.grades.map(g => {
          if (g.id !== currentGrade.id) return g;
          return {
            ...g,
            subjects: g.subjects.map(s => {
              if (s.id !== currentSubject.id) return s;
              return { ...s, status: newStatus };
            })
          };
        })
      };
    }));
  };

  // Handle PDF AI Import Simulation
  const handleRunPdfExtraction = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setExtractedPreview({
        unitsCount: 4,
        lessonsCount: 18,
        outcomesCount: 42,
        termsCount: 96,
      });
    }, 2000);
  };

  const handleApproveExtraction = () => {
    alert(`تم بنجاح اعتماد شجرة المنهج المستخرجة من كتاب الوزارة وتحديث وحدات ودروس «${currentSubject.name}».`);
    setShowPdfImportModal(false);
    setExtractedPreview(null);
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
              إدارة المنصة المركزية
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">بناء وهيكلة المناهج المعتمدة</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1E3A5F]" />
            <span>إدارة المناهج والكتب المدرسية</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            التحكم في الشجرة الكاملة للمناهج (منهج ← صف ← مادة ← وحدات ← دروس ونواتج تعلّم ومصطلحات)، استيراد محتوى الكتب المدرسية عبر الذكاء الاصطناعي، ونشر المواد للمعلمين.
          </p>
        </div>

        <button
          onClick={() => setShowPdfImportModal(true)}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>استيراد من كتاب PDF (بالذكاء الاصطناعي)</span>
        </button>
      </div>

      {/* Curriculum, Grade, and Subject Selectors Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Curriculum */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">المنهاج والدولة</label>
            <select
              value={selectedCurriculumId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedCurriculumId(cId);
                const c = curricula.find(x => x.id === cId);
                if (c && c.grades.length > 0) {
                  setSelectedGradeId(c.grades[0].id);
                  if (c.grades[0].subjects.length > 0) {
                    setSelectedSubjectId(c.grades[0].subjects[0].id);
                  }
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
            >
              {curricula.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.country}) {c.isAvailable ? '✓ متاح' : '(قريباً)'}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">الصف الدراسي</label>
            <select
              value={selectedGradeId}
              onChange={(e) => {
                const gId = e.target.value;
                setSelectedGradeId(gId);
                const g = currentCurriculum.grades.find(x => x.id === gId);
                if (g && g.subjects.length > 0) {
                  setSelectedSubjectId(g.subjects[0].id);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
            >
              {currentCurriculum.grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">المادة</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
            >
              {currentGrade.subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === 'published' ? 'منشورة' : 'مسوّدة'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Subject Control Bar: Status Toggle & Quick Stats */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">حالة المادة للمدرّسين:</span>
            <button
              onClick={handleToggleSubjectStatus}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentSubject.status === 'published'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentSubject.status === 'published' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
              <span>{currentSubject.status === 'published' ? 'منشورة (متاحة للمعلمين والمدارس)' : 'مسوّدة (مخفية عن المعلمين)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>{currentSubject.units.length} وحدات</span>
            <span>•</span>
            <span>{currentSubject.units.reduce((acc, u) => acc + u.lessons.length, 0)} درساً معتمداً</span>
            <span>•</span>
            <span className="text-[#1E3A5F] font-bold">
              {currentSubject.units.reduce((acc, u) => acc + u.lessons.reduce((lacc, l) => lacc + (l.questionCount || l.questionBankCount || 0), 0), 0)} سؤالاً بالبنك
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Units & Lessons Tree */}
      <div className="space-y-4">
        {currentSubject.units.map(unit => {
          const isExpanded = expandedUnits[unit.id] ?? true;

          return (
            <div key={unit.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => toggleUnit(unit.id)}
                className="p-4 bg-slate-50 hover:bg-slate-100/60 flex items-center justify-between cursor-pointer border-b border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] text-white flex items-center justify-center font-black text-sm">
                    {unit.order}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      {unit.title}
                      <span className="text-xs font-normal text-slate-500">
                        ({unit.lessons.length} دروس)
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {unit.lessons.map(lesson => {
                    const outcomesList = lesson.outcomes || lesson.learningOutcomes || [];
                    const termsList = lesson.termsAndSymbols || lesson.keyTerms || [];

                    return (
                      <div key={lesson.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400">{unit.order}.{lesson.order}</span>
                            <h4 className="font-bold text-slate-900 text-sm">{lesson.title}</h4>
                          </div>

                          {/* Question Count Statistic per Lesson */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-lg font-bold">
                              بنك الأسئلة: {lesson.questionCount || lesson.questionBankCount || 12} سؤالاً
                            </span>
                          </div>
                        </div>

                        {/* Learning Outcomes Tags */}
                        {outcomesList.length > 0 && (
                          <div className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1">
                            <span className="font-bold text-slate-700 block">نواتج التعلّم المقررة:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pr-1 text-[11px]">
                              {outcomesList.map((out: string, idx: number) => (
                                <li key={idx}>{out}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Terms and Approved Symbols */}
                        {termsList.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-bold text-slate-600 text-[11px]">الرموز والمصطلحات:</span>
                            {termsList.map((term: string, idx: number) => (
                              <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PDF Import Modal */}
      {showPdfImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#1E3A5F] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>استيراد شجرة المنهاج من كتاب مدرسي PDF</span>
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              ارفع ملف كتاب الوزارة بصيغة PDF. سيقوم محرك الذكاء الاصطناعي بقراءة الفهرس ومحتوى الدروس وتفكيكها تلقائياً إلى وحدات، دروس، نواتج تعلّم، والمصطلحات والرموز المعتمدة.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 bg-slate-50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">اضغط لرفع ملف الكتاب (PDF)</div>
              <div className="text-[11px] text-slate-400">مثال: كتاب الرياضيات - الثاني عشر العلمي (الجزء الأول)</div>
            </div>

            {/* Extraction State */}
            {isExtracting ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-3 text-xs text-blue-900">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>جارٍ فك الفهرس واستخراج الدروس ونواتج التعلّم...</span>
              </div>
            ) : extractedPreview ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>اكتمل التحليل الذكي بنجاح:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1 font-semibold">
                  <div>• {extractedPreview.unitsCount} وحدات دراسية</div>
                  <div>• {extractedPreview.lessonsCount} درساً منهجياً</div>
                  <div>• {extractedPreview.outcomesCount} ناتج تعلّم مستخرج</div>
                  <div>• {extractedPreview.termsCount} مصطلحاً ورمزاً رياضياً</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRunPdfExtraction}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs"
              >
                بدء التحليل واستخراج هيكل المنهاج
              </button>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {extractedPreview ? (
                <button
                  type="button"
                  onClick={handleApproveExtraction}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
                >
                  اعتماد الشجرة وإضافتها للمنهاج
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setShowPdfImportModal(false);
                  setExtractedPreview(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors"
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
