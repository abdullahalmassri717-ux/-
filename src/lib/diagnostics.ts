// «تشخيص طلابي»: turns approved grades into where-to-focus advice.
// Plain rules over real grades (no AI call), so it is free and explainable.
import type { DiagnosticRow, StudentRow } from '../data/types';

export interface Diagnostics {
  papers: number;
  generalInsight: string;
  whereToFocus: { id: string; topic: string; errorRate: number; urgency: 'high' | 'medium'; reason: string; recommendation: string }[];
  whereNotToFocus: { id: string; topic: string; masteryRate: number; studentMasteryCount: string; note: string }[];
  cohortHealth: {
    masteryGroup: { count: number; percentage: number };
    steadyGroup: { count: number; percentage: number };
    atRiskGroup: { count: number; percentage: number; topStudents: { id: string; name: string; score: string; weakPoint: string }[] };
  };
  commonMisconceptions: { title: string; affectedCount: number; percentage: number; impact: string }[];
  actionPlan: string[];
}

const pct = (got: number, max: number) => (max ? Math.round((got / max) * 100) : 0);

export function computeDiagnostics(rows: DiagnosticRow[], students: StudentRow[]): Diagnostics {
  const submissions = new Set(rows.map((r) => r.submissionId));
  const studentIds = new Set(rows.map((r) => r.studentId));
  const totalStudents = studentIds.size || 1;

  // Per lesson (or question when no lesson is linked).
  const topics = new Map<string, { got: number; max: number; students: Map<string, { got: number; max: number }>; miss: Map<string, Set<string>> }>();
  for (const r of rows) {
    const key = r.lesson || `السؤال ${r.questionNumber} (${r.assessmentTitle})`;
    const t = topics.get(key) ?? { got: 0, max: 0, students: new Map(), miss: new Map() };
    t.got += r.finalScore;
    t.max += r.maxScore;
    const s = t.students.get(r.studentId) ?? { got: 0, max: 0 };
    s.got += r.finalScore;
    s.max += r.maxScore;
    t.students.set(r.studentId, s);
    for (const c of r.criteria) if (!c.met) t.miss.set(c.criterion, (t.miss.get(c.criterion) ?? new Set()).add(r.studentId));
    topics.set(key, t);
  }
  const topicList = [...topics.entries()].map(([topic, t]) => ({
    topic,
    mastery: pct(t.got, t.max),
    mastered: [...t.students.values()].filter((s) => pct(s.got, s.max) >= 80).length,
    studentCount: t.students.size,
    topMiss: [...t.miss.entries()].sort((a, b) => b[1].size - a[1].size)[0],
  }));

  const whereToFocus = topicList
    .filter((t) => t.mastery < 65)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4)
    .map((t, i) => ({
      id: `f${i}`,
      topic: t.topic,
      errorRate: 100 - t.mastery,
      urgency: (t.mastery < 50 ? 'high' : 'medium') as 'high' | 'medium',
      reason: t.topMiss ? `${t.topMiss[1].size} طالباً لم يحققوا: «${t.topMiss[0]}».` : `متوسط الإتقان ${t.mastery}% فقط.`,
      recommendation: t.topMiss ? `ابدأ الحصة القادمة بأمثلة تركّز على: ${t.topMiss[0]}.` : 'أعد شرح الفكرة الأساسية بمثالين محلولين ثم تمرين قصير.',
    }));

  const whereNotToFocus = topicList
    .filter((t) => t.mastery >= 85)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)
    .map((t, i) => ({
      id: `n${i}`,
      topic: t.topic,
      masteryRate: t.mastery,
      studentMasteryCount: `${t.mastered} من أصل ${t.studentCount} طالباً`,
      note: 'متقن عند أغلب الطلاب، لا داعي لإعادة شرحه.',
    }));

  // Each student's average across their approved papers.
  const perStudent = new Map<string, { got: number; max: number; weak: Map<string, number> }>();
  for (const r of rows) {
    const s = perStudent.get(r.studentId) ?? { got: 0, max: 0, weak: new Map() };
    s.got += r.finalScore;
    s.max += r.maxScore;
    if (r.finalScore < r.maxScore * 0.6) {
      const key = r.lesson || `السؤال ${r.questionNumber}`;
      s.weak.set(key, (s.weak.get(key) ?? 0) + (r.maxScore - r.finalScore));
    }
    perStudent.set(r.studentId, s);
  }
  const levels = [...perStudent.entries()].map(([id, s]) => ({ id, pct: pct(s.got, s.max), weak: [...s.weak.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '' }));
  const mastery = levels.filter((l) => l.pct >= 85);
  const atRisk = levels.filter((l) => l.pct < 60).sort((a, b) => a.pct - b.pct);
  const steady = levels.length - mastery.length - atRisk.length;
  const share = (n: number) => Math.round((n / (levels.length || 1)) * 1000) / 10;
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? 'طالب';

  // Most common unmet criteria across everything.
  const missMap = new Map<string, { students: Set<string>; lost: number }>();
  for (const r of rows)
    for (const c of r.criteria)
      if (!c.met) {
        const m = missMap.get(c.criterion) ?? { students: new Set(), lost: 0 };
        m.students.add(r.studentId);
        m.lost += Math.max(0, r.maxScore - r.finalScore) / Math.max(1, r.criteria.filter((x) => !x.met).length);
        missMap.set(c.criterion, m);
      }
  const commonMisconceptions = [...missMap.entries()]
    .filter(([, m]) => m.students.size / totalStudents >= 0.2 || m.students.size >= 3)
    .sort((a, b) => b[1].students.size - a[1].students.size)
    .slice(0, 5)
    .map(([title, m]) => ({
      title,
      affectedCount: m.students.size,
      percentage: Math.round((m.students.size / totalStudents) * 1000) / 10,
      impact: `خسارة نحو ${Math.round((m.lost / m.students.size) * 10) / 10} علامة لكل طالب`,
    }));

  const weakest = whereToFocus[0];
  const strongest = whereNotToFocus[0];
  const generalInsight = !rows.length
    ? 'لا توجد أوراق معتمدة بعد. يظهر التشخيص بعد اعتماد أول امتحان.'
    : `من ${submissions.size} ورقة معتمدة: ` +
      (strongest ? `طلابك متقنون لـ«${strongest.topic}» (${strongest.masteryRate}%)` : 'لا يوجد درس متقن بوضوح بعد') +
      (weakest ? `، وأكبر فجوة في «${weakest.topic}» (إتقان ${100 - weakest.errorRate}%).` : '، ولا توجد فجوات كبيرة.');

  const actionPlan: string[] = [];
  if (weakest) actionPlan.push(`خصص بداية الحصة القادمة لـ«${weakest.topic}».`);
  if (commonMisconceptions[0]) actionPlan.push(`نبّه الطلاب على الخطأ الأشيع: «${commonMisconceptions[0].title}».`);
  if (atRisk.length) actionPlan.push(`أرسل تمارين علاجية للطلاب المتعثرين (${atRisk.length}) وتابعهم في الامتحان القادم.`);
  if (strongest) actionPlan.push(`لا تُعد شرح «${strongest.topic}»، انتقل للمسائل الأصعب.`);
  if (mastery.length) actionPlan.push(`أعطِ المتميزين (${mastery.length}) أسئلة إثرائية من بنك الأسئلة.`);

  return {
    papers: submissions.size,
    generalInsight,
    whereToFocus,
    whereNotToFocus,
    cohortHealth: {
      masteryGroup: { count: mastery.length, percentage: share(mastery.length) },
      steadyGroup: { count: steady, percentage: share(steady) },
      atRiskGroup: {
        count: atRisk.length,
        percentage: share(atRisk.length),
        topStudents: atRisk.slice(0, 6).map((l) => ({ id: l.id, name: nameOf(l.id), score: `${l.pct}%`, weakPoint: l.weak || '—' })),
      },
    },
    commonMisconceptions,
    actionPlan,
  };
}
