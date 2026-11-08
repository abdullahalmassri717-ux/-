// Builds the short parent report (WhatsApp text) from real grades.
import type { QuestionGradeRow } from '../data/types';

export interface ReportInput {
  studentName: string;
  examTitle: string;
  organizationName: string;
  score: number;
  total: number;
  /** Percent in the previous approved exam, if any. */
  previousPct: number | null;
  grades: QuestionGradeRow[];
  advice: string;
}

export interface ReportContent {
  pct: number;
  change: number | null;
  strengths: string[];
  weaknesses: string[];
  text: string;
}

const topicOf = (g: QuestionGradeRow) => g.lesson || `السؤال ${g.questionNumber}`;

export function buildReport(r: ReportInput): ReportContent {
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
  const change = r.previousPct === null ? null : pct - r.previousPct;
  const ranked = [...r.grades].sort((a, b) => (b.finalScore ?? 0) / b.maxScore - (a.finalScore ?? 0) / a.maxScore);
  const strengths = ranked
    .filter((g) => (g.finalScore ?? 0) >= g.maxScore * 0.8)
    .slice(0, 2)
    .map((g) => `إتقان جيد في ${topicOf(g)}`);
  const weaknesses = [...ranked]
    .reverse()
    .filter((g) => (g.finalScore ?? 0) < g.maxScore * 0.7)
    .slice(0, 2)
    .map((g) => {
      const miss = g.aiCriteria.find((c) => !c.met);
      return miss ? `${topicOf(g)}: ${miss.criterion}` : `يحتاج مراجعة ${topicOf(g)}`;
    });
  const first = r.studentName.split(/\s+/)[0];
  const lines = [
    `السلام عليكم ولي أمر الطالب ${r.studentName} 🌸`,
    `نتيجة «${r.examTitle}»:`,
    `📊 الدرجة: ${r.score} من ${r.total} (${pct}%)` +
      (change === null ? '' : change === 0 ? ' — نفس مستوى الامتحان السابق' : change > 0 ? ` — أعلى بـ ${change}% من السابق ↗` : ` — أقل بـ ${-change}% من السابق ↘`),
  ];
  if (strengths.length) lines.push(`💪 نقاط القوة: ${strengths.join('، ')}`);
  if (weaknesses.length) lines.push(`🎯 يحتاج ${first} تركيزاً على: ${weaknesses.join('، ')}`);
  if (r.advice.trim()) lines.push(`📝 نصيحة المدرّس: ${r.advice.trim()}`);
  lines.push(`— ${r.organizationName}`);
  return { pct, change, strengths, weaknesses, text: lines.join('\n') };
}
