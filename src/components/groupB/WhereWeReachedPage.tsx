import { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  ChevronDown, 
  ChevronLeft, 
  Sparkles, 
  FileText, 
  Award,
  Layers
} from 'lucide-react';
import { LessonProgressStatus, ScreenId } from '../../types';
import { useData, useLoad, errorMessage } from '../../data/DataContext';
import { useSelected } from '../../data/selection';
import { notify } from '../../lib/notify';

interface WhereWeReachedPageProps {
  groupId?: string;
  onNavigate?: (screenId: ScreenId) => void;
  onOpenExamGen?: (scope: { groupId: string; subjectId: string; lessonIds: string[] }) => void;
}

export default function WhereWeReachedPage({
  groupId,
  onNavigate,
  onOpenExamGen
}: WhereWeReachedPageProps) {
  const store = useData();
  const [savedGroupId, setSavedGroupId] = useSelected('group');
  const groupsQ = useLoad((st) => st.listGroups());
  const curriculaQ = useLoad((st) => st.listCurricula());
  const groups = groupsQ.data ?? [];
  const selectedGroupId = groupId ?? (groups.some((g) => g.id === savedGroupId) ? savedGroupId! : groups[0]?.id ?? '');
  const setSelectedGroupId = (id: string) => setSavedGroupId(id);
  const activeGroup = groups.find(g => g.id === selectedGroupId);

  // Find curriculum details
  let curriculum = curriculaQ.data?.find(c => c.id === activeGroup?.curriculumId);
  let grade = curriculum?.grades.find(g => g.id === activeGroup?.gradeId);
  let subject = grade?.subjects.find(s => s.id === activeGroup?.subjectId);
  if (!subject && activeGroup?.subjectId) {
    for (const c of curriculaQ.data ?? []) for (const g of c.grades) for (const sb of g.subjects)
      if (sb.id === activeGroup.subjectId) { curriculum = c; grade = g; subject = sb; }
  }

  const taughtQ = useLoad((st) => (selectedGroupId ? st.getTaughtLessons(selectedGroupId) : Promise.resolve({} as Record<string, string>)), [selectedGroupId]);
  const examinedQ = useLoad((st) => (selectedGroupId ? st.getExaminedLessons(selectedGroupId) : Promise.resolve({} as Record<string, number | null>)), [selectedGroupId]);
  const taught = taughtQ.data ?? {};
  const examined = examinedQ.data ?? {};
  const lessonStatuses: Record<string, LessonProgressStatus> = {};
  for (const id of Object.keys(taught)) lessonStatuses[id] = 'taught';
  for (const id of Object.keys(examined)) lessonStatuses[id] = 'examined';
  const masteryOf = (lessonId: string) => examined[lessonId] ?? null;

  // Units start closed: the teacher sees the units first and opens one to see its lessons.
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});

  // Expanded lesson details (outcomes & terms)
  const [expandedLessonDetails, setExpandedLessonDetails] = useState<Record<string, boolean>>({});

  const toggleUnit = (unitId: string) => {
    setOpenUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleLessonDetails = (lessonId: string) => {
    setExpandedLessonDetails(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  /** Marks lessons taught (`teach`) and not taught (`unteach`) in one go: shown at once, then saved. */
  const saveTaught = async (teach: string[], unteach: string[] = []): Promise<boolean> => {
    if (!selectedGroupId || (!teach.length && !unteach.length)) return true;
    const before = taughtQ.data ?? {};
    const now = new Date().toISOString();
    taughtQ.setData(() => {
      const next = { ...before };
      for (const id of teach) next[id] = next[id] ?? now;
      for (const id of unteach) delete next[id];
      return next;
    });
    try {
      if (teach.length) await store.setLessonsTaught(selectedGroupId, teach, true);
      if (unteach.length) await store.setLessonsTaught(selectedGroupId, unteach, false);
      return true;
    } catch (e) {
      taughtQ.setData(before);
      notify(errorMessage(e));
      return false;
    }
  };

  const changeStatus = (lessonId: string, newStatus: LessonProgressStatus) => {
    if (newStatus === 'examined') {
      if (!(lessonId in examined)) {
        notify('تظهر «امتُحن» تلقائياً بعد إنشاء امتحان فيه أسئلة من هذا الدرس. علّمناه كمشروح.', 'info');
      }
      if (!(lessonId in taught)) void saveTaught([lessonId]);
      return;
    }
    if (newStatus === 'not_taught' && lessonId in examined) {
      notify('هذا الدرس دخل في امتحان سابق، لكن علّمناه «لم يُشرح» كما طلبت.', 'info');
    }
    if (newStatus === 'not_taught') void saveTaught([], [lessonId]);
    else void saveTaught([lessonId]);
  };

  // «وصلنا لهون»: this lesson and every lesson before it are taught, and the
  // lessons after it go back to «لم يُشرح» (unless an exam already covered them).
  const markUpToLesson = async (targetLessonId: string) => {
    if (!subject) return;
    const ordered = subject.units.flatMap(u => u.lessons);
    const targetIndex = ordered.findIndex(l => l.id === targetLessonId);
    if (targetIndex === -1) return;
    const teach = ordered.slice(0, targetIndex + 1).map((l) => l.id).filter((id) => !(id in taught));
    const unteach = ordered.slice(targetIndex + 1).map((l) => l.id).filter((id) => id in taught && !(id in examined));
    if (!teach.length && !unteach.length) {
      notify(`مسجّل مسبقاً: وصلتم إلى «${ordered[targetIndex].title}».`, 'info');
      return;
    }
    if (await saveTaught(teach, unteach)) {
      notify(`تم: وصلتم إلى «${ordered[targetIndex].title}» (${targetIndex + 1} من ${ordered.length} دروس مشروحة).`, 'success');
    }
  };

  const allLessons = subject?.units.flatMap(u => u.lessons) || [];
  // The furthest lesson marked taught: where the group has reached.
  const reachedLessonId = [...allLessons].reverse().find((l) => lessonStatuses[l.id])?.id ?? null;
  const taughtCount = allLessons.filter(l => lessonStatuses[l.id] === 'taught' || lessonStatuses[l.id] === 'examined').length;
  const examinedCount = allLessons.filter(l => lessonStatuses[l.id] === 'examined').length;
  const progressPercent = allLessons.length > 0 ? Math.round((taughtCount / allLessons.length) * 100) : 0;

  // Average group mastery for examined lessons that have graded papers
  const graded = allLessons.map(l => masteryOf(l.id)).filter((m): m is number => m !== null);
  const avgMastery = graded.length > 0 ? Math.round(graded.reduce((acc, m) => acc + m, 0) / graded.length) : null;

  if (groupsQ.loading && !groups.length) {
    return <div className="py-24 text-center text-sm text-slate-500">جاري التحميل...</div>;
  }
  if (!groups.length) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm text-slate-600">أنشئ مجموعة أولاً واربطها بصف ومادة، ثم علّم هنا الدروس التي شرحتها.</p>
        <button onClick={() => onNavigate?.('B2')} className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">المجموعات والطلاب</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Group Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
              <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">{curriculum?.name}</span>
              <span>•</span>
              <span>{grade?.name}</span>
              <span>•</span>
              <span className="text-[#1E3A5F]">{subject?.name}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#1E3A5F]" />
              خارطة تقدم المنهاج «وين وصلنا»
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              حدّد ما تم شرحه وما امتُحن به الطلاب لمنع خروج الأسئلة التوليدية عن سياق ما درسه طلابك فعلياً.
            </p>
          </div>

          {/* Group Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 min-w-0 max-w-full">
            <span className="text-xs font-bold text-slate-600">المجموعة:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              aria-label="اختر المجموعة التعليمية"
              className="min-w-0 flex-1 max-w-full truncate bg-white text-sm font-bold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.gradeName})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Progress Bar for this group */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
              <span>نسبة إنجاز المنهاج</span>
              <span className="text-[#1E3A5F] font-black">{taughtCount} من {allLessons.length} دروس ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#1E3A5F] h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800">دروس تم اختبارها</p>
              <p className="text-xl font-black text-emerald-900 mt-0.5">{examinedCount} دروس</p>
            </div>
            <Award className="w-8 h-8 text-emerald-600/70" />
          </div>

          <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-800">متوسط إتقان الدروس المختبرة</p>
              <p className="text-xl font-black text-blue-900 mt-0.5">
                {avgMastery !== null ? `${avgMastery}%` : 'لا توجد اختبارات'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                avgMastery && avgMastery >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {avgMastery && avgMastery >= 80 ? 'إتقان مرتفع' : 'يحتاج تعزيز'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Units & Lessons Interactive Tree */}
      <div className="space-y-4">
        {subject?.units.map((unit) => {
          const isExpanded = !!openUnits[unit.id];
          const unitLessons = unit.lessons;
          const unitTaught = unitLessons.filter(l => lessonStatuses[l.id] === 'taught' || lessonStatuses[l.id] === 'examined').length;

          return (
            <div key={unit.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              {/* Unit Header */}
              <div 
                onClick={() => toggleUnit(unit.id)}
                role="button"
                aria-expanded={isExpanded}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer border-b border-slate-100 select-none transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center font-black text-sm">
                    {unit.order}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex flex-wrap items-center gap-x-2">
                      {unit.title}
                      <span className="text-xs font-normal text-slate-500">
                        ({unitTaught} من {unitLessons.length} دروس مُشروحة)
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {unitLessons.length} دروس
                  </span>
                  {unitLessons.some((l) => l.id === reachedLessonId) && (
                    <span className="text-xs font-bold text-white bg-[#1E3A5F] px-2.5 py-1 rounded-lg">وصلنا هنا</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Lessons List */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {unitLessons.map((lesson) => {
                    const status = lessonStatuses[lesson.id] || 'not_taught';
                    const outcomesList = lesson.outcomes || lesson.learningOutcomes || [];
                    const termsList = lesson.termsAndSymbols || lesson.keyTerms || [];
                    const hasOutcomes = outcomesList.length > 0;
                    const hasTerms = termsList.length > 0;
                    const isDetailsOpen = expandedLessonDetails[lesson.id] || false;

                    return (
                      <div key={lesson.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Lesson Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-400 font-mono">
                                {unit.order}.{lesson.order}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">
                                {lesson.title}
                              </h4>
                              {lesson.id === reachedLessonId && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#1E3A5F] text-white">وصلنا هنا</span>
                              )}
                              
                              {/* Mastery Tag if examined */}
                              {status === 'examined' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  (masteryOf(lesson.id) ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {masteryOf(lesson.id) === null ? 'لم يُصحَّح بعد' : `إتقان: ${masteryOf(lesson.id)}%`}
                                </span>
                              )}
                            </div>

                            {/* Terms & Outcomes Preview / Toggle */}
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                              {(hasOutcomes || hasTerms) && (
                                <button
                                  type="button"
                                  onClick={() => toggleLessonDetails(lesson.id)}
                                  className="text-[#1E3A5F] hover:underline flex items-center gap-1 font-semibold"
                                >
                                  {isDetailsOpen ? 'إخفاء نواتج التعلم والمصطلحات' : 'عرض نواتج التعلم والمصطلحات'}
                                  <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isDetailsOpen ? '-rotate-90' : ''}`} />
                                </button>
                              )}
                              <span>•</span>
                              <span>بنك الأسئلة: {lesson.questionCount || lesson.questionBankCount || 12} سؤال متاح</span>
                            </div>

                            {/* Collapsible Outcomes & Key Terms */}
                            {isDetailsOpen && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                                {hasOutcomes && (
                                  <div>
                                    <span className="font-bold text-slate-700 block mb-1">نواتج التعلّم المستهدفة:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 pr-1">
                                      {outcomesList.map((out: string, idx: number) => (
                                        <li key={idx}>{out}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {hasTerms && (
                                  <div className="pt-2 border-t border-slate-200/60">
                                    <span className="font-bold text-slate-700 block mb-1">المصطلحات والرموز المعتمدة بالمنهاج:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {termsList.map((term: string, idx: number) => (
                                        <span key={idx} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                                          {term}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Status Switches */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Three Statuses Toggle */}
                            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100 text-xs font-bold">
                              <button
                                type="button"
                                onClick={() => changeStatus(lesson.id, 'not_taught')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                  status === 'not_taught'
                                    ? 'bg-white text-slate-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <Circle className="w-3 h-3 text-slate-400" />
                                لم يُشرح
                              </button>

                              <button
                                type="button"
                                onClick={() => changeStatus(lesson.id, 'taught')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                  status === 'taught'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-blue-200" />
                                شُرح
                              </button>

                              <button
                                type="button"
                                onClick={() => changeStatus(lesson.id, 'examined')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                  status === 'examined'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <Award className="w-3 h-3 text-emerald-200" />
                                شُرح وامتُحن
                              </button>
                            </div>

                            {/* Quick Shortcut: "وصلنا لحد هذا الدرس" */}
                            <button
                              type="button"
                              onClick={() => void markUpToLesson(lesson.id)}
                              title="تعليم كل الدروس السابقة حتى هذا الدرس كمشروحة دفعة واحدة"
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold flex items-center gap-1 transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-[#1E3A5F]" />
                              وصلنا لهون
                            </button>

                            {/* Create Exam on this lesson */}
                            {onOpenExamGen && subject && (
                              <button
                                type="button"
                                onClick={() => onOpenExamGen({ groupId: selectedGroupId, subjectId: subject.id, lessonIds: [lesson.id] })}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1E3A5F]/10 hover:bg-[#1E3A5F]/20 text-[#1E3A5F] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                امتحان لهذا الدرس
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Action */}
      <div className="bg-[#1E3A5F] text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="font-bold text-sm">جاهز لتوليد اختبار أو ورقة علاجية؟</h4>
            <p className="text-xs text-white/80">سيقتصر النظام تلقائياً على الدروس المشروحة لضمان عدم طرح أسئلة خارج المنهاج.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('C1')}
              className="bg-white text-[#1E3A5F] font-black text-xs px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
            >
              توليد امتحان الآن (C1)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
