import React, { useMemo, useState } from 'react';
import { ArrowRight, Pencil, Plus, Trash2, Save, X, FileText, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { ScreenId, QuestionRubric } from '../../types';
import type { AssessmentDetail, QuestionInput } from '../../data/types';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import { notify } from '../../lib/notify';

interface ExamQuestionsPageProps {
  onNavigate: (screen: ScreenId) => void;
}

type EditQuestion = QuestionInput & { id?: string; key: string };

const TYPE_LABEL: Record<QuestionRubric['type'], string> = {
  multiple_choice: 'اختيار من متعدد',
  short_answer: 'إجابة قصيرة',
  problem_solving: 'مسألة / حل خطوات',
  essay: 'مقالي',
};

const toEdit = (exam: AssessmentDetail): EditQuestion[] =>
  exam.questions.map((q) => ({
    id: q.id,
    key: q.id,
    text: q.text,
    type: q.type,
    maxScore: q.maxScore,
    modelAnswer: q.modelAnswer,
    lessonId: q.lessonId,
    criteria: q.criteria.length ? q.criteria.map((c) => ({ ...c })) : [{ description: '', points: q.maxScore }],
  }));

let keySeq = 0;
const blank = (): EditQuestion => ({
  key: `new${Date.now()}_${keySeq++}`,
  text: '',
  type: 'problem_solving',
  maxScore: 10,
  modelAnswer: '',
  lessonId: null,
  criteria: [{ description: '', points: 10 }],
});

export const ExamQuestionsPage: React.FC<ExamQuestionsPageProps> = ({ onNavigate }) => {
  const store = useData();
  const [examId] = useSelected('exam');
  const examQ = useLoad((st) => (examId ? st.getAssessment(examId) : Promise.resolve(null)), [examId]);
  const curriculaQ = useLoad((st) => st.listCurricula());
  const exam = examQ.data ?? null;
  const [draft, setDraft] = useState<EditQuestion[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const editing = draft !== null;

  const lessons = useMemo(() => {
    for (const c of curriculaQ.data ?? []) for (const gr of c.grades) for (const sb of gr.subjects)
      if (sb.id === exam?.subjectId) return sb.units.flatMap((u) => u.lessons.map((l) => ({ id: l.id, title: l.title })));
    return [];
  }, [curriculaQ.data, exam?.subjectId]);

  const total = (exam?.questions ?? []).reduce((n, q) => n + q.maxScore, 0);
  const draftTotal = (draft ?? []).reduce((n, q) => n + (Number(q.maxScore) || 0), 0);
  const removedCount = editing && exam ? exam.questions.filter((q) => !draft!.some((d) => d.id === q.id)).length : 0;
  const hasPapers = (exam?.uploadedCount ?? 0) > 0;

  const update = (key: string, patch: Partial<EditQuestion>) =>
    setDraft((d) => (d ? d.map((q) => (q.key === key ? { ...q, ...patch } : q)) : d));
  const move = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const j = idx + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const save = async () => {
    if (!exam || !draft) return;
    const bad = draft.findIndex((q) => !(Number(q.maxScore) > 0));
    if (bad >= 0) {
      notify(`درجة السؤال ${bad + 1} لازم تكون أكبر من صفر.`, 'warning');
      return;
    }
    setSaving(true);
    try {
      await store.saveAssessmentQuestions(
        exam.id,
        draft.map(({ key: _key, ...q }) => ({ ...q, maxScore: Number(q.maxScore) })),
      );
      notify('تم حفظ أسئلة الامتحان.', 'success');
      setDraft(null);
      examQ.reload();
    } catch (e) {
      notify(errorMessage(e, 'تعذّر حفظ الأسئلة.'), 'warning');
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (editing) setConfirmLeave(true);
    else onNavigate('B4');
  };

  if (!examId) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-slate-600">اختر امتحاناً من قائمة الواجبات والامتحانات.</p>
        <button onClick={() => onNavigate('B4')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
          الذهاب للقائمة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={back} className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 mb-2 cursor-pointer">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>الواجبات والامتحانات</span>
          </button>
          <h1 className="text-xl font-extrabold text-[#1E3A5F] break-words">{exam?.title ?? 'أسئلة الامتحان'}</h1>
          {exam && (
            <p className="text-xs text-slate-500 mt-1">
              {exam.group} · {exam.date} · {exam.questions.length} سؤال · الدرجة الكلية{' '}
              <span className="font-mono tabular-nums font-bold text-slate-700">{editing ? draftTotal : total}</span>
            </p>
          )}
        </div>

        {exam && !editing && (
          <button
            onClick={() => setDraft(toEdit(exam).length ? toEdit(exam) : [blank()])}
            className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Pencil className="w-4 h-4" />
            <span>تعديل الأسئلة</span>
          </button>
        )}
      </div>

      {examQ.loading && !exam && <div className="text-center text-xs text-slate-500 py-10">جاري التحميل...</div>}
      {examQ.error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{examQ.error}</div>}
      {!examQ.loading && !examQ.error && !exam && (
        <div className="text-center text-xs text-slate-500 py-10">لم نجد هذا الامتحان. ربما حُذف.</div>
      )}

      {/* View mode */}
      {exam && !editing && (
        <>
          {exam.questions.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد أسئلة في هذا الامتحان بعد</p>
              <p className="text-xs text-slate-500">أضف الأسئلة والإجابات النموذجية حتى يقدر الذكاء الاصطناعي يصحّح الأوراق.</p>
              <button
                onClick={() => setDraft([blank()])}
                className="mt-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
              >
                إضافة الأسئلة
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {exam.questions.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                        {q.questionNumber}
                      </span>
                      <p className="text-sm font-bold text-slate-900 whitespace-pre-wrap break-words min-w-0">{q.text}</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-[#1E3A5F] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono tabular-nums">
                      {q.maxScore} درجة
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{TYPE_LABEL[q.type]}</span>
                    {q.lesson && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">الدرس: {q.lesson}</span>}
                  </div>
                  {q.modelAnswer && (
                    <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-3 text-xs">
                      <span className="block font-bold text-slate-700 mb-1">الإجابة النموذجية</span>
                      <p className="text-slate-800 whitespace-pre-wrap break-words">{q.modelAnswer}</p>
                    </div>
                  )}
                  {q.criteria.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="block font-bold text-slate-700">سلم التصحيح</span>
                      {q.criteria.map((c, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 last:border-0 py-1">
                          <span className="text-slate-700 break-words min-w-0">{c.description}</span>
                          <span className="font-mono tabular-nums font-bold text-[#1E3A5F] shrink-0">{c.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit mode */}
      {exam && editing && draft && (
        <div className="space-y-4">
          {hasPapers && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                هذا الامتحان فيه أوراق مرفوعة. التعديل يُطبّق على التصحيح من الآن وطالع، والدرجات المعتمدة سابقاً تبقى كما هي.
                {removedCount > 0 && <strong> حذف سؤال يحذف درجاته من الأوراق المصححة.</strong>}
              </span>
            </div>
          )}

          {draft.map((q, idx) => {
            const critSum = q.criteria.reduce((n, c) => n + (Number(c.points) || 0), 0);
            return (
              <div key={q.key} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">السؤال {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 text-slate-500 disabled:opacity-30 cursor-pointer" title="تحريك لأعلى">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === draft.length - 1} className="p-1.5 text-slate-500 disabled:opacity-30 cursor-pointer" title="تحريك لأسفل">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(draft.filter((x) => x.key !== q.key))}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-700 font-bold mb-1">نص السؤال</label>
                  <textarea
                    rows={2}
                    value={q.text}
                    onChange={(e) => update(q.key, { text: e.target.value })}
                    placeholder="اكتب نص السؤال كما في الورقة"
                    className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الدرجة</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={q.maxScore}
                      min={0.5}
                      step={0.5}
                      onChange={(e) => update(q.key, { maxScore: Number(e.target.value) })}
                      className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg font-mono font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نوع السؤال</label>
                    <select
                      value={q.type}
                      onChange={(e) => update(q.key, { type: e.target.value as QuestionRubric['type'] })}
                      className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg"
                    >
                      {Object.entries(TYPE_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-slate-700 font-bold mb-1">الدرس</label>
                    <select
                      value={q.lessonId ?? ''}
                      onChange={(e) => update(q.key, { lessonId: e.target.value || null })}
                      className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg"
                    >
                      <option value="">غير محدد</option>
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-700 font-bold mb-1">الإجابة النموذجية</label>
                  <textarea
                    rows={3}
                    value={q.modelAnswer}
                    onChange={(e) => update(q.key, { modelAnswer: e.target.value })}
                    placeholder="الحل الكامل الذي يقارن به التصحيح"
                    className="w-full p-2 bg-[#F7F8FA] border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">سلم التصحيح</span>
                    <span className={`text-[11px] font-mono tabular-nums ${critSum === Number(q.maxScore) ? 'text-slate-500' : 'text-amber-700 font-bold'}`}>
                      {critSum} / {q.maxScore}
                    </span>
                  </div>
                  {q.criteria.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center bg-white p-2 rounded-lg border border-slate-200 gap-2">
                      <input
                        type="text"
                        value={c.description}
                        onChange={(e) => update(q.key, { criteria: q.criteria.map((x, i) => (i === cIdx ? { ...x, description: e.target.value } : x)) })}
                        placeholder="مثال: كتابة القانون الصحيح"
                        className="flex-1 min-w-0 bg-transparent focus:outline-none text-slate-800"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={c.points}
                        min={0}
                        step={0.5}
                        onChange={(e) => update(q.key, { criteria: q.criteria.map((x, i) => (i === cIdx ? { ...x, points: Number(e.target.value) } : x)) })}
                        aria-label="النقاط"
                        className="w-14 bg-blue-50 text-[#1E3A5F] px-1 py-0.5 rounded font-bold font-mono tabular-nums text-center"
                      />
                      <button
                        type="button"
                        onClick={() => update(q.key, { criteria: q.criteria.filter((_, i) => i !== cIdx) })}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        title="حذف المعيار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update(q.key, { criteria: [...q.criteria, { description: '', points: 0 }] })}
                    className="text-[11px] text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة معيار
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setDraft([...draft, blank()])}
            className="w-full bg-[#E8F0F8] hover:bg-[#d8e6f4] text-[#1E3A5F] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سؤال</span>
          </button>

          {/* Save bar */}
          <div className="sticky bottom-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {draft.length} سؤال · المجموع <span className="font-mono tabular-nums font-bold">{draftTotal}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#152a45] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmLeave(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 text-right" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-slate-900">في تعديلات ما انحفظت. بدك تطلع بدون حفظ؟</p>
            <div className="flex gap-2 justify-start">
              <button onClick={() => setConfirmLeave(false)} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
                ارجع للتعديل
              </button>
              <button onClick={() => onNavigate('B4')} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
                اطلع بدون حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
