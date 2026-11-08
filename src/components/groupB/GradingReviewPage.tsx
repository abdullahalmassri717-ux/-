import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Layers,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { QuestionGradeRow, SubmissionRow } from '../../data/types';
import { notify } from '../../lib/notify';

interface GradingReviewPageProps {
  onNavigate: (screen: ScreenId) => void;
}

type Confidence = 'high' | 'medium' | 'low';
const confidenceOf = (g: QuestionGradeRow): Confidence =>
  g.aiConfidence === null ? 'low' : g.aiConfidence >= 0.85 ? 'high' : g.aiConfidence >= 0.7 ? 'medium' : 'low';

export const GradingReviewPage: React.FC<GradingReviewPageProps> = ({ onNavigate }) => {
  const store = useData();
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const [savedSubmissionId, setSelectedSubmission] = useSelected('submission');
  const [filterMode, setFilterMode] = useState<'suspicious_only' | 'all'>('suspicious_only');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams.find((e) => e.status === 'needs_review')?.id ?? exams[0]?.id ?? '';
  const exam = exams.find((e) => e.id === examId);
  const subsQ = useLoad((st) => (examId ? st.listSubmissions(examId) : Promise.resolve([] as SubmissionRow[])), [examId]);
  const gradesQ = useLoad((st) => (examId ? st.listAssessmentGrades(examId) : Promise.resolve([] as QuestionGradeRow[])), [examId]);
  const submissions = subsQ.data ?? [];
  const grades = gradesQ.data ?? [];
  const subById = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions]);

  // Papers still waiting for the teacher come first; approved ones only in "all".
  const items = useMemo(() => {
    const order = new Map(submissions.map((s, i) => [s.id, i]));
    return grades
      .filter((g) => {
        const sub = subById.get(g.submissionId);
        return sub && (sub.status === 'needs_review' || (filterMode === 'all' && sub.status === 'approved'));
      })
      .sort((a, b) => (order.get(a.submissionId)! - order.get(b.submissionId)!) || a.questionNumber - b.questionNumber);
  }, [grades, submissions, subById, filterMode]);

  const displayItems = filterMode === 'suspicious_only' ? items.filter((it) => !it.reviewedAt && confidenceOf(it) !== 'high') : items;

  // Open on the paper chosen in the upload screen, if any.
  useEffect(() => {
    if (!savedSubmissionId || !displayItems.length) return;
    const idx = displayItems.findIndex((g) => g.submissionId === savedSubmissionId);
    if (idx >= 0) setCurrentIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSubmissionId, gradesQ.data, filterMode]);

  const currentItem = displayItems[Math.min(currentIndex, displayItems.length - 1)];
  const currentSub = currentItem ? subById.get(currentItem.submissionId) : undefined;
  const pagesQ = useLoad(
    (st) => (currentItem ? st.getPageUrls(currentItem.submissionId) : Promise.resolve([] as string[])),
    [currentItem?.submissionId],
  );
  const pages = pagesQ.data ?? [];
  useEffect(() => {
    setPageIndex(0);
  }, [currentItem?.submissionId]);
  useEffect(() => {
    setNoteDraft(currentItem?.teacherNote ?? '');
  }, [currentItem?.id]);

  const patchGrade = (id: string, patch: Partial<QuestionGradeRow>) =>
    gradesQ.setData((prev) => prev?.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  /** When every question of a paper is reviewed, the paper is approved. */
  const approveIfComplete = async (submissionId: string, list: QuestionGradeRow[]) => {
    const own = list.filter((g) => g.submissionId === submissionId);
    if (!own.length || own.some((g) => !g.reviewedAt)) return;
    await store.approveSubmission(submissionId);
    subsQ.setData((prev) => prev?.map((s) => (s.id === submissionId ? { ...s, status: 'approved' } : s)));
    notify(`اعتُمدت ورقة ${subById.get(submissionId)?.studentName ?? 'الطالب'}`);
    const stillOpen = submissions.filter((s) => s.id !== submissionId && s.status === 'needs_review').length;
    if (!stillOpen && exam && exam.status === 'needs_review') {
      await store.updateAssessment(exam.id, { status: 'completed' });
      examsQ.reload();
    }
  };

  const save = async (g: QuestionGradeRow, score: number, note: string | null, review: boolean) => {
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await store.saveTeacherGrade(g.id, score, note);
      const next = (gradesQ.data ?? []).map((x) => (x.id === g.id ? { ...x, finalScore: score, teacherNote: note, reviewedAt: x.reviewedAt ?? now } : x));
      patchGrade(g.id, { finalScore: score, teacherNote: note, reviewedAt: g.reviewedAt ?? now });
      if (review) await approveIfComplete(g.submissionId, next);
      return true;
    } catch (e) {
      notify(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleScoreAdjust = (delta: number) => {
    if (!currentItem) return;
    const before = currentItem.finalScore ?? 0;
    const after = Math.max(0, Math.min(currentItem.maxScore, before + delta));
    if (after !== before) void save(currentItem, after, noteDraft.trim() || null, false);
  };

  const handleApprove = async () => {
    if (!currentItem) return;
    const ok = await save(currentItem, currentItem.finalScore ?? 0, noteDraft.trim() || null, true);
    // In "suspicious only", the approved item leaves the list, so the index already points at the next one.
    if (ok && filterMode === 'all' && currentIndex < displayItems.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleNext = () => setCurrentIndex(currentIndex < displayItems.length - 1 ? currentIndex + 1 : 0);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);

  const handleApproveAllHighConfidence = async () => {
    const targets = items.filter((it) => !it.reviewedAt && confidenceOf(it) === 'high');
    if (!targets.length) return notify('لا توجد إجابات عالية الثقة بانتظار الاعتماد', 'info');
    setSaving(true);
    let list = gradesQ.data ?? [];
    try {
      const now = new Date().toISOString();
      for (const g of targets) {
        await store.saveTeacherGrade(g.id, g.finalScore ?? 0, g.teacherNote);
        list = list.map((x) => (x.id === g.id ? { ...x, reviewedAt: now } : x));
      }
      gradesQ.setData(list);
      for (const subId of new Set(targets.map((t) => t.submissionId))) await approveIfComplete(subId, list);
      notify(`اعتُمدت ${targets.length} إجابة عالية الثقة`);
    } catch (e) {
      notify(errorMessage(e));
      gradesQ.reload();
    } finally {
      setSaving(false);
    }
  };

  const remainingCount = items.filter((it) => !it.reviewedAt).length;
  const loading = examsQ.loading || subsQ.loading || gradesQ.loading;

  return (
    <div className="space-y-4 text-right max-w-7xl mx-auto pb-12">
      {/* Exam picker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center gap-2 text-xs">
        <span className="font-bold text-slate-700 shrink-0">الامتحان:</span>
        <select
          value={examId}
          onChange={(e) => {
            setSavedExamId(e.target.value);
            setSelectedSubmission(null);
            setCurrentIndex(0);
          }}
          className="min-w-0 flex-1 p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-bold text-slate-900"
        >
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.title} ({ex.group})</option>
          ))}
        </select>
      </div>

      {/* Top Bar Filter & Counter & Bulk Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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
              المشكوك فيها فقط
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('C6')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-100 hover:bg-white cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>مراجعة سؤالاً سؤالاً</span>
          </button>
          <button
            disabled={saving}
            onClick={handleApproveAllHighConfidence}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Check className="w-4 h-4" />
            <span>اعتمد كل الإجابات عالية الثقة</span>
          </button>
        </div>
      </div>

      {loading && !currentItem && <div className="py-16 text-center text-sm text-slate-500">جاري التحميل...</div>}

      {!loading && !currentItem && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            {items.length ? 'لا توجد إجابات مشكوك فيها. راجعت كل شيء!' : 'لا توجد أوراق بانتظار المراجعة في هذا الامتحان.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <button onClick={() => onNavigate('B7')} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold cursor-pointer">رفع أوراق</button>
            <button onClick={() => onNavigate('B9')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg font-bold cursor-pointer">النتائج والتحليل</button>
          </div>
        </div>
      )}

      {currentItem && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[580px]">
          {/* Paper photo with zoom */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1E3A5F] text-sm">ورقة الطالب الأصلية</span>
                {currentSub?.studentCode && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">{currentSub.studentCode}</span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))} className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer" title="تكبير">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px] px-1 tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(Math.max(0.75, zoomLevel - 0.25))} className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer" title="تصغير">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => setZoomLevel(1)} className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer" title="إعادة ضبط الحجم">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[360px] bg-[#FAF9F6] border-2 border-slate-300 rounded-xl p-3 relative shadow-inner overflow-auto max-h-[70vh]">
              <div className="w-full transition-transform duration-200 text-right space-y-3" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top right' }}>
                <div className="border-b-2 border-slate-800 pb-2 flex justify-between items-center text-xs text-slate-900 font-bold gap-2">
                  <span className="truncate">الطالب: {currentSub?.studentName}</span>
                  <span className="shrink-0">سؤال {currentItem.questionNumber}{currentItem.lesson ? ` (${currentItem.lesson})` : ''}</span>
                </div>
                {pagesQ.loading && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
                {pages[pageIndex] && (
                  <img src={pages[pageIndex]} alt="صورة ورقة الطالب" className="w-full h-auto rounded-lg border border-slate-300 bg-white" />
                )}
                <div className="text-sm text-slate-900 bg-white/80 p-3 border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">ما قرأه الذكاء الاصطناعي من الورقة:</p>
                  <p className="whitespace-pre-wrap break-words leading-loose font-serif">{currentItem.aiTranscription || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 gap-2">
              {pages.length > 1 ? (
                <div className="flex items-center gap-1">
                  {pages.map((_, i) => (
                    <button key={i} onClick={() => setPageIndex(i)} className={`w-6 h-6 rounded font-bold cursor-pointer ${i === pageIndex ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <span>{pages.length ? 'صفحة واحدة' : 'لا توجد صورة محفوظة'}</span>
              )}
              <button
                onClick={() => {
                  setSelectedSubmission(currentItem.submissionId);
                  onNavigate('B12');
                }}
                className="text-[#1E3A5F] hover:underline font-bold cursor-pointer"
              >
                معاينة الورقة المصححة ←
              </button>
            </div>
          </div>

          {/* AI result, criteria, score editor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <span className="text-xs text-slate-400">مراجعة إجابة:</span>
                  <h3 className="text-base font-extrabold text-slate-900 truncate">{currentSub?.studentName}</h3>
                  <p className="text-xs text-slate-500 break-words">{currentItem.questionText}</p>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-[10px] text-slate-400 block mb-0.5">ثقة الذكاء الاصطناعي</span>
                  {confidenceOf(currentItem) === 'high' && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> عالية
                    </span>
                  )}
                  {confidenceOf(currentItem) === 'medium' && (
                    <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" /> متوسطة
                    </span>
                  )}
                  {confidenceOf(currentItem) === 'low' && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-red-600" /> منخفضة
                    </span>
                  )}
                  {currentItem.reviewedAt && <span className="block text-[10px] text-emerald-700 font-bold mt-1">✓ راجعتها</span>}
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-slate-700">معايير التصحيح:</h4>
                <div className="space-y-1.5 text-xs">
                  {currentItem.aiCriteria.map((crit, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        crit.met ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-red-50/50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {crit.met ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        <span className="font-medium text-[11px] leading-tight break-words">{crit.criterion}</span>
                      </div>
                      <span className="font-bold font-mono text-[11px] tabular-nums shrink-0">{crit.points} علامة</span>
                    </div>
                  ))}
                </div>
                {currentItem.aiReason && (
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-950 leading-relaxed">
                    <strong className="block mb-0.5">سبب الدرجة (للمعلم فقط):</strong>
                    <span className="break-words">{currentItem.aiReason}</span>
                  </div>
                )}
                {currentItem.modelAnswer && (
                  <details className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                    <summary className="font-bold cursor-pointer">الإجابة النموذجية</summary>
                    <p className="pt-1 whitespace-pre-wrap break-words">{currentItem.modelAnswer}</p>
                  </details>
                )}
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">ملاحظة القلم الأحمر (تظهر للطالب على ورقته)</label>
                <textarea
                  rows={2}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => {
                    if ((noteDraft.trim() || null) !== (currentItem.teacherNote || null)) {
                      void save(currentItem, currentItem.finalScore ?? 0, noteDraft.trim() || null, false);
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-red-700"
                />
              </div>

              <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">درجة السؤال المعتمدة</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#1E3A5F] tabular-nums">{currentItem.finalScore ?? 0}</span>
                    <span className="text-sm font-bold text-slate-400">/ {currentItem.maxScore}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">(اقتراح الذكاء الاصطناعي: {currentItem.aiScore ?? '—'} علامة)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={() => handleScoreAdjust(-0.5)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold cursor-pointer active:scale-95 shadow-2xs"
                    title="خصم نصف علامة"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleScoreAdjust(0.5)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold cursor-pointer active:scale-95 shadow-2xs"
                    title="إضافة نصف علامة"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

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
                disabled={saving}
                onClick={handleApprove}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>اعتمد الدرجة والملاحظة</span>
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
      )}
    </div>
  );
};
