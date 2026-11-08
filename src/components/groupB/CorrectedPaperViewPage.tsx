import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  Download,
  ArrowRight,
  Edit3,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { QuestionGradeRow, SubmissionRow } from '../../data/types';
import { toInternationalPhone } from '../../lib/phone';

interface CorrectedPaperViewPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const CorrectedPaperViewPage: React.FC<CorrectedPaperViewPageProps> = ({ onNavigate }) => {
  const store = useData();
  const [savedExamId] = useSelected('exam');
  const [savedSubmissionId, setSelectedSubmission] = useSelected('submission');
  const [zoom, setZoom] = useState<number>(1);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const exam = exams.find((e) => e.id === examId);
  const subsQ = useLoad((st) => (examId ? st.listSubmissions(examId) : Promise.resolve([] as SubmissionRow[])), [examId]);
  const papers = (subsQ.data ?? []).filter((s) => s.status === 'approved' || s.status === 'needs_review');
  const index = Math.max(0, papers.findIndex((s) => s.id === savedSubmissionId));
  const paper = papers[index];
  const gradesQ = useLoad((st) => (paper ? st.listQuestionGrades(paper.id) : Promise.resolve([] as QuestionGradeRow[])), [paper?.id]);
  const pagesQ = useLoad((st) => (paper ? st.getPageUrls(paper.id) : Promise.resolve([] as string[])), [paper?.id]);
  const studentQ = useLoad((st) => (paper?.studentId ? st.getStudent(paper.studentId) : Promise.resolve(null)), [paper?.studentId]);
  const questions = gradesQ.data ?? [];
  const pages = pagesQ.data ?? [];

