import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { Calendar, Sparkles, Send, ArrowRight, AlertTriangle, TrendingDown, MessageCircle, Bot, Check, Clock, BookOpen, Loader2, Printer, Copy } from 'lucide-react';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import type { StudyPlan } from '../../data/ai';
import type { DiagnosticRow, StudentHistory, StudentRow, TaughtLessons } from '../../data/types';
import { whatsappLink } from '../../data/billing';
import { getSelected, setSelected } from '../../data/selection';
import { notify } from '../../lib/notify';

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Group + student pickers shared by the tools below. */
function useStudentPicker() {
  const groupsQ = useLoad((st) => st.listGroups());
  const studentsQ = useLoad((st) => st.listStudents());
  const groups = groupsQ.data ?? [];
  const all = studentsQ.data ?? [];
  const [groupId, setGroupId] = useState('');
  const [studentId, setStudentId] = useState(() => getSelected('student') ?? '');
  useEffect(() => {
    if (groupId || !groups.length) return;
    const preset = all.find((s) => s.id === studentId);
    setGroupId(preset?.groupId || groups[0].id);
  }, [groups, all, groupId, studentId]);
  const students = all.filter((s) => s.groupIds.includes(groupId));
  useEffect(() => {
    if (studentsQ.data && !students.some((s) => s.id === studentId)) setStudentId(students[0]?.id ?? '');
  }, [students, studentId, studentsQ.data]);
  const picker = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="المجموعة" className="p-2 border border-slate-200 rounded-lg bg-white font-bold min-w-0">
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <select value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="الطالب" className="p-2 border border-slate-200 rounded-lg bg-white font-bold min-w-0">
        {!students.length && <option value="">لا يوجد طلاب في المجموعة</option>}
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
  return { group: groups.find((g) => g.id === groupId), student: students.find((s) => s.id === studentId), picker };
}

const Header: React.FC<{ title: string; subtitle: string; onBack: () => void }> = ({ title, subtitle, onBack }) => (
  <div className="border-b border-slate-200 pb-4 print:hidden">
    <button onClick={onBack} className="text-xs text-slate-500 hover:text-[#1E3A5F] flex items-center gap-1 cursor-pointer font-medium mb-1">
      <ArrowRight className="w-4 h-4" />
      <span>العودة للأدوات الذكية</span>
    </button>
    <h1 className="text-xl font-extrabold text-[#1E3A5F]">{title}</h1>
    <p className="text-xs text-slate-500">{subtitle}</p>
  </div>
);

// ------------------------------------------------------------------ C7

