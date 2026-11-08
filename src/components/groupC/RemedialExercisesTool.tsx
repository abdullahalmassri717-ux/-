import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { ArrowRight, AlertTriangle, BookOpen, Sparkles, Loader2, Printer, MessageCircle, Users, User } from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { DraftQuestion } from '../../data/ai';
import type { DiagnosticRow, QuestionGradeRow, StudentHistory } from '../../data/types';
import { whatsappLink } from '../../data/billing';
import { getSelected } from '../../data/selection';
import { notify } from '../../lib/notify';

interface RemedialExercisesToolProps {
  onNavigate: (screen: ScreenId) => void;
}

type WeakLesson = { title: string; lessonId: string | null; mastery: number };

export const RemedialExercisesTool: React.FC<RemedialExercisesToolProps> = ({ onNavigate }) => {
  const store = useData();
  const groupsQ = useLoad((st) => st.listGroups());
  const studentsQ = useLoad((st) => st.listStudents());
  const curriculaQ = useLoad((st) => st.listCurricula());
  const groups = groupsQ.data ?? [];
  const [scope, setScope] = useState<'single_student' | 'whole_group'>('single_student');
  const [groupId, setGroupId] = useState('');
  const [studentId, setStudentId] = useState(() => getSelected('student') ?? '');
  useEffect(() => {
    if (groupId || !groups.length || !studentsQ.data) return;
    const preset = studentsQ.data.find((s) => s.id === studentId);
    setGroupId(preset?.groupId || groups[0].id);
  }, [groups, groupId, studentsQ.data, studentId]);
  const group = groups.find((g) => g.id === groupId);
  const students = (studentsQ.data ?? []).filter((s) => s.groupId === groupId);
  useEffect(() => {
    if (studentsQ.data && groupId && !students.some((s) => s.id === studentId)) setStudentId(students[0]?.id ?? '');
  }, [students, studentId, studentsQ.data, groupId]);
  const student = students.find((s) => s.id === studentId);

  // Lesson titles → ids for the group's subject (diagnostic rows carry titles).
  const lessonIdByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of curriculaQ.data ?? [])
      for (const g of c.grades)
        for (const s of g.subjects) if (s.id === group?.subjectId) for (const u of s.units) for (const l of u.lessons) map.set(l.title, l.id);
    return map;
  }, [curriculaQ.data, group?.subjectId]);

  const historyQ = useLoad(
    (st) => (scope === 'single_student' && studentId ? st.getStudentHistory(studentId) : Promise.resolve<StudentHistory>({ papers: [], lessons: [] })),
    [scope, studentId],
  );
  const groupRowsQ = useLoad((st) => (scope === 'whole_group' && groupId ? st.listDiagnosticRows(groupId) : Promise.resolve<DiagnosticRow[]>([])), [scope, groupId]);
  const latestPaper = historyQ.data?.papers[0];
  const mistakesQ = useLoad(
    (st) => (latestPaper ? st.listQuestionGrades(latestPaper.submissionId) : Promise.resolve<QuestionGradeRow[]>([])),
    [latestPaper?.submissionId],
  );

  const weak: WeakLesson[] = useMemo(() => {
    if (scope === 'single_student') {
      return (historyQ.data?.lessons ?? [])
        .filter((l) => l.mastery < 70)
        .slice(0, 3)
        .map((l) => ({ title: l.lesson, lessonId: l.lessonId ?? lessonIdByTitle.get(l.lesson) ?? null, mastery: l.mastery }));
    }
    const totals = new Map<string, { got: number; max: number }>();
    for (const r of groupRowsQ.data ?? []) {
      if (!r.lesson) continue;
      const t = totals.get(r.lesson) ?? { got: 0, max: 0 };
      t.got += r.finalScore;
      t.max += r.maxScore;
      totals.set(r.lesson, t);
    }
    return [...totals.entries()]
      .map(([title, t]) => ({ title, lessonId: lessonIdByTitle.get(title) ?? null, mastery: t.max ? Math.round((t.got / t.max) * 100) : 0 }))
      .filter((l) => l.mastery < 70)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3);
  }, [scope, historyQ.data, groupRowsQ.data, lessonIdByTitle]);

  // The student's weakest answers on the latest paper, with the model answer and why.
  const mistakes = (mistakesQ.data ?? [])
    .filter((g) => g.finalScore !== null && g.finalScore < g.maxScore * 0.6)
    .sort((a, b) => Number(a.finalScore) / a.maxScore - Number(b.finalScore) / b.maxScore)
    .slice(0, 2);

  const [exercises, setExercises] = useState<DraftQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setExercises([]), [scope, studentId, groupId]);

  const generate = async () => {
    const ids = weak.map((w) => w.lessonId).filter((x): x is string => !!x);
    if (!group?.subjectId || !ids.length) return notify('لا توجد دروس ضعيفة مرتبطة بالمنهج لهذا الاختيار بعد.');
    setBusy(true);
    try {
      const r = await store.aiGenerateQuestions({ subjectId: group.subjectId, groupId: group.id, lessonIds: ids, count: 5, difficulty: 'easy', purpose: 'remedial' });
      setExercises(r.questions);
      if (!r.questions.length) notify('لم تُنتج تمارين. حاول مرة أخرى.', 'warning');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sheetText = () =>
    [`تمارين علاجية${student && scope === 'single_student' ? ` لـ ${student.name.split(' ')[0]}` : ''}:`, ...exercises.map((q, i) => `${i + 1}) ${q.text}`)].join('\n\n');

  const sendWhatsApp = () => {
    if (!student) return;
    const link = whatsappLink(student.parentPhone, sheetText());
    if (!link) return notify('رقم ولي الأمر غير صحيح أو غير مسجّل. صحّحه من شاشة الطلاب.', 'warning');
    window.open(link, '_blank', 'noopener');
  };

  const loadingWeak = scope === 'single_student' ? historyQ.loading : groupRowsQ.loading;

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <div className="border-b border-slate-200 pb-4 print:hidden">
        <button onClick={() => onNavigate('C_HUB')} className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1">
          <ArrowRight className="w-4 h-4" />
          <span>العودة للأدوات الذكية</span>
        </button>
        <h1 className="text-xl font-extrabold text-[#1E3A5F]">تمارين علاجية حسب نقاط الضعف</h1>
        <p className="text-xs text-slate-500">نحدد الدروس الأضعف من الأوراق المعتمدة، ثم يكتب الذكاء الاصطناعي تمارين متدرجة منها فقط مع مفتاح الحل.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs print:hidden">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'single_student' as const, label: 'طالب واحد', icon: User },
            { id: 'whole_group' as const, label: 'المجموعة كلها', icon: Users },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setScope(o.id)}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${scope === o.id ? 'bg-[#1E3A5F] text-white' : 'text-slate-600'}`}
            >
              <o.icon className="w-3.5 h-3.5" />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white font-bold min-w-0" aria-label="المجموعة">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {scope === 'single_student' && (
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white font-bold min-w-0" aria-label="الطالب">
              {!students.length && <option value="">لا يوجد طلاب في المجموعة</option>}
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <strong className="block font-bold">الدروس الأضعف:</strong>
            {loadingWeak ? (
              <span>جارٍ التحليل...</span>
            ) : weak.length ? (
              <span>{weak.map((w) => `${w.title} (إتقان ${w.mastery}%)`).join(' · ')}</span>
            ) : (
              <span>لا توجد أوراق معتمدة كافية، أو لا توجد دروس تحت 70%.</span>
            )}
          </div>
        </div>
      </div>

      {scope === 'single_student' && mistakes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 print:hidden">
          <h3 className="font-extrabold text-[#1E3A5F] text-sm flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>أين أخطأ في آخر امتحان ({latestPaper?.title})</span>
          </h3>
          {mistakes.map((m) => (
            <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-900">
                السؤال {m.questionNumber} ({m.finalScore}/{m.maxScore}): {m.questionText}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-red-700 font-bold block text-[11px]">إجابة الطالب:</span>
                  <p className="text-red-900 whitespace-pre-wrap">{m.aiTranscription || '—'}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-700 font-bold block text-[11px]">الإجابة النموذجية:</span>
                  <p className="text-emerald-900 whitespace-pre-wrap">{m.modelAnswer || '—'}</p>
                </div>
              </div>
              {(m.teacherNote || m.aiReason) && (
                <p className="p-2.5 bg-white border border-blue-200 rounded-lg text-slate-800">
                  <strong className="text-[#1E3A5F]">لماذا: </strong>
                  {m.teacherNote || m.aiReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={generate}
        disabled={busy || !weak.some((w) => w.lessonId)}
        className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 print:hidden"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
        <span>{busy ? 'جارٍ كتابة التمارين وفحصها...' : exercises.length ? 'ولّد تمارين أخرى' : 'ولّد 5 تمارين علاجية متدرجة'}</span>
      </button>

      {exercises.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="font-extrabold text-[#1E3A5F] text-sm">
              ورقة التمارين{student && scope === 'single_student' ? `: ${student.name}` : group ? `: ${group.name}` : ''}
            </h3>
            {exercises.map((q, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs break-inside-avoid">
                <span className="font-bold text-slate-900">تمرين {i + 1}</span>
                <p className="text-slate-800 text-[13px] whitespace-pre-wrap">{q.text}</p>
                <details>
                  <summary className="font-bold text-slate-600 cursor-pointer">مفتاح الحل</summary>
                  <p className="mt-1 p-2 bg-white border border-slate-200 rounded-lg text-slate-600 whitespace-pre-wrap">{q.modelAnswer}</p>
                </details>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs print:hidden">
            <button onClick={() => window.print()} className="bg-white border border-slate-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1 cursor-pointer">
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
            {scope === 'single_student' && student && (
              <button onClick={sendWhatsApp} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 cursor-pointer">
                <MessageCircle className="w-4 h-4" />
                <span>أرسل لولي الأمر على واتساب</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