  useEffect(() => {
    if (paper && paper.id !== savedSubmissionId) setSelectedSubmission(paper.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper?.id]);

  const totalCurrentScore = questions.reduce((sum, q) => sum + (q.finalScore ?? 0), 0);
  const totalMaxScore = questions.reduce((sum, q) => sum + q.maxScore, 0) || exam?.totalScore || 0;
  const isCorrect = (q: QuestionGradeRow) => (q.finalScore ?? 0) >= q.maxScore * 0.7;

  // Two or three things to work on: unmet criteria from the weakest questions.
  const workOn = useMemo(() => {
    const out: string[] = [];
    for (const q of [...questions].sort((a, b) => (a.finalScore ?? 0) / a.maxScore - (b.finalScore ?? 0) / b.maxScore)) {
      if (isCorrect(q)) continue;
      const miss = q.aiCriteria.find((c) => !c.met);
      out.push(miss ? `السؤال ${q.questionNumber}: ${miss.criterion}` : q.teacherNote || `راجع حل السؤال ${q.questionNumber}`);
      if (out.length === 3) break;
    }
    return out;
  }, [questions]);

  const save = async (q: QuestionGradeRow, score: number, note: string | null) => {
    const bounded = Math.max(0, Math.min(q.maxScore, score));
    try {
      await store.saveTeacherGrade(q.id, bounded, note);
      gradesQ.setData((prev) => prev?.map((g) => (g.id === q.id ? { ...g, finalScore: bounded, teacherNote: note, reviewedAt: g.reviewedAt ?? new Date().toISOString() } : g)));
      subsQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const go = (delta: number) => {
    if (!papers.length) return;
    const next = papers[(index + delta + papers.length) % papers.length];
    setSelectedSubmission(next.id);
  };

  const sendWhatsApp = () => {
    if (!paper) return;
    if (paper.status !== 'approved') {
      notify('اعتمد الورقة أولاً من شاشة المراجعة. لا تُرسل أي درجة قبل اعتمادك.', 'warning');
      return;
    }
    const phone = toInternationalPhone(studentQ.data?.studentPhone || studentQ.data?.parentPhone || '');
    if (!phone) return notify('لا يوجد رقم واتساب صحيح لهذا الطالب.', 'warning');
    const lines = [
      `${exam?.title ?? ''}`,
      `الدرجة: ${totalCurrentScore} من ${totalMaxScore}`,
      ...questions.map((q) => `س${q.questionNumber}: ${q.finalScore ?? 0}/${q.maxScore}${q.teacherNote ? ` — ${q.teacherNote}` : ''}`),
    ];
    if (workOn.length) lines.push('', 'ما تحتاج أن تعمل عليه:', ...workOn.map((w) => `• ${w}`));
    window.open(`https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  };

  if (!paper) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm text-slate-600">{subsQ.loading ? 'جاري التحميل...' : 'لا توجد أوراق مصححة في هذا الامتحان بعد.'}</p>
        <button onClick={() => onNavigate('B7')} className="text-xs font-bold text-[#1E3A5F] underline cursor-pointer">رفع أوراق</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('B8')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لشاشة المراجعة</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-extrabold text-[#1E3A5F]">الورقة المصححة</h1>
            <span className="text-xs bg-blue-100 text-[#1E3A5F] px-2.5 py-0.5 rounded-full font-bold font-mono">
              طالب {index + 1} من {papers.length}
            </span>
            {paper.status !== 'approved' && <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">لم تُعتمد بعد</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => go(-1)} className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer" title="الطالب السابق">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>الطالب التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>طباعة / PDF</span>
          </button>
          <button
            onClick={sendWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال للطالب على واتساب</span>
          </button>
        </div>
      </div>

      <div className="print-area space-y-5">
        <div className="bg-[#1E3A5F] text-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/60 pb-3">
            <div className="min-w-0">
              <span className="text-blue-200 text-xs font-bold block">{exam?.title}</span>
              <h2 className="text-2xl font-black break-words">{paper.studentName}</h2>
              <span className="text-xs text-blue-300 font-mono">
                {exam?.group} · رمز: {paper.studentCode}
              </span>
            </div>
            <div className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-center shadow-xs shrink-0">
              <span className="text-[10px] text-slate-500 font-bold block">الدرجة النهائية</span>
              <span className="text-3xl font-black text-emerald-600 font-mono tabular-nums">
                {totalCurrentScore} <span className="text-sm text-slate-400">/ {totalMaxScore}</span>
              </span>
            </div>
          </div>
          {workOn.length > 0 && (
            <div className="bg-white/10 rounded-xl p-3.5 space-y-1.5 text-xs">
              <strong className="block text-emerald-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>ما تحتاج أن تعمل عليه:</span>
              </strong>
              <ul className="space-y-1 text-blue-100 text-[11px] list-disc list-inside">
                {workOn.map((w) => (
                  <li key={w} className="break-words">{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-700 shrink-0" />
            <span>عدّل الدرجة بالأزرار ± أو اضغط على ملاحظة القلم الأحمر لتعديلها. كل تعديل يُحفظ.</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setZoom(Math.min(1.75, zoom + 0.15))} className="p-1 hover:bg-blue-100 rounded cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(Math.max(0.75, zoom - 0.15))} className="p-1 hover:bg-blue-100 rounded cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Original pages with the red-pen score stamp */}
        {pages.map((url, i) => (
          <div key={url} className="relative bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-auto">
            <div style={{ width: `${zoom * 100}%` }} className="relative">
              <img src={url} alt={`الصفحة ${i + 1}`} className="w-full h-auto block" />
              {i === 0 && (
                <div className="absolute top-3 left-3 w-20 h-20 rounded-full border-4 border-red-600 bg-white/80 text-red-700 flex flex-col items-center justify-center font-black font-mono tabular-nums rotate-[-8deg]">
                  <span className="text-lg leading-none">{totalCurrentScore}</span>
                  <span className="text-[11px] border-t-2 border-red-600 px-2">{totalMaxScore}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="bg-[#FFFDF9] border-2 border-slate-300 rounded-2xl shadow-xl p-5 sm:p-8 space-y-6 font-sans">
          {questions.map((q) => (
            <div key={q.id} className="border-b border-slate-200 pb-5 space-y-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-extrabold text-sm text-slate-900 min-w-0 break-words">السؤال {q.questionNumber}{q.lesson ? ` · ${q.lesson}` : ''}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-base ${isCorrect(q) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isCorrect(q) ? '✓' : '✗'}
                  </span>
                  <button onClick={() => save(q, (q.finalScore ?? 0) - 0.5, q.teacherNote)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer print:hidden" title="نصف علامة أقل">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-14 h-14 rounded-full border-2 border-red-600 bg-red-50/40 text-red-700 flex items-center justify-center font-bold font-mono text-xs tabular-nums">
                    {q.finalScore ?? 0}/{q.maxScore}
                  </div>
                  <button onClick={() => save(q, (q.finalScore ?? 0) + 0.5, q.teacherNote)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer print:hidden" title="نصف علامة أكثر">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {q.aiTranscription && (
                <div className="p-3 bg-white/70 border border-slate-200 rounded-xl font-serif text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {q.aiTranscription}
                </div>
              )}

              {q.aiCriteria.length > 0 && (
                <ul className="text-[11px] space-y-0.5">
                  {q.aiCriteria.map((c, i) => (
                    <li key={i} className={c.met ? 'text-emerald-700' : 'text-red-700'}>
                      {c.met ? '✓' : '✗'} {c.criterion}
                    </li>
                  ))}
                </ul>
              )}

              <div className="p-3 bg-red-50/70 border-r-4 border-red-600 rounded-l-lg text-xs text-red-800 font-serif space-y-1">
                <div className="flex items-center justify-between print:hidden">
                  <span className="text-[11px] font-sans font-bold text-red-900">ملاحظة القلم الأحمر:</span>
                  <button
                    onClick={() => {
                      if (editingNote === q.id) {
                        void save(q, q.finalScore ?? 0, noteDraft.trim() || null);
                        setEditingNote(null);
                      } else {
                        setNoteDraft(q.teacherNote ?? '');
                        setEditingNote(q.id);
                      }
                    }}
                    className="text-[10px] text-red-700 hover:underline font-sans cursor-pointer"
                  >
                    {editingNote === q.id ? 'حفظ' : 'تعديل ✎'}
                  </button>
                </div>
                {editingNote === q.id ? (
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    className="w-full p-2 bg-white border border-red-300 rounded text-xs text-red-900 font-sans"
                    autoFocus
                  />
                ) : (
                  <p className="text-xs italic leading-relaxed text-red-700 break-words">{q.teacherNote ? `«${q.teacherNote}»` : '—'}</p>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center justify-end text-xs">
            {paper.status === 'approved' && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded">✓ اعتمدها المدرّس عبر منصة دقة</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
