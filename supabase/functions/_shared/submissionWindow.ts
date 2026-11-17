// When the student submission link (/s/<code>) accepts papers.
// Shared by the student-submit Edge Function (the real gate) and the screens
// (what the teacher and the student see), so both always agree.

export type LinkState = 'open' | 'closed_by_teacher' | 'not_started' | 'ended';

export interface SubmissionWindow {
  /** Teacher's on/off switch for the link. */
  open: boolean;
  /** ISO time; null = open right away. */
  opensAt: string | null;
  /** ISO time; null = no end time. */
  closesAt: string | null;
}

/**
 * A paper the student saved on their phone while offline, before the closing
 * time, is still accepted if it arrives within this many minutes after it.
 */
export const OFFLINE_GRACE_MINUTES = 30;

export function linkState(w: SubmissionWindow, now: Date = new Date()): LinkState {
  if (!w.open) return 'closed_by_teacher';
  const t = now.getTime();
  if (w.opensAt && t < new Date(w.opensAt).getTime()) return 'not_started';
  if (w.closesAt && t >= new Date(w.closesAt).getTime()) return 'ended';
  return 'open';
}

/** Arabic date and time, e.g. «الخميس 20 نوفمبر، 8:00 م». */
export function formatWhen(iso: string, timeZone?: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return iso;
  }
}

/** The message a student sees when the link does not accept papers. */
export function closedMessage(state: LinkState, w: SubmissionWindow, kind: 'exam' | 'homework', timeZone?: string): string {
  const what = kind === 'homework' ? 'الواجب' : 'الامتحان';
  if (state === 'not_started' && w.opensAt) return `لم يبدأ التسليم بعد. يفتح رابط ${what} ${formatWhen(w.opensAt, timeZone)}.`;
  if (state === 'ended') return `انتهى وقت التسليم لهذا ${what}. تواصل مع المدرّس إذا احتجت وقتاً إضافياً.`;
  return `أغلق المدرّس التسليم لهذا ${what}.`;
}
