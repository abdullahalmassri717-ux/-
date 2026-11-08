// Turns a school's raw activity into what the principal screens show:
// per-teacher and per-class averages, alerts, comparison and the lesson heatmap.
// Plain rules over approved grades, no AI call.
import type { SchoolGroup, SchoolMember, SchoolRaw } from '../data/school';
import type { DiagnosticRow } from '../data/types';

const DAY = 86400000;
const pct = (got: number, max: number) => (max ? Math.round((got / max) * 1000) / 10 : null);

function mastery(rows: DiagnosticRow[]): number | null {
  let got = 0;
  let max = 0;
  for (const r of rows) {
    got += r.finalScore;
    max += r.maxScore;
  }
  return pct(got, max);
}

const within = (iso: string, fromDaysAgo: number, toDaysAgo = 0) => {
  const t = Date.parse(iso);
  const now = Date.now();
  return t >= now - fromDaysAgo * DAY && t < now - toDaysAgo * DAY;
};

function weakestLesson(rows: DiagnosticRow[]): { lesson: string; pct: number } | null {
  const by = new Map<string, DiagnosticRow[]>();
  for (const r of rows) if (r.lesson) by.set(r.lesson, [...(by.get(r.lesson) ?? []), r]);
  let worst: { lesson: string; pct: number } | null = null;
  for (const [lesson, list] of by) {
    if (list.length < 3) continue;
    const m = mastery(list) ?? 100;
    if (!worst || m < worst.pct) worst = { lesson, pct: m };
  }
  return worst;
}

export interface TeacherStat extends SchoolMember {
  groups: SchoolGroup[];
  subjects: string[];
  lastUploadAt: string | null;
  papers30: number;
  avgPct: number | null;
  change: number | null;
  weakest: { lesson: string; pct: number } | null;
  submissionRate: number | null;
}

export interface ClassStat {
  group: SchoolGroup;
  teacherNames: string[];
  avgPct: number | null;
  lastExamAt: string | null;
}

export interface SchoolAlert {
  tone: 'red' | 'amber';
  title: string;
  badge: string;
  detail: string;
}

export interface SchoolStats {
  teachers: TeacherStat[];
  classes: ClassStat[];
  examsThisMonth: number;
  avgPct: number | null;
  avgChange: number | null;
  alerts: SchoolAlert[];
  summary: string;
}

