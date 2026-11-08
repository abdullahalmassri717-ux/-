// Hands questions from an AI tool or the question bank to the «create exam»
// screen, so the teacher reviews and saves them there.
import type { DraftQuestion } from './ai';

export interface ExamDraft {
  title: string;
  groupId: string | null;
  kind: 'exam' | 'homework';
  questions: DraftQuestion[];
}

const KEY = 'daqa.examDraft';

export function setExamDraft(draft: ExamDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode: the create screen just starts empty.
  }
}

/** Returns the waiting draft once and clears it. */
export function takeExamDraft(): ExamDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as ExamDraft) : null;
  } catch {
    return null;
  }
}
