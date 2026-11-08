import React, { useState } from 'react';
import { ScreenId, GradingItem } from '../../types';
import { CURRENT_TEACHER, MOCK_GRADING_ITEMS } from '../../mockData';
import { recordScoreEdit, updateLiveItems, useGradingSession } from '../../lib/gradingSession';
import {
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  BookOpen,
  FileText,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface GradingReviewPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const GradingReviewPage: React.FC<GradingReviewPageProps> = ({ onNavigate }) => {
  const [filterMode, setFilterMode] = useState<'suspicious_only' | 'all'>('suspicious_only');
  const [reviewMode, setReviewMode] = useState<'student_by_student' | 'cluster'>('student_by_student');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [mockItems, setMockItems] = useState<GradingItem[]>(MOCK_GRADING_ITEMS);
  // Papers graded by the real AI (trial) replace the demo items when present.
  const { items: liveItems } = useGradingSession();
  const usingLive = liveItems.length > 0;
  const items = usingLive ? liveItems : mockItems;
  const setItems = (update: (prev: GradingItem[]) => GradingItem[]) =>
    usingLive ? updateLiveItems(update) : setMockItems(update);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [bulkApproved, setBulkApproved] = useState(false);

  // Filter items
  const displayItems = filterMode === 'suspicious_only'
    ? items.filter(it => it.confidence === 'low' || it.confidence === 'medium' || !it.isReviewed)
    : items;

  const currentItem = displayItems[currentIndex] || displayItems[0] || items[0];

  const handleScoreAdjust = (delta: number) => {
    const before = currentItem.teacherScore;
    const after = Math.max(0, Math.min(currentItem.maxScore, before + delta));
    if (usingLive && after !== before) {
      // Every change to an AI grade is kept (before/after/who/when) to improve accuracy later.
      recordScoreEdit({
        itemId: currentItem.id,
        paperId: currentItem.id.replace(/^live-/, '').replace(/-q\d+$/, ''),
        questionNumber: currentItem.questionNumber,
        aiScore: currentItem.aiSuggestedScore,
        before,
        after,
        editedBy: CURRENT_TEACHER.name,
        editedAt: new Date().toISOString(),
      });
    }
    setItems(prev => prev.map(it => {
      if (it.id === currentItem.id) {
        const newScore = Math.max(0, Math.min(it.maxScore, it.teacherScore + delta));
        return { ...it, teacherScore: newScore, isReviewed: true };
      }
      return it;
    }));
  };

  const handleApprove = () => {
    setItems(prev => prev.map(it => {
      if (it.id === currentItem.id) {
        return { ...it, isReviewed: true };
      }
      return it;
    }));
    if (currentIndex < displayItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < displayItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleApproveAllHighConfidence = () => {
    setBulkApproved(true);
    setItems(prev => prev.map(it => {
      if (it.confidence === 'high') {
        return { ...it, isReviewed: true };
      }
      return it;
    }));
    setTimeout(() => setBulkApproved(false), 3000);
  };

  const remainingCount = items.filter(it => !it.isReviewed).length;

  return (
    <div className="space-y-4 text-right max-w-7xl mx-auto pb-12">
      {/* Top Bar Filter & Counter & Bulk Action (PDF requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => {
                setFilterMode('suspicious_only');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'suspicious_only' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المشكوك فيها فقط (افتراضي)
            </button>
            <button
              onClick={() => {
                setFilterMode('all');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-[#1E3A5F] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كل الإجابات ({items.length})
            </button>
          </div>

          <div className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg font-bold tabular-nums">
            بقي <strong>{remainingCount} إجابة</strong> للمراجعة
          </div>
        </div>

        {/* Mode Switcher: طالباً طالباً vs سؤالاً سؤالاً (تجميع C6) - PDF page 12 */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-blue-50 rounded-lg border border-blue-100">
            <button
              onClick={() => setReviewMode('student_by_student')}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                reviewMode === 'student_by_student' ? 'bg-[#1E3A5F] text-white' : 'text-blue-900'
              }`}
            >
              مراجعة طالباً طالباً
            </button>
            <button
              onClick={() => {
                setReviewMode('cluster');
                onNavigate('C6');
              }}
              className="px-2.5 py-1 rounded text-xs font-semibold text-blue-900 hover:bg-white cursor-pointer flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>مراجعة سؤالاً سؤالاً (تجميع C6)</span>
            </button>
          </div>

          {/* Bulk Approve Button (PDF requirement) */}
          <button
            onClick={handleApproveAllHighConfidence}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Check className="w-4 h-4" />
            <span>{bulkApproved ? 'تم الاعتماد بنجاح ✓' : 'اعتمد كل الإجابات عالية الثقة'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[580px]">
        {/* Right Side (on Desktop): Scanned Paper Image with Zoom/Pan controls (PDF requirement) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3 order-1 lg:order-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E3A5F] text-sm">
                صورة إجابة الطالب (الورقة الأصلية)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                {currentItem.studentCode}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] px-1 tabular-nums">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.max(0.75, zoomLevel - 0.25))}
                className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer"
                title="إعادة ضبط الحجم"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scanned Paper Canvas / Visual Representation */}
          <div className={`flex-1 min-h-[360px] bg-[#FAF9F6] border-2 border-slate-300 rounded-xl p-6 relative shadow-inner ${
            currentItem.studentAnswerImage.startsWith('data:') ? 'overflow-auto max-h-[70vh]' : 'overflow-hidden flex items-center justify-center'
          }`}>
            <div
              className="w-full transition-transform duration-200 text-right space-y-4 font-mono select-none"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top right' }}
            >
              <div className="border-b-2 border-slate-800 pb-2 flex justify-between items-center text-xs text-slate-900 font-bold">
                <span>الطالب: {currentItem.studentName}</span>
                <span>سؤال {currentItem.questionNumber} ({currentItem.lesson})</span>
              </div>

              {/* Real paper photo (AI trial) or simulated handwriting (demo data) */}
              {currentItem.studentAnswerImage.startsWith('data:') ? (
                <div className="space-y-3 font-sans">
                  <img
                    src={currentItem.studentAnswerImage}
                    alt={`ورقة الطالب ${currentItem.studentCode}`}
                    className="w-full h-auto rounded-lg border border-slate-300 bg-white"
                  />
                  <div className="text-sm text-slate-900 bg-white/80 p-3 border border-dashed border-slate-300 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">ما قرأه الذكاء الاصطناعي من الورقة:</p>
                    <p className="whitespace-pre-wrap break-words leading-loose font-serif">{currentItem.aiTranscription || '—'}</p>
                    {currentItem.handwrittenNote && (
                      <p className="text-xs text-red-600 pt-2 mt-2 border-t border-slate-200">
                        ملاحظة للطالب: <strong>{currentItem.handwrittenNote}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ) : currentItem.subjectType === 'english_writing' ? (
                <div className="font-sans text-xs text-blue-950 p-4 bg-white/70 border border-slate-300 rounded leading-relaxed space-y-2">
                  <p className="font-serif text-sm">
                    "Solar energy is very important for people in Gaza because electricity is cut everyday. Many families puts solar panels on roofs to have light and charge phones. In addition, solar energy is clean and do not make smoke. Goverment must help schools to install panels."
                  </p>
                  <div className="pt-2 text-[11px] text-red-600 font-medium border-t border-red-100">
                    ملاحظة القلم الأحمر: "Well organized ideas! Watch out for subject-verb agreement (families put)."
                  </div>
                </div>
              ) : (
                <div className="space-y-3 font-serif text-sm text-slate-900 bg-white/80 p-4 border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500 font-sans">خط الطالب المستخرج:</p>
                  <div className="leading-loose">
                    2س + 2ص(ص') = 0 <br />
                    ص' = -س / ص = -3/4 <br />
                    ص'' = (-ص - س ص') / ص² <br />
                    = (-4 - 3(-3/4)) / 16 <br />
                    = (-4 + 9/4) / 16 = (-7/4) / 16 = -7 / 64
                  </div>
                  <div className="text-xs text-red-600 font-sans pt-2 border-t border-slate-200">
                    ملاحظة المصحح اليدوية: <strong>{currentItem.handwrittenNote}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>انقر على الصورة للتكبير أو استخدم أزرار التحكم أعلاه</span>
            <button
              onClick={() => onNavigate('B12')}
              className="text-[#1E3A5F] hover:underline font-bold cursor-pointer"
            >
              معاينة الورقة كاملة المصححة ←
            </button>
          </div>
        </div>

        {/* Left Side (on Desktop): AI Transcription, Criteria Checks, Confidence & Score Editor (PDF requirement) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4 order-2 lg:order-none">
          <div className="space-y-4">
            {/* Header with Student Name & Confidence Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-slate-400">مراجعة إجابة:</span>
                <h3 className="text-base font-extrabold text-slate-900">{currentItem.studentName}</h3>
                <p className="text-xs text-slate-500">{currentItem.questionText}</p>
              </div>

              {/* Confidence Badge (عالية / متوسطة / منخفضة) - PDF requirement */}
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block mb-0.5">مؤشر الثقة AI</span>
                {currentItem.confidence === 'high' && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    عالية (98%)
                  </span>
                )}
                {currentItem.confidence === 'medium' && (
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                    متوسطة (مشكوك فيها)
                  </span>
                )}
                {currentItem.confidence === 'low' && (
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    منخفضة (تحتاج تدقيق)
                  </span>
                )}
              </div>
            </div>

            {/* If English Writing Question: Custom English Writing Panel (PDF page 12) */}
            {currentItem.subjectType === 'english_writing' && currentItem.writingFeedback ? (
              <div className="space-y-3 bg-purple-50/50 border border-purple-200 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-700" />
                    لوحة تصحيح التعبير باللغة الإنجليزية (Writing Rubric)
                  </span>
                  <span className="font-bold text-purple-800 font-mono">
                    Band: {currentItem.writingFeedback.structureBand} / 5
                  </span>
                </div>

                <div className="space-y-2">
                  <strong className="block text-slate-700 text-[11px]">الأخطاء المصنفة حسب النوع:</strong>
                  {currentItem.writingFeedback.grammarErrors.map((err, i) => (
                    <div key={i} className="p-2 bg-white rounded border border-purple-100 space-y-0.5">
                      <span className="text-red-600 font-mono font-bold line-through ml-2">{err.text}</span>
                      <span className="text-emerald-700 font-mono font-bold">⇒ {err.correction}</span>
                      <p className="text-[10px] text-slate-500">{err.note}</p>
                    </div>
                  ))}
                </div>

                <div className="p-2 bg-white rounded border border-purple-100">
                  <strong className="block text-slate-700 text-[11px] mb-1">نسخة مُعاد صياغتها أكاديمياً:</strong>
                  <p className="text-[11px] text-slate-600 font-serif italic">
                    "{currentItem.writingFeedback.rephrasedVersion}"
                  </p>
                </div>
              </div>
            ) : (
              /* Rubric Checked vs Unchecked Criteria (PDF requirement: المعايير التي تحققت ✓ والتي لم تتحقق ✗) */
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-slate-700">معايير التصحيح الوزارية المحققة:</h4>
                <div className="space-y-1.5 text-xs">
                  {currentItem.criteriaChecks.map((crit, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        crit.met ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-red-50/50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {crit.met ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-medium text-[11px] leading-tight">{crit.criterion}</span>
                      </div>
                      <span className="font-bold font-mono text-[11px] tabular-nums shrink-0">
                        {crit.met ? `+${crit.points}` : '0'} علامة
                      </span>
                    </div>
                  ))}
                </div>
                {currentItem.aiReason && (
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-950 leading-relaxed">
                    <strong className="block mb-0.5">سبب الدرجة (للمعلم فقط):</strong>
                    <span className="break-words">{currentItem.aiReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Score Adjustment Section (+ and - buttons) - PDF requirement */}
            <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">درجة السؤال المعتمدة</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#1E3A5F] tabular-nums">
                    {currentItem.teacherScore}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ {currentItem.maxScore}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  (اقتراح الذكاء الاصطناعي: {currentItem.aiSuggestedScore} علامة)
                </span>
              </div>

              {/* + and - score adjustment buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScoreAdjust(-1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold transition-colors cursor-pointer text-base active:scale-95 shadow-2xs"
                  title="خصم علامة واحدة (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScoreAdjust(1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold transition-colors cursor-pointer text-base active:scale-95 shadow-2xs"
                  title="إضافة علامة واحدة (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons: اعتمد، التالي، السابق (PDF requirement) */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
              title="السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleApprove}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>اعتمد الدرجة والملاحظات</span>
            </button>

            <button
              onClick={handleNext}
              className="bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 px-5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
