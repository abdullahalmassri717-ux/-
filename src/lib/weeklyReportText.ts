// Demo-mode copy of the weekly parent report layout. The real text is built in
// the database (private.weekly_report_rows), so keep the two looking the same.
import type { EntityType } from '../types';

export interface WeeklySection {
  subject: string;
  /** Lines for this subject: one per paper, then level and advice lines. */
  text: string;
}

function period(): string {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86400000);
  const f = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `🗓️ من ${f(start)} إلى ${f(end)}`;
}

export function buildWeeklyText(r: { kind: EntityType; studentName: string; orgName: string; sections: WeeklySection[] }): string {
  if (r.kind === 'individual_teacher') {
    const s = r.sections[0];
    return [`📘 التقرير الأسبوعي لمادة ${s.subject}`, `ولي أمر الطالب ${r.studentName} 🌸`, period(), '', s.text, `— ${r.orgName}`].join('\n');
  }
  return [
    `📋 التقرير الأسبوعي للطالب ${r.studentName}`,
    period(),
    '',
    r.sections.map((s) => `📘 ${s.subject}\n${s.text}`).join('\n\n'),
    '',
    `— ${r.orgName}`,
  ].join('\n');
}
