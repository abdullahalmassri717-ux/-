import React, { useEffect, useMemo, useState } from 'react';
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
  Database,
  Save,
  FilePlus2,
} from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { BankQuestion, DraftQuestion } from '../../data/ai';
import { setExamDraft } from '../../data/examDraft';
import type { TaughtLessons } from '../../data/types';
import { notify } from '../../lib/notify';

interface GenerateExamToolProps {
  onNavigate: (screen: ScreenId) => void;
  preselectedLessonIds?: string[];
}

type Item = DraftQuestion & { key: string; origin: 'ai' | 'bank'; sourceLabel: string; saved?: boolean };

const SOURCE_LABEL: Record<BankQuestion['source'], string> = {
  teacher: 'من أسئلتك',
  ai_generated: 'مولّد سابقاً',
  old_exam: 'امتحان قديم',
  ministerial: 'وزاري',
  past_exam: 'امتحان سابق',
};

export const GenerateExamTool: React.FC<GenerateExamToolProps> = ({ onNavigate, preselectedLessonIds }) => {
  const store = useData();
  const groupsQ = useLoad((st) => st.listGroups());
  const curriculaQ = useLoad((st) => st.listCurricula());
  const groups = groupsQ.data ?? [];
  const [groupId, setGroupId] = useState('');
  useEffect(() => {
    if (!groupId && groups.length) setGroupId(groups[0].id);
  }, [groups, groupId]);
  const group = groups.find((g) => g.id === groupId);

  const subject = useMemo(() => {
    for (const c of curriculaQ.data ?? [])
      for (const g of c.grades)
        for (const s of g.subjects)
          if (s.id === group?.subjectId) return { curriculum: c.name, grade: g.name, subject: s.name, units: s.units };
    return null;
  }, [curriculaQ.data, group?.subjectId]);
  const allLessons = useMemo(
    () => (subject?.units ?? []).flatMap((u) => u.lessons.map((l) => ({ id: l.id, title: l.title, outcome: l.learningOutcomes?.[0] ?? l.outcomes?.[0] ?? '' }))),
    [subject],
  );
  const lessonTitle = (id: string | null) => allLessons.find((l) => l.id === id)?.title ?? 'غير محدد';

  const taughtQ = useLoad((st) => (groupId ? st.getTaughtLessons(groupId) : Promise.resolve<TaughtLessons>({})), [groupId]);
  const taught: TaughtLessons = taughtQ.data ?? {};
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>(preselectedLessonIds ?? []);

  // Default: the most recently taught lessons of this group.
  useEffect(() => {
    if (preselectedLessonIds?.length || !taughtQ.data) return;
    const recent = Object.entries(taughtQ.data)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([id]) => id)
      .filter((id) => allLessons.some((l) => l.id === id))
      .slice(0, 3);
    setSelectedLessons(recent);
  }, [taughtQ.data, allLessons, preselectedLessonIds]);

  const [sourceMode, setSourceMode] = useState<'bank_first' | 'new_ai' | 'mixed'>('mixed');
  const [qCount, setQCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [note, setNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<{ text: string; reason: string }[]>([]);

  const hasUntaughtSelected = selectedLessons.some((id) => !taught[id]);
  const visibleLessons = showAllLessons ? allLessons : allLessons.filter((l) => taught[l.id] || selectedLessons.includes(l.id));

  const toggleLesson = (id: string) =>
    setSelectedLessons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleGenerate = async () => {
    if (!group?.subjectId) return notify('اختر مجموعة مرتبطة بمادة أولاً');
    if (!selectedLessons.length) return notify('اختر درساً واحداً على الأقل');
    setIsGenerating(true);
    setRejected([]);
    try {
      const existing = new Set(items.map((i) => i.text));
      let fromBank: Item[] = [];
      if (sourceMode !== 'new_ai') {
        const bank = await store.listBank(group.subjectId);
        const wanted = sourceMode === 'bank_first' ? qCount : Math.floor(qCount / 2);
        fromBank = bank
          .filter((q) => q.lessonId && selectedLessons.includes(q.lessonId) && !existing.has(q.text))
          .slice(0, wanted)
          .map((q) => ({ ...q, key: `b_${q.id}`, origin: 'bank' as const, sourceLabel: `${SOURCE_LABEL[q.source]}${q.sourceNote ? ` (${q.sourceNote})` : ''}`, saved: true }));
      }
      const remaining = qCount - fromBank.length;
      let generated: Item[] = [];
      if (remaining > 0) {
        const r = await store.aiGenerateQuestions({
          subjectId: group.subjectId,
          groupId: group.id,
          lessonIds: selectedLessons,
          count: remaining,
          difficulty,
          purpose: 'exam',
          note,
          avoid: [...existing, ...fromBank.map((q) => q.text)],
        });
        generated = r.questions.map((q, i) => ({ ...q, key: `g_${Date.now()}_${i}`, origin: 'ai' as const, sourceLabel: 'توليد جديد' }));
        setRejected(r.rejected);
      }
      setItems((prev) => [...fromBank, ...generated, ...prev]);
      if (!fromBank.length && !generated.length) notify('لم تُنتج أسئلة. جرّب دروساً أخرى أو عدداً أقل.', 'warning');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToBank = async (list: Item[]) => {
    const fresh = list.filter((q) => !q.saved);
    if (!fresh.length) return notify('هذه الأسئلة محفوظة في البنك');
    try {
      await store.addBankQuestions(
        fresh.map((q) => ({ ...q, subjectId: group?.subjectId ?? null, source: 'ai_generated' as const, difficulty })),
      );
      const keys = new Set(fresh.map((q) => q.key));
      setItems((prev) => prev.map((q) => (keys.has(q.key) ? { ...q, saved: true } : q)));
      notify(`حُفظ ${fresh.length} سؤال في بنك الأسئلة`, 'success');
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const createExam = () => {
    if (!items.length) return notify('ولّد الأسئلة أولاً');
    setExamDraft({
      title: subject ? `امتحان ${subject.subject}` : '',
      groupId: group?.id ?? null,
      kind: 'exam',
      questions: items.map(({ lessonId, outcome, text, type, maxScore, modelAnswer, criteria }) => ({ lessonId, outcome, text, type, maxScore, modelAnswer, criteria })),
    });
    onNavigate('B5');
  };

  const total = items.reduce((n, q) => n + q.maxScore, 0);

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-12">
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
            <span>توليد امتحان مضبوط بالمنهاج</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            أسئلة من الدروس التي شرحتها فقط، مع نموذج إجابة ومعايير تصحيح، وفحص ثانٍ يتأكد أن كل سؤال يقيس ناتج تعلّم منها.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700 shrink-0">المجموعة:</span>
          <select
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setItems([]);
            }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 min-w-0"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!groupsQ.loading && !groups.length && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600 space-y-3">
          <p>أنشئ مجموعة وحدد مادتها أولاً، ثم علّم الدروس المشروحة في «وين وصلنا».</p>
          <button onClick={() => onNavigate('B2')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
            المجموعات والطلاب
          </button>
        </div>
      )}

      {hasUntaughtSelected && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="leading-relaxed">
            <strong className="block font-bold text-amber-950">تنبيه:</strong>
            أحد الدروس المختارة لم يُعلَّم «مشروحاً» لهذه المجموعة في «وين وصلنا». يمكنك الاستمرار، لكن الأفضل الاقتصار على ما درسه الطلاب.
          </div>
        </div>
      )}

      {group && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">المنهاج والصف والمادة:</span>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1E3A5F] shrink-0" />
                <span>{subject ? `${subject.curriculum} • ${subject.grade} • ${subject.subject}` : 'المجموعة غير مرتبطة بمادة'}</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">مصدر الأسئلة:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bank_first', label: 'البنك أولاً' },
                  { id: 'mixed', label: 'مزيج' },
                  { id: 'new_ai', label: 'توليد جديد' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceMode(opt.id as typeof sourceMode)}
                    className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      sourceMode === opt.id ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-bold text-slate-700 block">عدد الأسئلة</span>
              <input
                type="number"
                min={1}
                max={15}
                value={qCount}
                onChange={(e) => setQCount(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700 block">المستوى</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2 sm:col-span-1">
              <span className="font-bold text-slate-700 block">ملاحظات (اختياري)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: سؤال اختيار من متعدد + مسألتان"
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">الدروس:</span>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{selectedLessons.length} مختارة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllLessons(!showAllLessons)}
                className="text-xs text-[#1E3A5F] hover:underline font-bold cursor-pointer"
              >
                {showAllLessons ? 'الدروس المشروحة فقط' : 'أظهر كل دروس المادة'}
              </button>
            </div>
            {!visibleLessons.length ? (
              <div className="p-4 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 text-center space-y-2">
                <p>لم تعلّم أي درس «مشروحاً» لهذه المجموعة بعد.</p>
                <button type="button" onClick={() => setShowAllLessons(true)} className="text-[#1E3A5F] font-bold underline cursor-pointer">
                  اختر من كل دروس المادة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 border border-slate-200 rounded-xl">
                {visibleLessons.map((lesson) => {
                  const isTaught = !!taught[lesson.id];
                  const isSelected = selectedLessons.includes(lesson.id);
                  return (
                    <label
                      key={lesson.id}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected ? 'border-[#1E3A5F] bg-blue-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleLesson(lesson.id)} className="rounded text-[#1E3A5F] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block">{lesson.title}</span>
                          {lesson.outcome && <span className="text-[10px] text-slate-400 block truncate">{lesson.outcome}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isTaught ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        {isTaught ? 'مشروح ✓' : 'لم يُشرح'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isGenerating || !selectedLessons.length}
            onClick={handleGenerate}
            className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ كتابة الأسئلة ثم فحصها مقابل الدروس... (قد يستغرق دقيقة)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{items.length ? 'ولّد أسئلة إضافية' : 'ولّد الأسئلة ونموذج الإجابة ومعايير التصحيح'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {rejected.length > 0 && (
        <details className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
          <summary className="font-bold cursor-pointer">استبعد الفحص {rejected.length} سؤال لأنه خارج الدروس المختارة</summary>
          <ul className="mt-2 space-y-2">
            {rejected.map((r, i) => (
              <li key={i} className="bg-white/70 rounded-lg p-2">
                <span className="block text-slate-800">{r.text}</span>
                <span className="block text-amber-700 mt-0.5">السبب: {r.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>
                الأسئلة ({items.length}) • المجموع {total} درجة
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveToBank(items)}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>احفظ الكل في البنك</span>
              </button>
              <button
                type="button"
                onClick={createExam}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>أنشئ الامتحان من هذه الأسئلة</span>
              </button>
            </div>
          </div>

          {items.map((q, idx) => (
            <div key={q.key} className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#1E3A5F] text-white text-xs font-black px-2.5 py-0.5 rounded-lg">
                    سؤال {idx + 1} ({q.maxScore} درجات)
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-lg font-bold">الدرس: {lessonTitle(q.lessonId)}</span>
                  {q.origin === 'ai' ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>فُحص: داخل الدروس ✓</span>
                    </span>
                  ) : (
                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold">{q.sourceLabel}</span>
                  )}
                </div>
                <div className="flex gap-2 self-start sm:self-auto">
                  {q.origin === 'ai' && (
                    <button
                      type="button"
                      disabled={q.saved}
                      onClick={() => saveToBank([q])}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{q.saved ? 'في البنك' : 'احفظ في البنك'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((x) => x.key !== q.key))}
                    title="احذف هذا السؤال من القائمة"
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>

              {q.outcome && (
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">الناتج المستهدف:</span>
                  <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">{q.outcome}</span>
                </div>
              )}

              <p className="text-sm font-bold text-slate-900 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{q.text}</p>

              {q.modelAnswer && (
                <details className="text-xs">
                  <summary className="font-bold text-slate-700 cursor-pointer">نموذج الإجابة</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
                </details>
              )}

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block">معايير التصحيح:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pr-1">
                  {q.criteria.map((cr, cIdx) => (
                    <li key={cIdx}>
                      {cr.description} ({cr.points} {cr.points === 1 ? 'درجة' : 'درجات'})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 text-center">يمكنك تعديل أي سؤال أو درجة في الخطوة التالية قبل الحفظ.</p>
        </div>
      )}
    </div>
  );
};