export const StudyPlanTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const store = useData();
  const { group, student, picker } = useStudentPicker();
  const curriculaQ = useLoad((st) => st.listCurricula());
  const historyQ = useLoad((st) => (student ? st.getStudentHistory(student.id) : Promise.resolve<StudentHistory>({ papers: [], lessons: [] })), [student?.id]);
  const taughtQ = useLoad((st) => (group ? st.getTaughtLessons(group.id) : Promise.resolve<TaughtLessons>({})), [group?.id]);
  const [examDate, setExamDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<'schedule' | 'flashcards'>('schedule');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPlan(null), [student?.id]);

  const lessonTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of curriculaQ.data ?? []) for (const g of c.grades) for (const s of g.subjects) for (const u of s.units) for (const l of u.lessons) map.set(l.id, l.title);
    return map;
  }, [curriculaQ.data]);

  // Weakest graded lessons first, then taught lessons not examined yet.
  const focus = useMemo(() => {
    const graded = (historyQ.data?.lessons ?? []).filter((l) => l.lessonId).map((l) => ({ id: l.lessonId as string, mastery: l.mastery as number | null }));
    const seen = new Set(graded.map((l) => l.id));
    const taught = Object.keys(taughtQ.data ?? {})
      .filter((id) => !seen.has(id) && lessonTitles.has(id))
      .map((id) => ({ id, mastery: null as number | null }));
    return [...graded.slice(0, 5), ...taught].slice(0, 8);
  }, [historyQ.data, taughtQ.data, lessonTitles]);

  const days = Math.max(1, Math.min(30, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)));

  const generate = async () => {
    if (!group?.subjectId || !focus.length) return notify('لا توجد دروس مشروحة أو مصحّحة لهذا الطالب بعد.');
    setBusy(true);
    try {
      setPlan(await store.aiStudyPlan(group.subjectId, focus, days));
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const planText = () =>
    plan
      ? [`خطة مذاكرة ${student ? firstName(student.name) : ''} (${days} أيام):`, ...plan.days.map((d) => `اليوم ${d.day}: ${d.task} (${d.minutes} دقيقة)`), '', `نصيحة: ${plan.tip}`].join('\n')
      : '';

  const send = () => {
    const link = student && whatsappLink(student.parentPhone, planText());
    if (!link) return notify('رقم ولي الأمر غير صحيح أو غير مسجّل.', 'warning');
    window.open(link, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <Header
        title="خطة مذاكرة وبطاقات مراجعة"
        subtitle="خطة يومية للطالب حتى موعد الامتحان، تبدأ بأضعف دروسه حسب الأوراق المصحّحة، مع بطاقات مراجعة سريعة."
        onBack={() => onNavigate('C_HUB')}
      />
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs print:hidden">
        {picker}
        <label className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700 shrink-0">موعد الامتحان:</span>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg" />
          <span className="text-slate-500">({days} أيام)</span>
        </label>
        <p className="text-slate-600">
          <strong>الدروس المستهدفة: </strong>
          {focus.length
            ? focus.map((f) => `${lessonTitles.get(f.id) ?? 'درس'}${f.mastery !== null ? ` (${f.mastery}%)` : ''}`).join('، ')
            : 'لا توجد بعد (علّم الدروس المشروحة في «وين وصلنا» أو صحّح امتحاناً).'}
        </p>
        <button
          onClick={generate}
          disabled={busy || !focus.length}
          className="w-full bg-[#1E3A5F] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
          <span>{busy ? 'جارٍ إعداد الخطة...' : 'أعدّ خطة المذاكرة'}</span>
        </button>
      </div>

      {plan && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              {(['schedule', 'flashcards'] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${activeTab === t ? 'bg-[#1E3A5F] text-white' : 'text-slate-600'}`}>
                  {t === 'schedule' ? 'الجدول اليومي' : `بطاقات المراجعة (${plan.flashcards.length})`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-white border border-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer">
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
              <button onClick={send} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer">
                <Send className="w-4 h-4" />
                <span>واتساب لولي الأمر</span>
              </button>
            </div>
          </div>
          {activeTab === 'schedule' ? (
            <div className="space-y-2">
              {plan.days.map((d) => (
                <div key={d.day} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="bg-[#1E3A5F] text-white font-black rounded-lg px-2 py-1 shrink-0">اليوم {d.day}</span>
                  <div className="flex-1">
                    <p className="text-slate-800 font-bold">{d.task}</p>
                    {d.lessonId && <span className="text-[11px] text-slate-500">{lessonTitles.get(d.lessonId)}</span>}
                  </div>
                  <span className="text-slate-500 flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {d.minutes} د
                  </span>
                </div>
              ))}
              <p className="p-3 bg-blue-50 rounded-xl text-[#1E3A5F]">
                <strong>نصيحة: </strong>
                {plan.tip}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.flashcards.map((f, i) => (
                <details key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <summary className="font-bold text-slate-900 cursor-pointer flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>{f.front}</span>
                  </summary>
                  <p className="mt-2 text-slate-700">{f.back}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ C8

type Alert = { student: StudentRow; groupName: string; severity: 'high' | 'medium'; reason: string; action: string; trend: number[] };

/** Rule-based early warning from approved papers (no AI, free and explainable). */
function findAtRisk(rows: DiagnosticRow[], students: StudentRow[], groupNames: Map<string, string>): Alert[] {
  const byStudent = new Map<string, Map<string, { at: string; got: number; max: number; weak: Map<string, number> }>>();
  for (const r of rows) {
    const papers = byStudent.get(r.studentId) ?? new Map();
    const p = papers.get(r.submissionId) ?? { at: r.submittedAt, got: 0, max: 0, weak: new Map<string, number>() };
    p.got += r.finalScore;
    p.max += r.maxScore;
    if (r.lesson && r.finalScore < r.maxScore * 0.6) p.weak.set(r.lesson, (p.weak.get(r.lesson) ?? 0) + 1);
    papers.set(r.submissionId, p);
    byStudent.set(r.studentId, papers);
  }
  const alerts: Alert[] = [];
  for (const [studentId, papers] of byStudent) {
    const student = students.find((s) => s.id === studentId);
    if (!student) continue;
    const list = [...papers.values()].sort((a, b) => a.at.localeCompare(b.at));
    const trend = list.map((p) => (p.max ? Math.round((p.got / p.max) * 100) : 0));
    const last = trend[trend.length - 1];
    const recent = trend.slice(-3);
    const drop = recent.length >= 2 ? recent[0] - last : 0;
    const weak = [...(list[list.length - 1]?.weak.keys() ?? [])].slice(0, 2);
    const reasons: string[] = [];
    if (last < 50) reasons.push(`آخر علامة ${last}% (أقل من 50%)`);
    if (drop >= 15) reasons.push(`تراجع ${drop} نقطة في آخر ${recent.length} أوراق (${recent.join('% ← ')}%)`);
    if (!reasons.length) continue;
    alerts.push({
      student,
      groupName: groupNames.get(student.groupId) ?? '',
      severity: last < 50 && drop >= 15 ? 'high' : last < 40 ? 'high' : 'medium',
      reason: reasons.join(' + ') + (weak.length ? `. أضعف الدروس: ${weak.join('، ')}` : ''),
      action: weak.length ? `تمارين علاجية في ${weak[0]} وتواصل مع ولي الأمر.` : 'جلسة مراجعة قصيرة وتواصل مع ولي الأمر.',
      trend,
    });
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? a.trend[a.trend.length - 1] - b.trend[b.trend.length - 1] : a.severity === 'high' ? -1 : 1));
}

const DISMISS_KEY = 'daqa.atRisk.dismissed';
const weekKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 86400000))}`;
};

export const AtRiskStudentsTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const rowsQ = useLoad((st) => st.listDiagnosticRows(null));
  const studentsQ = useLoad((st) => st.listStudents());
  const groupsQ = useLoad((st) => st.listGroups());
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}') as { week?: string; ids?: string[] };
      return saved.week === weekKey() ? saved.ids ?? [] : [];
    } catch {
      return [];
    }
  });
  const alerts = useMemo(
    () => findAtRisk(rowsQ.data ?? [], studentsQ.data ?? [], new Map((groupsQ.data ?? []).map((g) => [g.id, g.name]))),
    [rowsQ.data, studentsQ.data, groupsQ.data],
  ).filter((a) => !dismissed.includes(a.student.id));

  const dismiss = (id: string) => {
    const ids = [...dismissed, id];
    setDismissed(ids);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ week: weekKey(), ids }));
    } catch {
      // ignore
    }
  };

  const message = (a: Alert) => {
    const link = whatsappLink(
      a.student.parentPhone,
      `مرحباً، أتواصل معكم بخصوص ${firstName(a.student.name)}. لاحظنا في الامتحانات الأخيرة أنه يحتاج متابعة إضافية، ونود التعاون معكم لمساعدته. متى يناسبكم التواصل؟`,
    );
    if (!link) return notify('رقم ولي الأمر غير صحيح أو غير مسجّل.', 'warning');
    window.open(link, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <Header
        title="الطلاب المعرّضون للتراجع"
        subtitle="تنبيهات من الأوراق المعتمدة: علامة أخيرة تحت 50%، أو تراجع 15 نقطة فأكثر في آخر الأوراق."
        onBack={() => onNavigate('C_HUB')}
      />
      {rowsQ.loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !alerts.length ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-sm text-emerald-900 flex flex-col items-center gap-2">
          <Check className="w-6 h-6" />
          <span>لا يوجد طلاب في خطر حسب الأوراق المعتمدة حتى الآن.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <div key={a.student.id} className={`bg-white border rounded-2xl p-4 space-y-3 text-xs ${a.severity === 'high' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${a.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{a.student.name}</h3>
                    <span className="text-slate-400 text-[11px]">{a.groupName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-bold text-[11px] flex items-center gap-1 tabular-nums">
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    {a.trend.slice(-4).join('% ← ')}%
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${a.severity === 'high' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {a.severity === 'high' ? 'أولوية عالية' : 'متابعة'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700">
                  <strong className="block text-slate-800">السبب:</strong>
                  {a.reason}
                </p>
                <p className="p-3 bg-blue-50/60 rounded-xl text-blue-900">
                  <strong className="block text-[#1E3A5F]">المقترح:</strong>
                  {a.action}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelected('student', a.student.id);
                      onNavigate('C2');
                    }}
                    className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                  >
                    تمارين علاجية
                  </button>
                  <button onClick={() => message(a)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>راسل ولي الأمر</span>
                  </button>
                </div>
                <button onClick={() => dismiss(a.student.id)} className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer">
                  إخفاء هذا الأسبوع
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ C9

/**
 * Drafts replies to parents' WhatsApp messages. The teacher pastes the
 * message, chooses what may be shared, and always reviews before sending.
 */
export const ParentAutoReplyTool: React.FC<{ onNavigate: (screen: ScreenId) => void }> = ({ onNavigate }) => {
  const store = useData();
  const { group, student, picker } = useStudentPicker();
  const historyQ = useLoad((st) => (student ? st.getStudentHistory(student.id) : Promise.resolve<StudentHistory>({ papers: [], lessons: [] })), [student?.id]);
  const examsQ = useLoad((st) => st.listAssessments());
  const [allowLatestScore, setAllowLatestScore] = useState(true);
  const [allowWeakPoints, setAllowWeakPoints] = useState(true);
  const [allowExamDates, setAllowExamDates] = useState(true);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [needsTeacher, setNeedsTeacher] = useState(false);
  const [busy, setBusy] = useState(false);

  const latest = historyQ.data?.papers[0];
  const weak = (historyQ.data?.lessons ?? []).filter((l) => l.mastery < 65).slice(0, 2);
  const upcoming = (examsQ.data ?? []).filter((e) => e.groupId === group?.id && e.status === 'awaiting_papers').slice(0, 2);
  const facts = [
    allowLatestScore && latest ? `آخر علامة: ${latest.score} من ${latest.total} في «${latest.title}»` : '',
    allowWeakPoints && weak.length ? `يحتاج تقوية في: ${weak.map((w) => w.lesson).join('، ')}` : '',
    allowExamDates && upcoming.length ? `الامتحانات القادمة: ${upcoming.map((e) => `${e.title}${e.date ? ` (${e.date})` : ''}`).join('، ')}` : '',
  ].filter(Boolean);

  const draft = async () => {
    if (!student) return notify('اختر الطالب أولاً');
    if (!message.trim()) return notify('الصق رسالة ولي الأمر أولاً');
    setBusy(true);
    try {
      const r = await store.aiParentReply({ message, studentFirstName: firstName(student.name), facts });
      setReply(r.reply);
      setNeedsTeacher(r.needsTeacher);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const link = student && whatsappLink(student.parentPhone, reply);
    if (!link) return notify('رقم ولي الأمر غير صحيح أو غير مسجّل.', 'warning');
    window.open(link, '_blank', 'noopener');
  };

  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
      <span className="font-bold text-slate-700">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="rounded text-[#1E3A5F]" />
    </label>
  );

  return (
    <div className="space-y-6 text-right max-w-5xl mx-auto pb-16">
      <Header
        title="مساعد الرد على أولياء الأمور"
        subtitle="الصق رسالة ولي الأمر من واتساب، فيكتب الذكاء الاصطناعي مسودة رد مهذبة من بيانات الطالب التي تسمح بها فقط. أنت تراجعها وترسلها."
        onBack={() => onNavigate('C_HUB')}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          {picker}
          <span className="font-bold text-slate-800 block">ما الذي يُسمح بذكره في الرد؟</span>
          <Toggle on={allowLatestScore} set={setAllowLatestScore} label="آخر علامة" />
          <Toggle on={allowWeakPoints} set={setAllowWeakPoints} label="نقاط الضعف" />
          <Toggle on={allowExamDates} set={setAllowExamDates} label="الامتحانات القادمة" />
          {facts.length > 0 && (
            <ul className="p-2.5 bg-blue-50 rounded-lg text-blue-900 list-disc list-inside space-y-0.5">
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <label className="block space-y-1">
            <span className="font-bold text-slate-800">رسالة ولي الأمر:</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="مثلاً: السلام عليكم أستاذ، كيف مستوى ابني؟" className="w-full p-2.5 border border-slate-300 rounded-xl" />
          </label>
          <button onClick={draft} disabled={busy} className="w-full bg-[#1E3A5F] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            <span>{busy ? 'جارٍ كتابة الرد...' : 'اكتب مسودة الرد'}</span>
          </button>
          {reply && (
            <div className="space-y-2">
              {needsTeacher && (
                <p className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold">هذه الرسالة تحتاج قرارك أنت. عدّل الرد قبل الإرسال.</p>
              )}
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} className="w-full p-2.5 bg-[#DCF8C6] border border-emerald-200 rounded-xl text-slate-900" />
              <div className="flex gap-2">
                <button onClick={send} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer">
                  <Send className="w-4 h-4" />
                  <span>افتح واتساب للإرسال</span>
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(reply).then(() => notify('نُسخ الرد', 'success'), () => notify('تعذّر النسخ'))}
                  className="px-3 bg-slate-100 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>نسخ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
