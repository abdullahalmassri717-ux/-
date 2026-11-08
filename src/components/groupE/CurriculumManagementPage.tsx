import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, FileSpreadsheet, Plus, ChevronDown, ChevronLeft, Edit3, Trash2, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { ScreenId } from '../../types';
import { curriculumAdminApi, type CCurriculum, type CLesson, type Level } from '../../data/curriculumAdmin';
import { notify } from '../../lib/notify';
import { CurriculumImportPanel } from './CurriculumImportPanel';

interface CurriculumManagementPageProps {
  onNavigate?: (screenId: ScreenId) => void;
}

const api = curriculumAdminApi();
const errText = (e: unknown, fallback: string) => (e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : fallback);
const LEVEL_LABEL: Record<Level, string> = { curriculum: 'منهج', grade: 'صف', subject: 'مادة', unit: 'وحدة', lesson: 'درس' };

/** Inline prompt (no browser dialogs): a small text field with save / cancel. */
const InlineInput: React.FC<{ placeholder: string; initial?: string; onSave: (v: string) => void; onCancel: () => void }> = ({
  placeholder,
  initial = '',
  onSave,
  onCancel,
}) => {
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSave(v.trim());
      }}
      className="flex items-center gap-1.5"
    >
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 p-1.5 border border-blue-300 rounded-lg text-xs" />
      <button type="submit" className="bg-[#1E3A5F] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold">
        حفظ
      </button>
      <button type="button" onClick={onCancel} className="text-slate-500 px-1 text-[11px]">
        إلغاء
      </button>
    </form>
  );
};

