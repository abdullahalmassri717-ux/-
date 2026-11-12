import React, { useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  BarChart3,
  Send,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { MoodleExportDialog } from './MoodleExportDialog';
import { useLoad } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import type { QuestionGradeRow, SubmissionRow } from '../../data/types';

interface ExamAnalyticsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

/** Character-trigram similarity (0..1) between two transcriptions. */
function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = s.replace(/\s+/g, '');
    const set = new Set<string>();
    for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((g) => B.has(g) && inter++);
  return inter / (A.size + B.size - inter);
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  // BOM so Excel opens Arabic correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const ExamAnalyticsPage: React.FC<ExamAnalyticsPageProps> = ({ onNavigate }) => {
  const [savedExamId, setSavedExamId] = useSelected('exam');
  const [, setSelectedSubmission] = useSelected('submission');
  const [comparePair, setComparePair] = useState<{ a: string; b: string; q: number } | null>(null);
  const [showMoodle, setShowMoodle] = useState(false);
  const examsQ = useLoad((st) => st.listAssessments());
  const exams = examsQ.data ?? [];
  const examId = exams.some((e) => e.id === savedExamId) ? savedExamId! : exams[0]?.id ?? '';
  const exam = exams.find((e) => e.id === examId);
  const subsQ = useLoad((st) => (examId ? st.listSubmissions(examId) : Promise.resolve([] as SubmissionRow[])), [examId]);
  const gradesQ = useLoad((st) => (examId ? st.listAssessmentGrades(examId) : Promise.resolve([] as QuestionGradeRow[])), [examId]);

  const graded = (subsQ.data ?? []).filter((s) => s.status === 'approved' || s.status === 'needs_review');
  const total = exam?.totalScore || 0;
  const pct = (s: SubmissionRow) => (total ? Math.round((s.totalScore / total) * 100) : 0);
  const grades = gradesQ.data ?? [];
  const gradedIds = new Set(graded.map((s) => s.id));
  const usable = grades.filter((g) => gradedIds.has(g.submissionId));
  const nameOf = (subId: string) => graded.find((s) => s.id === subId)?.studentName ?? '';

  const stats = useMemo(() => {
    if (!graded.length) return null;
    const scores = graded.map(pct);
    const avg = Math.round((scores.reduce((n, x) => n + x, 0) / scores.length) * 10) / 10;
    const best = graded.reduce((a, b) => (b.totalScore > a.totalScore ? b : a));
    const worst = graded.reduce((a, b) => (b.totalScore < a.totalScore ? b : a));
    const passed = scores.filter((x) => x >= 50).length;
    const buckets = [
      { range: '90 - 100', test: (x: number) => x >= 90 },
      { range: '80 - 89', test: (x: number) => x >= 80 && x < 90 },
      { range: '70 - 79', test: (x: number) => x >= 70 && x < 80 },
      { range: '50 - 69', test: (x: number) => x >= 50 && x < 70 },
      { range: 'أقل من 50', test: (x: number) => x < 50 },
    ].map((b) => {
      const count = scores.filter(b.test).length;
      return { range: b.range, count, pct: `${Math.round((count / scores.length) * 100)}%` };
    });
    return { avg, best, worst, passed, buckets };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsQ.data, total]);

  // Mastery per lesson (or per question when no lesson is linked) and the most missed criterion.
  const topics = useMemo(() => {
    const map = new Map<string, { label: string; got: number; max: number; missed: Map<string, number>; question: number }>();
    for (const g of usable) {
      const key = g.lesson || `السؤال ${g.questionNumber}`;
      const t = map.get(key) ?? { label: key, got: 0, max: 0, missed: new Map(), question: g.questionNumber };
      t.got += g.finalScore ?? 0;
      t.max += g.maxScore;
      for (const c of g.aiCriteria) if (!c.met) t.missed.set(c.criterion, (t.missed.get(c.criterion) ?? 0) + 1);
      map.set(key, t);
    }
    return [...map.values()]
      .map((t) => {
        const top = [...t.missed.entries()].sort((a, b) => b[1] - a[1])[0];
        return { label: t.label, mastery: t.max ? Math.round((t.got / t.max) * 100) : 0, commonMiss: top ? { text: top[0], count: top[1] } : null, question: t.question };
      })
      .sort((a, b) => a.mastery - b.mastery);
  }, [usable]);

  // Pairs of papers with nearly the same written answer on the same question.
  const similarPairs = useMemo(() => {
    const out: { a: string; b: string; q: number; score: number }[] = [];
    const byQ = new Map<number, QuestionGradeRow[]>();
    for (const g of usable) if ((g.aiTranscription ?? '').replace(/\s+/g, '').length >= 30) byQ.set(g.questionNumber, [...(byQ.get(g.questionNumber) ?? []), g]);
    byQ.forEach((list, q) => {
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const score = similarity(list[i].aiTranscription!, list[j].aiTranscription!);
          if (score >= 0.85) out.push({ a: list[i].submissionId, b: list[j].submissionId, q, score });
        }
    });
    return out.sort((x, y) => y.score - x.score).slice(0, 10);
  }, [usable]);

  const exportCsv = () => {
    if (!exam) return;
    const questionNumbers = [...new Set(usable.map((g) => g.questionNumber))].sort((a, b) => a - b);
    const rows: (string | number)[][] = [['الطالب', 'الرمز', ...questionNumbers.map((n) => `س${n}`), 'المجموع', 'من', 'الحالة']];
    for (const s of graded) {
      const own = usable.filter((g) => g.submissionId === s.id);
      rows.push([
        s.studentName,
        s.studentCode,
        ...questionNumbers.map((n) => own.find((g) => g.questionNumber === n)?.finalScore ?? ''),
        s.totalScore,
        total,
        s.status === 'approved' ? 'معتمد' : 'بانتظار المراجعة',
      ]);
    }
    downloadCsv(`${exam.title}.csv`, rows);
  };

  const transcriptionOf = (subId: string, q: number) => usable.find((g) => g.submissionId === subId && g.questionNumber === q)?.aiTranscription ?? '';

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      {showMoodle && exam && <MoodleExportDialog exam={exam} submissions={subsQ.data ?? []} onClose={() => setShowMoodle(false)} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <button
            onClick={() => onNavigate('B4')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة الامتحانات</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F]">نتائج الامتحان وتحليل المجموعة</h1>
          <select
            value={examId}
            onChange={(e) => setSavedExamId(e.target.value)}
            className="mt-1 max-w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.title} · {ex.group}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">{graded.length} ورقة مصححة</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!graded.length}
            className="bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => setShowMoodle(true)}
            disabled={!exam}
            className="bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-orange-500" />
            <span>تصدير لـ Moodle</span>
          </button>
          <button
            onClick={() => onNavigate('C2')}
            className="bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>تمارين علاجية للمجموعة</span>
          </button>
          <button
            onClick={() => onNavigate('B10')}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>إرسال التقارير للأهالي ←</span>
          </button>
        </div>
      </div>

      {!stats ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-600">
          {subsQ.loading ? 'جاري التحميل...' : 'لا توجد أوراق مصححة في هذا الامتحان بعد.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">متوسط المجموعة</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">{stats.avg}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs min-w-0">
              <span className="text-xs text-slate-500">أعلى درجة</span>
              <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">{stats.best.totalScore} / {total}</div>
              <span className="text-[11px] text-slate-500 block truncate">{stats.best.studentName}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs min-w-0">
              <span className="text-xs text-slate-500">أدنى درجة</span>
              <div className="text-2xl font-black text-red-600 font-mono tabular-nums">{stats.worst.totalScore} / {total}</div>
              <span className="text-[11px] text-slate-500 block truncate">{stats.worst.studentName}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
              <span className="text-xs text-slate-500">نسبة النجاح (50% فأكثر)</span>
              <div className="text-2xl font-black text-[#1E3A5F] font-mono tabular-nums">{Math.round((stats.passed / graded.length) * 100)}%</div>
              <span className="text-[11px] text-slate-500">{stats.passed} من {graded.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>توزيع الدرجات (بالنسبة المئوية)</span>
                </h3>
                <span className="text-xs text-slate-400">{graded.length} طالباً</span>
              </div>
              <div className="space-y-3 pt-2">
                {stats.buckets.map((bucket, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">{bucket.range}</span>
                      <span className="font-mono tabular-nums text-slate-500">{bucket.count} ({bucket.pct})</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-emerald-600' : idx === 1 ? 'bg-blue-600' : idx === 2 ? 'bg-blue-400' : idx === 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: bucket.pct }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-[#1E3A5F] text-sm">نسبة الإتقان بحسب الدروس</h3>
                </div>
                <div className="space-y-3 text-xs">
                  {topics.length === 0 && <p className="text-slate-500">لا توجد درجات أسئلة بعد.</p>}
                  {topics.map((t, i) => {
                    const tone = t.mastery < 60 ? 'red' : t.mastery < 80 ? 'amber' : 'emerald';
                    const cls = {
                      red: 'bg-red-50/60 border-red-200 text-red-950',
                      amber: 'bg-amber-50/60 border-amber-200 text-amber-950',
                      emerald: 'bg-emerald-50/60 border-emerald-200 text-emerald-950',
                    }[tone];
                    return (
                      <div key={t.label} className={`p-3 border rounded-xl space-y-1 ${cls}`}>
                        <div className="flex items-center justify-between gap-2 font-bold">
                          <span className="min-w-0 break-words">{i + 1}. {t.label}</span>
                          <span className="font-mono tabular-nums shrink-0">{t.mastery}% إتقان</span>
                        </div>
                        {t.commonMiss && t.mastery < 80 && (
                          <p className="text-[11px] opacity-80">
                            أكثر معيار لم يتحقق: <strong>{t.commonMiss.text}</strong> ({t.commonMiss.count} طلاب)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => onNavigate('C2')}
                className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>توليد ورقة تمارين علاجية للأخطاء الشائعة</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">درجات الطلاب</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {[...graded].sort((a, b) => b.totalScore - a.totalScore).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSubmission(s.id);
                    onNavigate('B12');
                  }}
                  className="w-full py-2 flex items-center justify-between gap-2 text-right cursor-pointer hover:bg-slate-50"
                >
                  <span className="font-bold text-slate-800 truncate">{s.studentName}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {s.status !== 'approved' && <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 rounded">بانتظار المراجعة</span>}
                    <span className={`font-mono font-bold tabular-nums ${pct(s) >= 85 ? 'text-emerald-600' : pct(s) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.totalScore} / {total}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">إجابات متشابهة جداً</h3>
              </div>
              <span className="text-[11px] text-slate-500 italic">«هذا تنبيه للمراجعة، ليس حكماً».</span>
            </div>
            {similarPairs.length === 0 ? (
              <p className="text-xs text-slate-500">لا توجد إجابات متطابقة بشكل لافت.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {similarPairs.map((p, i) => (
                  <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-slate-800 break-words">{nameOf(p.a)} ↔ {nameOf(p.b)}</span>
                      <p className="text-[11px] text-slate-500">السؤال {p.q} · تشابه {Math.round(p.score * 100)}%</p>
                    </div>
                    <button
                      onClick={() => setComparePair(p)}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      قارن الإجابتين
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {comparePair && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-[#1E3A5F] text-base">مقارنة إجابتي السؤال {comparePair.q}</h3>
              <button onClick={() => setComparePair(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[comparePair.a, comparePair.b].map((id) => (
                <div key={id} className="p-3 bg-slate-50 border rounded-lg space-y-1">
                  <strong className="block text-slate-800">{nameOf(id)}</strong>
                  <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words font-serif">{transcriptionOf(id, comparePair.q)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setComparePair(null)} className="bg-[#1E3A5F] text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
