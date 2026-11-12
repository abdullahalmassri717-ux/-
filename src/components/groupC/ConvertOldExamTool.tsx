import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { Camera, ArrowRight, FileCheck2, Sparkles, Check, Loader2, Database, FilePlus2, Trash2, Layers, Eye } from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { DraftQuestion } from '../../data/ai';
import type { QuestionGradeRow, SubmissionRow } from '../../data/types';
import { setExamDraft } from '../../data/examDraft';
import { getSelected, setSelected } from '../../data/selection';
import { prepareImageForGrading, type PreparedImage } from '../../lib/imageResize';
import { filesToPageImages, pdfErrorText, PAGE_FILE_ACCEPT } from '../../lib/pdfPages';
import { notify } from '../../lib/notify';

interface ConvertOldExamToolProps {
  onNavigate: (screen: ScreenId) => void;
}

/** Subjects of the teacher's groups, with their lessons. */
function useTeacherSubjects() {
  const groupsQ = useLoad((st) => st.listGroups());
  const curriculaQ = useLoad((st) => st.listCurricula());
  return useMemo(() => {
    const groups = groupsQ.data ?? [];
    const ids = new Set(groups.map((g) => g.subjectId).filter(Boolean));
    const out: { id: string; label: string; groupId: string | null; lessons: { id: string; title: string }[] }[] = [];
    for (const c of curriculaQ.data ?? [])
      for (const g of c.grades)
        for (const s of g.subjects)
          if (ids.has(s.id))
            out.push({
              id: s.id,
              label: `${s.name} • ${g.name}`,
              groupId: groups.find((gr) => gr.subjectId === s.id)?.id ?? null,
              lessons: s.units.flatMap((u) => u.lessons.map((l) => ({ id: l.id, title: l.title }))),
            });
    return out;
  }, [groupsQ.data, curriculaQ.data]);
}