export const CurriculumManagementPage: React.FC<CurriculumManagementPageProps> = () => {
  const [tree, setTree] = useState<CCurriculum[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cId, setCId] = useState('');
  const [gId, setGId] = useState('');
  const [sId, setSId] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<{ level: Level; parentId: string | null } | null>(null);
  const [renaming, setRenaming] = useState<{ level: Level; id: string; name: string } | null>(null);
  const [lesson, setLesson] = useState<CLesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setTree(await api.load());
    } catch (e) {
      setError(errText(e, 'تعذّر تحميل المناهج.'));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{error}</div>;
  if (!tree)
    return (
      <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
      </div>
    );

  const curriculum = tree.find((c) => c.id === cId) ?? tree[0];
  const grade = curriculum?.grades.find((g) => g.id === gId) ?? curriculum?.grades[0];
  const subject = grade?.subjects.find((s) => s.id === sId) ?? grade?.subjects[0];

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      if (ok) notify(ok);
    } catch (e) {
      notify(errText(e, 'تعذّر الحفظ.'));
    } finally {
      setBusy(false);
    }
  };

  const addRow = (level: Level, parentId: string | null, order: number, select?: (id: string) => void) =>
    adding?.level === level && adding.parentId === parentId ? (
      <InlineInput
        placeholder={`اسم ${LEVEL_LABEL[level]} جديد`}
        onCancel={() => setAdding(null)}
        onSave={(name) =>
          run(async () => {
            const id = await api.add(level, parentId, name, order);
            setAdding(null);
            select?.(id);
            if (level === 'lesson') setLesson({ id, title: name, content: '', hasContent: false, outcomes: [], terms: [], symbols: [] });
          })
        }
      />
    ) : (
      <button onClick={() => setAdding({ level, parentId })} className="text-blue-700 text-[11px] font-bold flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> {LEVEL_LABEL[level]}
      </button>
    );

  const Selector: React.FC<{
    level: Level;
    items: { id: string; name: string }[];
    value: string | undefined;
    onChange: (id: string) => void;
    parentId: string | null;
  }> = ({ level, items, value, onChange, parentId }) => (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">{LEVEL_LABEL[level]}</span>
        {value && (
          <div className="flex gap-2">
            <button onClick={() => setRenaming({ level, id: value, name: items.find((i) => i.id === value)?.name ?? '' })} className="text-slate-400 hover:text-blue-700">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {renaming?.level === level && renaming.id === value ? (
        <InlineInput
          placeholder="الاسم"
          initial={renaming.name}
          onCancel={() => setRenaming(null)}
          onSave={(name) => run(async () => (await api.rename(level, renaming.id, name), setRenaming(null)))}
        />
      ) : (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold min-w-0">
          {!items.length && <option value="">— لا يوجد —</option>}
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      )}
      {addRow(level, parentId, items.length, onChange)}
    </div>
  );

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-black text-[#1E3A5F] flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> إدارة المناهج
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          منهج ← صف ← مادة ← وحدة ← درس، مع محتوى الدرس ونواتج التعلّم والمصطلحات. المعلمون يرون المواد «المنشورة» فقط.
        </p>
      </div>

      {curriculum && !importing && (
        <button
          onClick={() => setImporting(true)}
          className="bg-[#1E3A5F] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" /> استيراد دفعة واحدة من Excel
        </button>
      )}
      {curriculum && importing && (
        <CurriculumImportPanel curriculum={curriculum} api={api} onClose={() => setImporting(false)} onImported={load} />
      )}
      {!curriculum && (
        <p className="text-xs text-slate-500">ابدأ بإضافة منهج من الخانة أدناه، ثم تستطيع استيراد صفوفه وموادّه ودروسه من ملف Excel.</p>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <Selector level="curriculum" items={tree.map((c) => ({ id: c.id, name: c.name }))} value={curriculum?.id} parentId={null} onChange={(id) => (setCId(id), setGId(''), setSId(''))} />
        {curriculum && (
          <Selector level="grade" items={curriculum.grades} value={grade?.id} parentId={curriculum.id} onChange={(id) => (setGId(id), setSId(''))} />
        )}
        {grade && <Selector level="subject" items={grade.subjects} value={subject?.id} parentId={grade.id} onChange={setSId} />}
      </div>

      {curriculum && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            disabled={busy}
            onClick={() => run(() => api.setCurriculumAvailable(curriculum.id, !curriculum.isAvailable))}
            className={`px-3 py-1.5 rounded-lg font-bold border ${curriculum.isAvailable ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}
          >
            المنهج: {curriculum.isAvailable ? 'متاح للتسجيل' : '«قريباً»'} (تغيير)
          </button>
          {subject && (
            <button
              disabled={busy}
              onClick={() => run(() => api.setSubjectStatus(subject.id, subject.status === 'published' ? 'draft' : 'published'))}
              className={`px-3 py-1.5 rounded-lg font-bold border flex items-center gap-1 ${subject.status === 'published' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-300'}`}
            >
              {subject.status === 'published' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              المادة: {subject.status === 'published' ? 'منشورة' : 'مسودة'} (تغيير)
            </button>
          )}
        </div>
      )}

      {subject && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">وحدات {subject.name}</h3>
            {subject.units.map((u) => {
              const expanded = open[u.id] ?? true;
              return (
                <div key={u.id} className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-t-xl">
                    {renaming?.id === u.id ? (
                      <InlineInput
                        placeholder="اسم الوحدة"
                        initial={u.title}
                        onCancel={() => setRenaming(null)}
                        onSave={(name) => run(async () => (await api.rename('unit', u.id, name), setRenaming(null)))}
                      />
                    ) : (
                      <>
                        <button onClick={() => setOpen({ ...open, [u.id]: !expanded })} className="flex items-center gap-1 font-bold text-xs text-slate-800 min-w-0">
                          {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronLeft className="w-4 h-4 shrink-0" />}
                          <span className="truncate">{u.title}</span>
                        </button>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setRenaming({ level: 'unit', id: u.id, name: u.title })} className="text-slate-400 hover:text-blue-700">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => (u.lessons.length ? notify('احذف دروس الوحدة أولاً.') : run(() => api.remove('unit', u.id), 'حُذفت الوحدة.'))}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {expanded && (
                    <div className="p-2 space-y-1">
                      {u.lessons.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setLesson({ ...l })}
                          className={`w-full text-right p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${lesson?.id === l.id ? 'bg-blue-50 text-[#1E3A5F] font-bold' : 'hover:bg-slate-50'}`}
                        >
                          <span className="truncate">{l.title}</span>
                          <span className={`text-[10px] shrink-0 ${l.hasContent ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {l.outcomes.length} نواتج{l.hasContent ? '' : ' · بلا محتوى'}
                          </span>
                        </button>
                      ))}
                      <div className="px-2 pt-1">{addRow('lesson', u.id, u.lessons.length)}</div>
                    </div>
                  )}
                </div>
              );
            })}
            {addRow('unit', subject.id, subject.units.length)}
          </div>

          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            {!lesson ? (
              <p className="text-xs text-slate-500">اختر درساً لتعديل محتواه ونواتج تعلّمه.</p>
            ) : (
              <LessonEditor
                key={lesson.id}
                lesson={lesson}
                busy={busy}
                onSave={(l) => run(() => api.saveLesson(l), 'حُفظ الدرس.')}
                onDelete={() =>
                  run(async () => {
                    await api.remove('lesson', lesson.id);
                    setLesson(null);
                  }, 'حُذف الدرس.')
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

const LessonEditor: React.FC<{ lesson: CLesson; busy: boolean; onSave: (l: CLesson) => void; onDelete: () => void }> = ({ lesson, busy, onSave, onDelete }) => {
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content);
  // The tree comes without lesson text; fetch it when the lesson is opened.
  const [contentReady, setContentReady] = useState(!lesson.hasContent);
  useEffect(() => {
    if (!lesson.hasContent) return;
    let live = true;
    api
      .getLessonContent(lesson.id)
      .then((c) => {
        if (!live) return;
        setContent(c);
        setContentReady(true);
      })
      .catch(() => notify('تعذّر تحميل محتوى الدرس.', 'warning'));
    return () => {
      live = false;
    };
  }, [lesson.id, lesson.hasContent]);
  const [outcomes, setOutcomes] = useState(lesson.outcomes.join('\n'));
  const [terms, setTerms] = useState(lesson.terms.join('\n'));
  const [symbols, setSymbols] = useState(lesson.symbols.join('\n'));
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-3 text-xs">
      <label className="block space-y-1">
        <span className="font-bold">عنوان الدرس</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold" />
      </label>
      <label className="block space-y-1">
        <span className="font-bold">محتوى الدرس</span>
        <span className="block text-[11px] text-slate-500">هذا ما يُرسل للذكاء الاصطناعي عند توليد أسئلة من هذا الدرس فقط.</span>
        <textarea rows={8} value={contentReady ? content : 'جارٍ تحميل المحتوى…'} disabled={!contentReady} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg leading-relaxed" />
      </label>
      <label className="block space-y-1">
        <span className="font-bold">نواتج التعلّم (سطر لكل ناتج)</span>
        <textarea rows={4} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="font-bold">المصطلحات (سطر لكل مصطلح)</span>
          <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
        </label>
        <label className="block space-y-1">
          <span className="font-bold">الرموز (سطر لكل رمز)</span>
          <textarea rows={3} value={symbols} onChange={(e) => setSymbols(e.target.value)} dir="ltr" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          disabled={busy || !title.trim() || !contentReady}
          onClick={() => onSave({ id: lesson.id, title, content, hasContent: !!content.trim(), outcomes: lines(outcomes), terms: lines(terms), symbols: lines(symbols) })}
          className="bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> حفظ الدرس
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            <span className="text-rose-700">حذف الدرس نهائياً؟</span>
            <button onClick={onDelete} className="text-rose-700 font-bold">
              نعم
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-slate-500">
              لا
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-rose-600 font-bold flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> حذف
          </button>
        )}
      </div>
    </div>
  );
};
