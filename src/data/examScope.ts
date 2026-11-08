// «امتحان لهذا الدرس» in «وين وصلنا» opens the exam generator locked to one
// group, one subject and the chosen lesson(s). The scope lives in the tab's
// session so a page reload keeps it; any other navigation clears it.

export interface ExamScope {
  groupId: string;
  subjectId: string;
  lessonIds: string[];
}

const KEY = 'daqa.examScope';

export function setExamScope(scope: ExamScope | null) {
  try {
    if (scope) sessionStorage.setItem(KEY, JSON.stringify(scope));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private mode: the generator just opens unscoped.
  }
}

export function getExamScope(): ExamScope | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as ExamScope) : null;
    return s && s.groupId && Array.isArray(s.lessonIds) && s.lessonIds.length ? s : null;
  } catch {
    return null;
  }
}
