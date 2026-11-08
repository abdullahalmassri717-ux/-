import { useSyncExternalStore } from 'react';
import type { GradingItem } from '../types';
import { MOCK_EXAMS, MOCK_RUBRICS, MOCK_STUDENTS } from '../mockData';
import type { ExamToGrade, GradePaperResult } from './gradingApi';

// Trial store for papers graded by the real AI, shared by the upload and
// review screens. It lives in memory only (a page refresh clears it) until the
// database is built; then papers, grades and teacher edits are saved there.

export interface LivePaper {
  id: string;
  examId: string;
  fileName: string;
  imageDataUrl: string;
  status: 'grading' | 'done' | 'error';
  error?: string;
  result?: GradePaperResult;
  studentName?: string;
  studentCode?: string;
}

/** Every change the teacher makes to an AI grade: before, after, who, when. */
export interface ScoreEdit {
  itemId: string;
  paperId: string;
  questionNumber: number;
  aiScore: number;
  before: number;
  after: number;
  editedBy: string;
  editedAt: string;
}

interface State {
  papers: LivePaper[];
  items: GradingItem[];
  edits: ScoreEdit[];
}

let state: State = { papers: [], items: [], edits: [] };
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGradingSession(): State {
  return useSyncExternalStore(subscribe, () => state);
}

/** Exam questions and rubric in the shape the grading engine expects. */
export function examForGrading(examId: string): ExamToGrade {
  const exam = MOCK_EXAMS.find((e) => e.id === examId) ?? MOCK_EXAMS[0];
  // Until exams come from the database, the demo rubric is the only one with full criteria.
  return {
    title: exam.title,
    subject: exam.subject,
    feedbackLanguage: 'ar',
    questions: MOCK_RUBRICS.map((q) => ({
      questionNumber: q.questionNumber,
      text: q.text,
      type: q.type,
      maxScore: q.maxScore,
      modelAnswer: q.modelAnswer,
      criteria: q.criteria,
      lesson: q.lesson,
    })),
  };
}

export function addGradingPaper(paper: Omit<LivePaper, 'status'>) {
  setState({ ...state, papers: [{ ...paper, status: 'grading' }, ...state.papers] });
}

export function failGradingPaper(paperId: string, error: string) {
  setState({
    ...state,
    papers: state.papers.map((p) => (p.id === paperId ? { ...p, status: 'error', error } : p)),
  });
}

export function completeGradingPaper(paperId: string, result: GradePaperResult) {
  const paper = state.papers.find((p) => p.id === paperId);
  if (!paper) return;
  const student = result.studentCodeOnPaper
    ? MOCK_STUDENTS.find((s) => s.studentCode === result.studentCodeOnPaper)
    : undefined;
  const studentName = student?.name ?? 'طالب غير معروف (تحقق من الرمز)';
  const studentCode = result.studentCodeOnPaper ?? '????';
  const exam = examForGrading(paper.examId);

  const newItems: GradingItem[] = result.questions.map((q) => {
    const question = exam.questions.find((x) => x.questionNumber === q.questionNumber);
    return {
      id: `live-${paperId}-q${q.questionNumber}`,
      examId: paper.examId,
      studentId: student?.id ?? '',
      studentName,
      studentCode,
      questionNumber: q.questionNumber,
      questionText: question?.text ?? '',
      lesson: question?.lesson ?? '',
      studentAnswerImage: paper.imageDataUrl,
      aiTranscription: q.transcription,
      modelAnswer: question?.modelAnswer ?? '',
      maxScore: q.maxScore,
      aiSuggestedScore: q.score,
      teacherScore: q.score,
      confidence: q.confidence,
      isReviewed: false,
      criteriaChecks: q.criteria.map((c) => ({ criterion: c.criterion, met: c.met, points: c.pointsAwarded })),
      handwrittenNote: q.feedbackForStudent,
      aiReason: q.reason,
      subjectType: 'math',
    };
  });

  setState({
    ...state,
    papers: state.papers.map((p) =>
      p.id === paperId ? { ...p, status: 'done', result, studentName, studentCode } : p,
    ),
    items: [...state.items, ...newItems],
  });
}

export function updateLiveItems(update: (items: GradingItem[]) => GradingItem[]) {
  setState({ ...state, items: update(state.items) });
}

export function recordScoreEdit(edit: ScoreEdit) {
  setState({ ...state, edits: [...state.edits, edit] });
}