export const ConvertOldExamTool: React.FC<ConvertOldExamToolProps> = ({ onNavigate }) => {
  const store = useData();
  const subjects = useTeacherSubjects();
  const [subjectId, setSubjectId] = useState('');
  useEffect(() => {
    if (!subjectId && subjects.length) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);
  const subject = subjects.find((s) => s.id === subjectId);

  const [pages, setPages] = useState<PreparedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<(DraftQuestion & { key: string })[]>([]);
  const [saved, setSaved] = useState(false);

  const addPages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const r = await filesToPageImages([...files], Math.max(6 - pages.length, 0));
      if (r.truncated) notify('يمكن رفع 6 صفحات كحد أقصى', 'warning');
      if (r.skipped) notify('اختر صوراً (JPG أو PNG) أو ملف PDF فقط.', 'warning');
      const prepared = await Promise.all(r.images.map((f) => prepareImageForGrading(f)));
      setPages((prev) => [...prev, ...prepared]);
    } catch (e) {
      notify(pdfErrorText(e, 'اختر صوراً (JPG أو PNG) أو ملف PDF.'), 'warning');
    }
  };

  const extract = async () => {
    if (!subjectId) return notify('اختر المادة أولاً');
    if (!pages.length) return notify('أضف صورة واحدة على الأقل للورقة');
    setIsProcessing(true);
    try {
      const r = await store.aiExtractExam(subjectId, pages);
      if (!r.readable || !r.questions.length) return notify('لم نتمكن من قراءة الأسئلة. صوّر الورقة بوضوح ومن الأعلى.', 'warning');
      setQuestions(r.questions.map((q, i) => ({ ...q, key: `x${Date.now()}_${i}` })));
      setSaved(false);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setIsProcessing(false);
    }
  };

  const update = (key: string, patch: Partial<DraftQuestion>) => setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const saveToBank = async () => {
    try {
      const n = await store.addBankQuestions(questions.map((q) => ({ ...q, subjectId, source: 'old_exam' as const })));
      setSaved(true);
      notify(`حُفظ ${n} سؤال في بنك الأسئلة`, 'success');
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const createExam = () => {
    setExamDraft({
      title: '',
      groupId: subject?.groupId ?? null,
      kind: 'exam',
      questions: questions.map(({ key: _key, ...q }) => q),
    });
    onNavigate('B5');
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-4">
        <button onClick={() => onNavigate('C_HUB')} className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1">
          <ArrowRight className="w-4 h-4" />
          <span>العودة للأدوات الذكية</span>
        </button>
        <h1 className="text-xl font-extrabold text-[#1E3A5F]">تحويل امتحان ورقي قديم إلى أسئلة جاهزة</h1>
        <p className="text-xs text-slate-500">صوّر امتحاناً قديماً، فيقرأ الذكاء الاصطناعي الأسئلة ويقترح الدرس والدرجة ومعايير التصحيح. راجعها ثم احفظها في البنك أو أنشئ منها امتحاناً.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-bold text-slate-700 shrink-0">المادة:</span>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold min-w-0">
            {!subjects.length && <option value="">أنشئ مجموعة لها مادة أولاً</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {pages.map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-200">
              <img src={p.dataUrl} alt={`صفحة ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => setPages((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`حذف الصفحة ${i + 1}`}
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
          {pages.length < 6 && (
            <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-[#1E3A5F]/30 bg-blue-50 flex flex-col items-center justify-center gap-1 text-[#1E3A5F] text-[11px] font-bold cursor-pointer text-center p-1">
              <Camera className="w-6 h-6" />
              <span>صوّر أو اختر صفحة أو PDF</span>
              <input
                type="file"
                accept={PAGE_FILE_ACCEPT}
                multiple
                className="sr-only"
                onChange={(e) => {
                  void addPages(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>

        <button
          onClick={extract}
          disabled={isProcessing || !pages.length}
          className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
          <span>{isProcessing ? 'جارٍ قراءة الورقة...' : 'استخراج الأسئلة'}</span>
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>الأسئلة المستخرجة ({questions.length})</span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button onClick={saveToBank} disabled={saved} className="bg-white border border-slate-300 px-3 py-2 rounded-xl font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
                {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Database className="w-4 h-4" />}
                <span>{saved ? 'في البنك' : 'احفظ في البنك'}</span>
              </button>
              <button onClick={createExam} className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 cursor-pointer">
                <FilePlus2 className="w-4 h-4" />
                <span>أنشئ امتحاناً</span>
              </button>
            </div>
          </div>
          {questions.map((q, i) => (
            <div key={q.key} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#1E3A5F] text-white font-black px-2.5 py-0.5 rounded-lg">سؤال {i + 1}</span>
                <button onClick={() => setQuestions((prev) => prev.filter((x) => x.key !== q.key))} aria-label="حذف السؤال" className="text-slate-400 hover:text-red-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea value={q.text} onChange={(e) => update(q.key, { text: e.target.value })} rows={3} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={q.lessonId ?? ''}
                  onChange={(e) => update(q.key, { lessonId: e.target.value || null })}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 min-w-0"
                  aria-label="الدرس"
                >
                  <option value="">الدرس: غير محدد</option>
                  {subject?.lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                <span className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold">الدرجة المقترحة: {q.maxScore}</span>
              </div>
              <details>
                <summary className="font-bold text-slate-600 cursor-pointer">نموذج الإجابة والمعايير</summary>
                {q.modelAnswer && <p className="mt-2 text-slate-600 whitespace-pre-wrap">{q.modelAnswer}</p>}
                <ul className="mt-2 list-disc list-inside text-slate-600">
                  {q.criteria.map((c, j) => (
                    <li key={j}>
                      {c.description} ({c.points})
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 text-center">تعدّل الدرجات والمعايير بالتفصيل في شاشة إنشاء الامتحان.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Groups one question's answers by which marking criteria the AI found met.
 * Answers in a group earned the same points for the same reasons, so the
 * teacher can confirm the whole group at once and open any single paper.
 */
export const ClusterGradingTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const store = useData();
  const examsQ = useLoad((st) => st.listAssessments());
  const exams = (examsQ.data ?? []).filter((e) => e.status !== 'awaiting_papers');
  const [examId, setExamId] = useState(() => getSelected('exam') ?? '');
  useEffect(() => {
    if (!exams.length) return;
    if (!examId || !exams.some((e) => e.id === examId)) setExamId(exams[0].id);
  }, [exams, examId]);

  const gradesQ = useLoad((st) => (examId ? st.listAssessmentGrades(examId) : Promise.resolve<QuestionGradeRow[]>([])), [examId]);
  const subsQ = useLoad((st) => (examId ? st.listSubmissions(examId) : Promise.resolve<SubmissionRow[]>([])), [examId]);
  const grades = gradesQ.data ?? [];
  const subs = new Map((subsQ.data ?? []).map((s) => [s.id, s]));
  const questionNumbers = [...new Set(grades.map((g) => g.questionNumber))].sort((a, b) => a - b);
  const [qNum, setQNum] = useState<number | null>(null);
  const activeQ = qNum && questionNumbers.includes(qNum) ? qNum : questionNumbers[0] ?? null;
  const [busy, setBusy] = useState<string | null>(null);

  const answers = grades.filter((g) => g.questionNumber === activeQ && g.aiScore !== null && subs.get(g.submissionId)?.status !== 'approved');
  const clusters = useMemo(() => {
    const map = new Map<string, QuestionGradeRow[]>();
    for (const a of answers) {
      const key = a.aiCriteria.map((c) => (c.met ? '1' : '0')).join('') + `|${a.aiScore}`;
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.values()].sort((a, b) => b.length - a.length);
  }, [answers]);
  const question = grades.find((g) => g.questionNumber === activeQ);

  const applyCluster = async (rows: QuestionGradeRow[], id: string) => {
    setBusy(id);
    try {
      for (const r of rows.filter((r) => !r.reviewedAt)) await store.saveTeacherGrade(r.id, Number(r.aiScore), r.teacherNote);
      notify(`اعتُمدت الدرجة لـ ${rows.length} إجابة`, 'success');
      gradesQ.reload();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const openPaper = (submissionId: string) => {
    setSelected('exam', examId);
    setSelected('submission', submissionId);
    onNavigate('B8');
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-4 space-y-3">
        <button onClick={() => onNavigate('B8')} className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium">
          <ArrowRight className="w-4 h-4" />
          <span>العودة لمراجعة التصحيح</span>
        </button>
        <h1 className="text-xl font-extrabold text-[#1E3A5F] flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <span>مراجعة سؤالاً سؤالاً: الإجابات المتشابهة معاً</span>
        </h1>
        <p className="text-xs text-slate-500">نجمع إجابات الطلاب التي حققت نفس معايير التصحيح. اعتمد درجة المجموعة كلها بضغطة، أو افتح أي ورقة لمراجعتها وحدها.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white font-bold min-w-0" aria-label="الامتحان">
            {!exams.length && <option value="">لا توجد امتحانات مصحّحة بعد</option>}
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {questionNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setQNum(n)}
                className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${activeQ === n ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white border-slate-200 text-slate-700'}`}
              >
                س{n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {question && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1">
          <span className="font-bold text-slate-700">السؤال {activeQ} ({question.maxScore} درجات):</span>
          <p className="text-slate-800 whitespace-pre-wrap">{question.questionText}</p>
        </div>
      )}

      {gradesQ.loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !clusters.length ? (
        <p className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
          لا توجد إجابات مصحّحة بانتظار المراجعة في هذا السؤال.
        </p>
      ) : (
        <div className="space-y-4">
          {clusters.map((rows, i) => {
            const rep = rows[0];
            const id = `c${i}`;
            const pending = rows.filter((r) => !r.reviewedAt).length;
            return (
              <div key={id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">مجموعة {i + 1}: {rows.length} إجابة</span>
                    <span className="block text-slate-500">حققت: {rep.aiCriteria.filter((c) => c.met).map((c) => c.criterion).join('، ') || 'لا معايير'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-emerald-600 tabular-nums">
                      {rep.aiScore} / {rep.maxScore}
                    </span>
                    <button
                      onClick={() => applyCluster(rows, id)}
                      disabled={!pending || busy !== null}
                      className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-default ${pending ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {busy === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>{pending ? `اعتمد الدرجة لـ ${pending}` : 'معتمدة ✓'}</span>
                    </button>
                  </div>
                </div>
                {rep.aiTranscription && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700 text-[11px] block">مثال من إجابات المجموعة:</span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{rep.aiTranscription}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {rows.map((r) => {
                    const s = subs.get(r.submissionId);
                    return (
                      <button
                        key={r.id}
                        onClick={() => openPaper(r.submissionId)}
                        className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${r.reviewedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'}`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{s?.studentName || s?.studentCode || 'ورقة'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