export function schoolStats(raw: SchoolRaw): SchoolStats {
  const groupOf = new Map(raw.assessments.map((a) => [a.id, a.groupId]));
  const subsByGroup = new Map<string, SchoolRaw['submissions']>();
  for (const s of raw.submissions) {
    const g = groupOf.get(s.assessmentId);
    if (g) subsByGroup.set(g, [...(subsByGroup.get(g) ?? []), s]);
  }
  const rowsByGroup = new Map<string, DiagnosticRow[]>();
  for (const r of raw.rows) rowsByGroup.set(r.groupId, [...(rowsByGroup.get(r.groupId) ?? []), r]);
  const nameOf = new Map(raw.members.map((m) => [m.userId, m.name]));

  const classes: ClassStat[] = raw.groups.map((g) => {
    const subs = subsByGroup.get(g.id) ?? [];
    return {
      group: g,
      teacherNames: g.teacherIds.map((id) => nameOf.get(id) ?? '').filter(Boolean),
      avgPct: mastery(rowsByGroup.get(g.id) ?? []),
      lastExamAt: subs.reduce<string | null>((m, s) => (!m || s.createdAt > m ? s.createdAt : m), null),
    };
  });

  const teachers: TeacherStat[] = raw.members.map((m) => {
    const groups = raw.groups.filter((g) => g.teacherIds.includes(m.userId));
    const ids = new Set(groups.map((g) => g.id));
    const rows = raw.rows.filter((r) => ids.has(r.groupId));
    const subs = groups.flatMap((g) => subsByGroup.get(g.id) ?? []);
    const recent = mastery(rows.filter((r) => within(r.submittedAt, 30)));
    const prev = mastery(rows.filter((r) => within(r.submittedAt, 60, 30)));
    // Hand-in rate: papers received / students expected, for exams of the last 60 days.
    const recentExams = raw.assessments.filter((a) => ids.has(a.groupId) && within(a.createdAt, 60));
    const expected = recentExams.reduce((n, a) => n + (groups.find((g) => g.id === a.groupId)?.studentCount ?? 0), 0);
    const received = raw.submissions.filter((s) => recentExams.some((a) => a.id === s.assessmentId)).length;
    return {
      ...m,
      groups,
      subjects: [...new Set(groups.map((g) => g.subjectName).filter(Boolean))],
      lastUploadAt: subs.reduce<string | null>((x, s) => (!x || s.createdAt > x ? s.createdAt : x), null),
      papers30: subs.filter((s) => within(s.createdAt, 30)).length,
      avgPct: mastery(rows),
      change: recent !== null && prev !== null ? Math.round((recent - prev) * 10) / 10 : null,
      weakest: weakestLesson(rows),
      submissionRate: expected ? Math.min(100, Math.round((received / expected) * 100)) : null,
    };
  });

  const avgPct = mastery(raw.rows.filter((r) => within(r.submittedAt, 30))) ?? mastery(raw.rows);
  const prevPct = mastery(raw.rows.filter((r) => within(r.submittedAt, 60, 30)));
  const nowPct = mastery(raw.rows.filter((r) => within(r.submittedAt, 30)));

  // Alerts: weak lesson in a class, and teachers who stopped uploading.
  const alerts: SchoolAlert[] = [];
  const weakSpots: { group: SchoolGroup; lesson: string; pct: number }[] = [];
  for (const g of raw.groups) {
    const w = weakestLesson(rowsByGroup.get(g.id) ?? []);
    if (w && w.pct < 55) weakSpots.push({ group: g, lesson: w.lesson, pct: w.pct });
  }
  weakSpots.sort((a, b) => a.pct - b.pct);
  for (const w of weakSpots.slice(0, 4)) {
    const who = classes.find((c) => c.group.id === w.group.id)?.teacherNames.join('، ');
    alerts.push({
      tone: 'red',
      title: `${w.group.name} – ${w.lesson}`,
      badge: `إتقان ${w.pct}%`,
      detail: who ? `يُقترح أن يعيد ${who} شرح هذا الدرس مع تمارين علاجية.` : 'يُقترح إعادة شرح هذا الدرس مع تمارين علاجية.',
    });
  }
  for (const t of teachers) {
    if (t.role !== 'teacher' || !t.active || !t.groups.length) continue;
    if (!t.lastUploadAt || !within(t.lastUploadAt, 14)) {
      alerts.push({
        tone: 'amber',
        title: `متابعة: ${t.name}`,
        badge: 'لا رفع منذ أسبوعين',
        detail: t.lastUploadAt ? 'لم يرفع أوراقاً منذ أكثر من أسبوعين.' : 'لم يرفع أي أوراق بعد.',
      });
    }
  }

  const lowest = [...teachers].filter((t) => t.avgPct !== null && t.role === 'teacher').sort((a, b) => (a.avgPct ?? 0) - (b.avgPct ?? 0))[0];
  const summary = !raw.rows.length
    ? 'لا توجد أوراق معتمدة بعد. تظهر المقارنة بعد أن يعتمد المعلمون نتائج أول امتحان.'
    : weakSpots[0]
      ? `الفجوة الأكبر في ${weakSpots[0].group.name} بدرس «${weakSpots[0].lesson}» (إتقان ${weakSpots[0].pct}%).` +
        (lowest?.submissionRate !== null && lowest && lowest.submissionRate! < 80 ? ` نسبة تسليم الأوراق عند ${lowest.name} ${lowest.submissionRate}% فقط، وقد تكون جزءاً من السبب.` : '')
      : `لا توجد فجوات حادة؛ متوسط الإتقان العام ${avgPct ?? '—'}%.`;

  return {
    teachers,
    classes,
    examsThisMonth: raw.assessments.filter((a) => within(a.createdAt, 30)).length,
    avgPct,
    avgChange: nowPct !== null && prevPct !== null ? Math.round((nowPct - prevPct) * 10) / 10 : null,
    alerts,
    summary,
  };
}

export interface Heatmap {
  lessons: string[];
  rows: { group: SchoolGroup; cells: (number | null)[] }[];
}

/** Classes × lessons mastery for papers handed in during the last `days` days. */
export function lessonHeatmap(raw: SchoolRaw, days: number, maxLessons = 8): Heatmap {
  const rows = raw.rows.filter((r) => r.lesson && within(r.submittedAt, days));
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.lesson, (count.get(r.lesson) ?? 0) + 1);
  const lessons = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxLessons).map(([l]) => l);
  const groups = raw.groups.filter((g) => rows.some((r) => r.groupId === g.id));
  return {
    lessons,
    rows: groups.map((g) => ({
      group: g,
      cells: lessons.map((l) => {
        const list = rows.filter((r) => r.groupId === g.id && r.lesson === l);
        return list.length ? mastery(list) : null;
      }),
    })),
  };
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'لم يرفع بعد';
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 14) return 'منذ أسبوع';
  if (days < 60) return `منذ ${Math.floor(days / 7)} أسابيع`;
  return `منذ ${Math.floor(days / 30)} أشهر`;
}
