import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { ArrowRight, BookOpen, Plus, Search, Trash2, FilePlus2, Loader2, Sparkles, X } from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { BankQuestion, NewBankQuestion } from '../../data/ai';
import { setExamDraft } from '../../data/examDraft';
import { notify } from '../../lib/notify';

interface QuestionBankToolProps {
  onNavigate: (screen: ScreenId) => void;
}

const SOURCES: { id: BankQuestion['source'] | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'teacher', label: 'أسئلتي' },
  { id: 'ministerial', label: 'وزاري' },
  { id: 'ai_generated', label: 'مولّدة' },
  { id: 'old_exam', label: 'امتحان قديم' },
  { id: 'past_exam', label: 'امتحاناتي السابقة' },
];
const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.id, s.label])) as Record<string, string>;
const DIFF_LABEL = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' } as const;

export const QuestionBankTool: React.FC<QuestionBankToolProps> = ({ onNavigate }) => {
  const store = useData();
  const groupsQ = useLoad((st) => st.listGroups());
  const curriculaQ = useLoad((st) => st.listCurricula());

  // Subjects the teacher actually teaches (from their groups).
  const subjects = useMemo(() => {
    const ids = new Set((groupsQ.data ?? []).map((g) => g.subjectId).filter(Boolean));
    const out: { id: string; label: string; lessons: { id: string; title: string; outcomes: string[] }[] }[] = [];
    for (const c of curriculaQ.data ?? [])
      for (const g of c.grades)
        for (const s of g.subjects)
          if (ids.has(s.id))
            out.push({
              id: s.id,
              label: `${s.name} • ${g.name}`,
              lessons: s.units.flatMap((u) => u.lessons.map((l) => ({ id: l.id, title: l.title, outcomes: l.learningOutcomes ?? l.outcomes ?? [] }))),
            });
    return out;
  }, [groupsQ.data, curriculaQ.data]);
  const [subjectId, setSubjectId] = useState('');
  useEffect(() => {
    if (!subjectId && subjects.length) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);
  const subject = subjects.find((s) => s.id === subjectId);
  const lessonTitle = (id: string | null) => subject?.lessons.find((l) => l.id === id)?.title ?? '';

  const bankQ = useLoad((st) => (subjectId ? st.listBank(subjectId) : Promise.resolve<BankQuestion[]>([])), [subjectId]);
  const questions = bankQ.data ?? [];

  const [source, setSource] = useState<string>('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = questions.filter((q) => {
    if (source !== 'all' && q.source !== source) return false;
    if (lessonFilter !== 'all' && q.lessonId !== lessonFilter) return false;
    if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
    const term = search.trim();
    if (term && !`${q.text} ${q.outcome} ${lessonTitle(q.lessonId)} ${q.sourceNote}`.includes(term)) return false;
    return true;
  });

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDelete = async (q: BankQuestion) => {
    try {
      await store.deleteBankQuestion(q.id);
      setSelected((prev) => prev.filter((x) => x !== q.id));
      bankQ.reload();
      notify('حُذف السؤال من البنك', 'success');
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const createExam = () => {
    const chosen = questions.filter((q) => selected.includes(q.id));
    if (!chosen.length) return notify('اختر سؤالاً واحداً على الأقل');
    const group = (groupsQ.data ?? []).find((g) => g.subjectId === subjectId);
    setExamDraft({
      title: '',
      groupId: group?.id ?? null,
      kind: 'exam',
      questions: chosen.map(({ lessonId, outcome, text, type, maxScore, modelAnswer, criteria }) => ({ lessonId, outcome, text, type, maxScore, modelAnswer, criteria })),
    });
    onNavigate('B5');
  };

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => onNavigate('C_HUB')}
            className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للأدوات الذكية</span>
          </button>
          <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-700" />
            <span>بنك الأسئلة</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">أسئلتك وأسئلة امتحاناتك السابقة والأسئلة المولّدة، مرتبة حسب الدرس. يراها أعضاء جهتك فقط.</p>
        </div>
        <button
          onClick={() => (subjectId ? setShowAdd(true) : notify('أنشئ مجموعة لها مادة أولاً'))}
          className="bg-[#1E3A5F] hover:bg-[#152a45] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سؤال</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2">
            <span className="font-bold text-slate-600 shrink-0">المادة:</span>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setLessonFilter('all');
                setSelected([]);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 min-w-0"
            >
              {!subjects.length && <option value="">لا توجد مواد بعد</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بنص السؤال أو الدرس..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${
                source === s.id ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <select value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 min-w-0">
            <option value="all">كل الدروس</option>
            {subject?.lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
            <option value="all">كل المستويات</option>
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="sticky top-16 z-10 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-emerald-900">اخترت {selected.length} سؤال</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected([])} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 font-bold cursor-pointer">
              إلغاء
            </button>
            <button onClick={createExam} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer">
              <FilePlus2 className="w-4 h-4" />
              <span>أنشئ امتحاناً منها</span>
            </button>
          </div>
        </div>
      )}

      {bankQ.loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !filtered.length ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500 space-y-3">
          <p>{questions.length ? 'لا توجد أسئلة بهذه الفلاتر.' : 'البنك فارغ. أضف أسئلتك، أو احفظ أسئلة من «توليد امتحان» أو «تحويل امتحان قديم».'}</p>
          <button onClick={() => onNavigate('C1')} className="text-[#1E3A5F] font-bold underline cursor-pointer text-xs">
            توليد أسئلة بالذكاء الاصطناعي
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className={`bg-white border rounded-2xl p-4 space-y-2 ${selected.includes(q.id) ? 'border-[#1E3A5F] ring-1 ring-[#1E3A5F]/20' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(q.id)}
                  onChange={() => toggle(q.id)}
                  aria-label="اختيار السؤال"
                  className="mt-1 rounded text-[#1E3A5F] shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      {SOURCE_LABEL[q.source]}
                      {q.sourceNote ? ` • ${q.sourceNote}` : ''}
                    </span>
                    {q.lessonId && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">{lessonTitle(q.lessonId) || 'درس'}</span>}
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{DIFF_LABEL[q.difficulty]}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.maxScore} درجات</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                  {q.outcome && <p className="text-[11px] text-slate-500">الناتج: {q.outcome}</p>}
                  {(q.modelAnswer || q.criteria.length > 0) && (
                    <details className="text-xs">
                      <summary className="font-bold text-slate-600 cursor-pointer">نموذج الإجابة والمعايير</summary>
                      {q.modelAnswer && <p className="mt-2 text-slate-600 whitespace-pre-wrap">{q.modelAnswer}</p>}
                      <ul className="mt-2 list-disc list-inside text-slate-600">
                        {q.criteria.map((c, i) => (
                          <li key={i}>
                            {c.description} ({c.points})
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                {!q.readOnly && (
                  <button onClick={() => handleDelete(q)} aria-label="حذف السؤال" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && subject && (
        <AddQuestionModal
          subjectId={subject.id}
          lessons={subject.lessons}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            bankQ.reload();
          }}
        />
      )}
    </div>
  );
};

const AddQuestionModal: React.FC<{
  subjectId: string;
  lessons: { id: string; title: string; outcomes: string[] }[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ subjectId, lessons, onClose, onSaved }) => {
  const store = useData();
  const [text, setText] = useState('');
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const [outcome, setOutcome] = useState('');
  const [src, setSrc] = useState<NewBankQuestion['source']>('teacher');
  const [note, setNote] = useState('');
  const [diff, setDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [maxScore, setMaxScore] = useState(10);
  const [modelAnswer, setModelAnswer] = useState('');
  const [criteria, setCriteria] = useState<{ description: string; points: number }[]>([]);
  const [busy, setBusy] = useState<'ai' | 'save' | null>(null);
  const lesson = lessons.find((l) => l.id === lessonId);

  const suggest = async () => {
    if (!text.trim()) return notify('اكتب نص السؤال أولاً');
    setBusy('ai');
    try {
      const r = await store.aiSuggestRubric({ subjectId, lessonId: lessonId || null, text, maxScore });
      setModelAnswer((prev) => prev || r.modelAnswer);
      setCriteria(r.criteria);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!text.trim()) return notify('اكتب نص السؤال');
    const used = criteria.filter((c) => c.description.trim());
    if (used.length && used.reduce((n, c) => n + c.points, 0) !== maxScore) return notify('مجموع نقاط المعايير لا يساوي درجة السؤال', 'warning');
    setBusy('save');
    try {
      await store.addBankQuestions([
        {
          subjectId,
          lessonId: lessonId || null,
          outcome,
          text,
          type: 'problem_solving',
          maxScore,
          modelAnswer,
          criteria: used,
          source: src,
          sourceNote: note,
          difficulty: diff,
        },
      ]);
      notify('أُضيف السؤال للبنك', 'success');
      onSaved();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-3 text-right text-xs my-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm">إضافة سؤال للبنك</h3>
          <button onClick={onClose} aria-label="إغلاق" className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="نص السؤال" className="w-full p-2.5 border border-slate-300 rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="p-2 border border-slate-300 rounded-lg bg-white min-w-0">
            <option value="">بدون درس</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="p-2 border border-slate-300 rounded-lg bg-white min-w-0">
            <option value="">ناتج التعلّم (اختياري)</option>
            {lesson?.outcomes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select value={src} onChange={(e) => setSrc(e.target.value as NewBankQuestion['source'])} className="p-2 border border-slate-300 rounded-lg bg-white">
            <option value="teacher">من أسئلتي</option>
            <option value="ministerial">وزاري</option>
            <option value="old_exam">امتحان قديم</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة المصدر (مثلاً 2023)" className="p-2 border border-slate-300 rounded-lg min-w-0" />
          <select value={diff} onChange={(e) => setDiff(e.target.value as typeof diff)} className="p-2 border border-slate-300 rounded-lg bg-white">
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
          <label className="flex items-center gap-2">
            <span className="shrink-0">الدرجة</span>
            <input
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(Math.max(1, Number(e.target.value) || 1))}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </label>
        </div>
        <textarea value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} rows={2} placeholder="نموذج الإجابة (اختياري)" className="w-full p-2.5 border border-slate-300 rounded-xl" />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">معايير التصحيح</span>
            <button onClick={suggest} disabled={busy !== null} className="text-[#1E3A5F] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
              {busy === 'ai' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>اقترح بالذكاء الاصطناعي</span>
            </button>
          </div>
          {criteria.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={c.description}
                onChange={(e) => setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                className="flex-1 p-2 border border-slate-300 rounded-lg min-w-0"
              />
              <input
                type="number"
                value={c.points}
                onChange={(e) => setCriteria((prev) => prev.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) || 0 } : x)))}
                className="w-16 p-2 border border-slate-300 rounded-lg"
                aria-label="النقاط"
              />
              <button onClick={() => setCriteria((prev) => prev.filter((_, j) => j !== i))} aria-label="حذف المعيار" className="text-slate-400 hover:text-red-600 cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setCriteria((prev) => [...prev, { description: '', points: 0 }])} className="text-slate-600 font-bold cursor-pointer">
            + معيار
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={busy !== null} className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-xl font-bold cursor-pointer disabled:opacity-50">
            {busy === 'save' ? 'جارٍ الحفظ...' : 'حفظ في البنك'}
          </button>
          <button onClick={onClose} className="px-4 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
