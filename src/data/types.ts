import type { BillingStore } from './billing';
import type { AiStore } from './ai';
import type { SchoolStore } from './school';
// Shapes the screens work with. Both the demo store (mock data) and the real
// Supabase store return these, so a screen does not care which one is active.
import type { Curriculum, EntityType, Exam, Group, QuestionRubric, Student } from '../types';

export type { Curriculum, Group };

/** Which Moodle user field identifies the student in a grade import. */
export type MoodleIdKind = 'email' | 'username' | 'idnumber';

export interface MoodleLink {
  kind: MoodleIdKind;
  value: string;
}

export interface StudentRow extends Student {
  /** The student's current group (first active one); '' when not in a group. */
  groupId: string;
  /**
   * Every group the student is in now. In a school one student is in several
   * groups (one per subject) and stays one student with one code and one bill.
   */
  groupIds: string[];
  /** The student's account on the school's Moodle, when the teacher linked it. */
  moodle?: MoodleLink | null;
}

export interface NewGroupInput {
  name: string;
  label?: string;
  gradeId: string | null;
  subjectId: string | null;
  schedule?: string;
  /** A «class – subject» group made from a class: new students of the class join it too. */
  classGroupId?: string | null;
}

export interface StudentInput {
  name: string;
  groupId: string;
  /** More groups to put the new student in at the same time (e.g. the other subjects of their class). */
  extraGroupIds?: string[];
  parentPhone?: string;
  studentPhone?: string;
  parentApproval?: boolean;
  /** null removes the link. */
  moodle?: MoodleLink | null;
}

export interface AssessmentRow extends Exam {
  groupId: string;
  subjectId: string | null;
  submissionCode: string;
  submissionOpen: boolean;
  createdAt: string;
}

export interface QuestionInput {
  text: string;
  type: QuestionRubric['type'];
  maxScore: number;
  modelAnswer: string;
  lessonId: string | null;
  criteria: { description: string; points: number }[];
}

export interface AssessmentQuestion extends QuestionRubric {
  lessonId: string | null;
}

export interface AssessmentDetail extends AssessmentRow {
  questions: AssessmentQuestion[];
}

export interface NewAssessmentInput {
  title: string;
  kind: 'exam' | 'homework';
  groupId: string;
  subjectId: string | null;
  scheduledOn: string | null; // YYYY-MM-DD
  submissionMode: 'link' | 'teacher_scan';
  autoSendReports: boolean;
  questions: QuestionInput[];
}

export interface PaperPage {
  /** Base64 JPEG data without the data-URL prefix. */
  base64: string;
  dataUrl: string;
  mediaType: 'image/jpeg';
}

export type ReportStatus = 'draft' | 'queued' | 'sent' | 'failed';

/** One weekly parent message (a private teacher gets one per subject; a school one per student). */
export interface WeeklyReportRow {
  studentId: string;
  studentName: string;
  parentPhone: string;
  consent: boolean;
  /** Set for a private teacher's per-subject report; empty for a school's combined report. */
  subjectName: string;
  papers: number;
  body: string;
  /** Status of the last weekly report already prepared for this student. */
  lastStatus: ReportStatus | null;
  lastPeriodEnd: string | null;
}

export interface SubmissionRow {
  id: string;
  assessmentId: string;
  studentId: string | null;
  studentName: string;
  studentCode: string;
  source: 'teacher_scan' | 'student_link';
  status: 'uploaded' | 'grading' | 'needs_review' | 'approved' | 'failed';
  totalScore: number;
  lowConfidenceUnreviewed: number;
  submittedAt: string;
  pageCount: number;
}

export interface QuestionGradeRow {
  id: string;
  submissionId: string;
  questionId: string;
  questionNumber: number;
  questionText: string;
  maxScore: number;
  modelAnswer: string;
  aiScore: number | null;
  aiReason: string | null;
  aiTranscription: string | null;
  aiConfidence: number | null;
  aiCriteria: { criterion: string; met: boolean; points: number }[];
  finalScore: number | null;
  teacherNote: string | null;
  reviewedAt: string | null;
  lesson?: string;
}

export interface StudentHistory {
  /** Graded and approved papers, newest first. */
  papers: { submissionId: string; assessmentId: string; title: string; score: number; total: number; date: string; questionsCount: number }[];
  /** Mastery per lesson (percent of points earned), weakest first. */
  lessons: { lesson: string; lessonId: string | null; mastery: number }[];
}

/** One graded question of one approved paper, for «تشخيص طلابي». */
export interface DiagnosticRow {
  submissionId: string;
  studentId: string;
  groupId: string;
  assessmentTitle: string;
  /** When the paper was handed in (ISO). */
  submittedAt: string;
  questionNumber: number;
  lesson: string;
  finalScore: number;
  maxScore: number;
  criteria: { criterion: string; met: boolean }[];
}

export interface DashboardSummary {
  groupsCount: number;
  studentsCount: number;
  papersThisWeek: number;
  answersAwaitingReview: number;
  papersAwaitingReview: number;
  avgPct: number | null;
  avgPctChange: number | null;
  reportsSent: number;
  weakLessons: { lesson: string; mastery: number; commonMiss: string | null }[];
  /** Tuition for the current month (owners only; null for teachers). */
  tuition: { collected: number; remaining: number; unpaidStudents: number; pct: number } | null;
}

/** One lesson's state in «وين وصلنا» for a group. */
export type TaughtLessons = Record<string, string>; // lessonId -> taught_at ISO

export interface DataStore extends BillingStore, SchoolStore, AiStore {
  readonly mode: 'demo' | 'real';
  getDashboard(): Promise<DashboardSummary>;
  listDiagnosticRows(groupId: string | null): Promise<DiagnosticRow[]>;
  // Curriculum (read-only for teachers)
  listCurricula(): Promise<Curriculum[]>;
  // Groups
  listGroups(): Promise<Group[]>;
  createGroup(input: NewGroupInput): Promise<Group>;
  updateGroup(id: string, input: Partial<NewGroupInput>): Promise<void>;
  /** «إيقاف»: the group's students stop being billed (unless in another group); its data stays. */
  archiveGroup(id: string): Promise<void>;
  /** Paused groups, so the teacher can turn them back on. */
  listArchivedGroups(): Promise<{ id: string; name: string }[]>;
  restoreGroup(id: string): Promise<void>;
  // Students
  listStudents(): Promise<StudentRow[]>;
  getStudent(id: string): Promise<StudentRow | null>;
  createStudent(input: StudentInput): Promise<void>;
  createStudents(inputs: StudentInput[]): Promise<number>;
  updateStudent(id: string, input: Partial<StudentInput>): Promise<void>;
  /** Puts existing students in a group too (they keep their other groups and code). Returns how many were added. */
  addStudentsToGroup(groupId: string, studentIds: string[]): Promise<number>;
  /** Sets exactly which groups the student is in (of the groups this user can see). */
  setStudentGroups(studentId: string, groupIds: string[]): Promise<void>;
  /** «تعطيل»: the student stays saved but leaves lists, billing and the submission link. */
  archiveStudent(id: string): Promise<void>;
  /** Disabled students, so the teacher can turn them back on. */
  listArchivedStudents(): Promise<StudentRow[]>;
  restoreStudent(id: string): Promise<void>;
  /** Deletes the student and their papers for good (owners only). */
  deleteStudent(id: string): Promise<void>;
  getStudentHistory(id: string): Promise<StudentHistory>;
  // «وين وصلنا»
  getTaughtLessons(groupId: string): Promise<TaughtLessons>;
  setLessonTaught(groupId: string, lessonId: string, taught: boolean): Promise<void>;
  /** Same as setLessonTaught for many lessons in one request. */
  setLessonsTaught(groupId: string, lessonIds: string[], taught: boolean): Promise<void>;
  /** Lessons this group was examined on, with mastery % from approved papers (null = not graded yet). */
  getExaminedLessons(groupId: string): Promise<Record<string, number | null>>;
  // Assessments
  listAssessments(): Promise<AssessmentRow[]>;
  getAssessment(id: string): Promise<AssessmentDetail | null>;
  createAssessment(input: NewAssessmentInput): Promise<string>;
  updateAssessment(
    id: string,
    patch: Partial<{ title: string; status: Exam['status']; submissionOpen: boolean; autoSendReports: boolean }>,
  ): Promise<void>;
  deleteAssessment(id: string): Promise<void>;
  // Submissions & grading
  listSubmissions(assessmentId: string): Promise<SubmissionRow[]>;
  listQuestionGrades(submissionId: string): Promise<QuestionGradeRow[]>;
  /** Every question grade of every paper in an exam (one request). */
  listAssessmentGrades(assessmentId: string): Promise<QuestionGradeRow[]>;
  saveTeacherGrade(questionGradeId: string, finalScore: number, teacherNote: string | null): Promise<void>;
  approveSubmission(submissionId: string): Promise<void>;
  /** Saves one student's photographed pages (already shrunk to JPEG). Returns the new submission id. */
  uploadPaper(assessmentId: string, pages: PaperPage[], studentId?: string | null): Promise<string>;
  /** Asks the server to grade a stored paper with AI. */
  gradeSubmission(submissionId: string): Promise<{ ok: boolean; error?: string }>;
  /** Short-lived links to the paper's photos (private storage). */
  getPageUrls(submissionId: string): Promise<string[]>;
  assignStudent(submissionId: string, studentId: string | null): Promise<void>;
  deleteSubmission(submissionId: string): Promise<void>;
  /** Latest WhatsApp report status per paper. */
  listReportStatuses(submissionIds: string[]): Promise<Record<string, ReportStatus>>;
  /** Puts approved results in the WhatsApp queue and asks the server to send them. */
  queueReports(items: { studentId: string; submissionId: string; phone: string; body: string }[]): Promise<{ queued: number; sent: number; error?: string }>;
  /** This week's parent reports so far (the last 7 days of approved papers). */
  weeklyReportPreview(orgKind: EntityType): Promise<WeeklyReportRow[]>;
  /** Whether the organization sends the weekly report automatically. */
  getWeeklyReportsEnabled(): Promise<boolean>;
  setWeeklyReportsEnabled(on: boolean): Promise<void>;
}
