// Demo data store: used when no Supabase project is configured. It starts from
// src/mockData.ts and keeps changes in memory until the page is reloaded, so the
// screens behave like the real thing during a demo.
import {
  CURRICULA_DATA,
  MOCK_EXAMS,
  MOCK_GRADING_ITEMS,
  MOCK_GROUP_PROGRESS_G1,
  MOCK_GROUPS,
  MOCK_RUBRICS,
  MOCK_STUDENTS,
} from '../mockData';
import type { Group } from '../types';
import { requestGrading } from '../lib/gradingApi';
import { createDemoBilling } from './billing';
import { createDemoAi } from './ai';
import { createDemoSchool, type SchoolStore } from './school';
import type {
  AssessmentDetail,
  AssessmentRow,
  DataStore,
  QuestionGradeRow,
  ReportStatus,
  StudentRow,
  SubmissionRow,
  TaughtLessons,
} from './types';

const wait = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 120));
let seq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;

function findSubject(subjectId: string | null) {
  for (const c of CURRICULA_DATA)
    for (const g of c.grades)
      for (const s of g.subjects) if (s.id === subjectId) return { c, g, s };
  return null;
}

function demoLessonId(title: string): string | null {
  // Demo weak-lesson names are free text; match them to a demo lesson by shared words.
  const words = title.split(/\s+/).filter((w) => w.length >= 4);
  let fallback: string | null = null;
  for (const c of CURRICULA_DATA)
    for (const g of c.grades)
      for (const s of g.subjects)
        for (const u of s.units)
          for (const l of u.lessons) {
            fallback ??= l.id;
            if (l.title === title || words.some((w) => l.title.includes(w))) return l.id;
          }
  return fallback;
}

interface DemoState {
  groups: Group[];
  students: StudentRow[];
  progress: Record<string, TaughtLessons>;
  assessments: AssessmentDetail[];
  submissions: SubmissionRow[];
  grades: QuestionGradeRow[];
  pages: Record<string, string[]>;
  reports: Record<string, ReportStatus>;
}

function initialState(): DemoState {
  const groups = MOCK_GROUPS.map((g) => ({ ...g }));
  const students: StudentRow[] = MOCK_STUDENTS.map((s) => ({
    ...s,
    groupId: groups.find((g) => g.name === s.group)?.id ?? '',
  }));
  const taughtG1: TaughtLessons = {};
  Object.entries(MOCK_GROUP_PROGRESS_G1).forEach(([lessonId, p]) => {
    if (p.status !== 'not_taught') taughtG1[lessonId] = new Date().toISOString();
  });
  const assessments: AssessmentDetail[] = MOCK_EXAMS.map((e, i) => {
    const group = groups.find((g) => g.name === e.group);
    return {
      ...e,
      groupId: group?.id ?? '',
      subjectId: group?.subjectId ?? null,
      submissionCode: `demo${e.id}`,
      submissionOpen: e.submissionMode === 'link',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      questions: e.id === 'ex1' ? MOCK_RUBRICS.map((q) => ({ ...q, lessonId: null })) : [],
    };
  });
  const byStudent = new Map<string, QuestionGradeRow[]>();
  const grades: QuestionGradeRow[] = MOCK_GRADING_ITEMS.map((g) => {
    const row: QuestionGradeRow = {
      id: g.id,
      submissionId: `sub_${g.examId}_${g.studentId}`,
      questionId: MOCK_RUBRICS.find((q) => q.questionNumber === g.questionNumber)?.id ?? g.id,
      questionNumber: g.questionNumber,
      questionText: g.questionText,
      maxScore: g.maxScore,
      modelAnswer: g.modelAnswer,
      aiScore: g.aiSuggestedScore,
      aiReason: g.aiReason ?? null,
      aiTranscription: g.aiTranscription,
      aiConfidence: g.confidence === 'high' ? 0.92 : g.confidence === 'medium' ? 0.75 : 0.45,
      aiCriteria: g.criteriaChecks,
      finalScore: g.teacherScore,
      teacherNote: g.handwrittenNote,
      reviewedAt: g.isReviewed ? new Date().toISOString() : null,
    };
    byStudent.set(row.submissionId, [...(byStudent.get(row.submissionId) ?? []), row]);
    return row;
  });
  const submissions: SubmissionRow[] = [...byStudent.entries()].map(([id, rows]) => {
    const item = MOCK_GRADING_ITEMS.find((g) => `sub_${g.examId}_${g.studentId}` === id)!;
    return {
      id,
      assessmentId: item.examId,
      studentId: item.studentId,
      studentName: item.studentName,
      studentCode: item.studentCode,
      source: 'teacher_scan',
      status: 'needs_review',
      totalScore: rows.reduce((n, r) => n + (r.finalScore ?? 0), 0),
      lowConfidenceUnreviewed: rows.filter((r) => !r.reviewedAt && (r.aiConfidence ?? 1) < 0.7).length,
      submittedAt: new Date().toISOString(),
      pageCount: 1,
    };
  });
  return { groups, students, progress: { g1: taughtG1 }, assessments, submissions, grades, pages: {}, reports: {} };
}

let state: DemoState | null = null;
const s = () => (state ??= initialState());

function summary(a: AssessmentDetail): AssessmentRow {
  const { questions, ...row } = a;
  return {
    ...row,
    totalScore: questions.length ? questions.reduce((n, q) => n + q.maxScore, 0) : row.totalScore,
    questionsCount: questions.length || row.questionsCount,
  };
}

export function createDemoStore(): DataStore {
  const base: Omit<DataStore, keyof SchoolStore> = {
    ...createDemoBilling(),
    ...createDemoAi(),
    mode: 'demo',
    listCurricula: () => wait(CURRICULA_DATA),
    listDiagnosticRows: (groupId) => {
      // Demo: a few made-up graded questions per student, based on their mock level.
      const lessons = ['قواعد الاشتقاق الأساسية', 'الاشتقاق الضمني', 'قاعدة السلسلة', 'المعدلات المرتبطة بالزمن'];
      const misses = ['توحيد المقامات في المشتقة الثانية', 'نسيان ضرب مشتقة الداخل', 'العلاقة الهندسية المساعدة', 'إشارة السالب عند اشتقاق جتا'];
      const rows = s().students
        .filter((st) => !groupId || st.groupId === groupId)
        .flatMap((st) =>
          lessons.map((lesson, i) => {
            const level = Math.max(0.2, Math.min(1, (st.latestScore + (i === 0 ? 15 : i === 1 ? -25 : i === 2 ? -10 : -15)) / 100));
            const score = Math.round(level * 10);
            return {
              submissionId: `demo_${st.id}`, studentId: st.id, groupId: st.groupId, assessmentTitle: 'امتحان الشهر الأول',
              submittedAt: new Date(Date.now() - (st.latestScore % 2 ? 10 : 40) * 86400000).toISOString(),
              questionNumber: i + 1, lesson, finalScore: score, maxScore: 10,
              criteria: [{ criterion: misses[i], met: score >= 7 }, { criterion: 'كتابة القانون الصحيح', met: score >= 4 }],
            };
          }),
        );
      return wait(rows);
    },
    getDashboard: () => {
      const st = s();
      const review = st.submissions.filter((x) => x.status === 'needs_review');
      return wait({
        groupsCount: st.groups.length,
        studentsCount: st.students.length,
        papersThisWeek: st.submissions.length,
        answersAwaitingReview: review.reduce((n, x) => n + x.lowConfidenceUnreviewed, 0),
        papersAwaitingReview: review.length,
        avgPct: st.students.length ? Math.round((st.students.reduce((n, x) => n + x.latestScore, 0) / st.students.length) * 10) / 10 : null,
        avgPctChange: 3.2,
        reportsSent: Object.values(st.reports).filter((r) => r === 'sent').length,
        weakLessons: [
          { lesson: 'الاشتقاق الضمني', mastery: 40, commonMiss: 'توحيد المقامات في المشتقة الثانية' },
          { lesson: 'النهايات المثلثية', mastery: 55, commonMiss: 'تطبيق متطابقات جا وجتا' },
          { lesson: 'المعدلات المرتبطة بالزمن', mastery: 61, commonMiss: 'العلاقة الهندسية المساعدة' },
        ],
        tuition: { collected: 23150, remaining: 4350, unpaidStudents: 32, pct: 84.2 },
      });
    },

    listGroups: () =>
      wait(
        s().groups.map((g) => ({
          ...g,
          taughtLessonsCount: s().progress[g.id] ? Object.keys(s().progress[g.id]).length : g.taughtLessonsCount,
        })),
      ),
    async createGroup(input) {
      const found = findSubject(input.subjectId);
      const group: Group = {
        id: newId('g'),
        name: input.name.trim(),
        type: input.label ?? '',
        curriculumId: found?.c.id ?? '',
        gradeId: input.gradeId ?? '',
        subjectId: input.subjectId ?? '',
        curriculumName: found?.c.name ?? '',
        gradeName: found?.g.name ?? '',
        subjectName: found?.s.name ?? '',
        studentCount: 0,
        avgScore: 0,
        schedule: input.schedule ?? '',
        totalLessonsCount: found ? found.s.units.reduce((n, u) => n + u.lessons.length, 0) : 0,
        taughtLessonsCount: 0,
      };
      s().groups.push(group);
      s().progress[group.id] = {};
      return wait(group);
    },
    async updateGroup(id, input) {
      const g = s().groups.find((x) => x.id === id);
      if (g) {
        if (input.name !== undefined) g.name = input.name;
        if (input.schedule !== undefined) g.schedule = input.schedule;
        if (input.label !== undefined) g.type = input.label;
      }
      return wait(undefined);
    },
    async archiveGroup(id) {
      s().groups = s().groups.filter((g) => g.id !== id);
      return wait(undefined);
    },

    listStudents: () => wait(s().students.map((x) => ({ ...x }))),
    getStudent: (id) => wait(s().students.find((x) => x.id === id) ?? null),
    async createStudent(input) {
      await this.createStudents([input]);
    },
    async createStudents(inputs) {
      const used = new Set(s().students.map((x) => x.studentCode));
      for (const i of inputs) {
        let code = '';
        do code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        while (used.has(code));
        used.add(code);
        const group = s().groups.find((g) => g.id === i.groupId);
        s().students.push({
          id: newId('s'),
          name: i.name.trim(),
          group: group?.name ?? '',
          groupId: i.groupId,
          parentPhone: i.parentPhone ?? '',
          studentPhone: i.studentPhone ?? '',
          studentCode: code,
          latestScore: 0,
          totalScore: 100,
          trend: 'steady',
          parentApproval: i.parentApproval ?? false,
          status: 'active',
          weakLessons: [],
        });
        if (group) group.studentCount += 1;
      }
      return wait(inputs.length);
    },
    async updateStudent(id, input) {
      const st = s().students.find((x) => x.id === id);
      if (st) {
        if (input.name !== undefined) st.name = input.name;
        if (input.parentPhone !== undefined) st.parentPhone = input.parentPhone;
        if (input.studentPhone !== undefined) st.studentPhone = input.studentPhone;
        if (input.parentApproval !== undefined) st.parentApproval = input.parentApproval;
        if (input.groupId !== undefined) {
          st.groupId = input.groupId;
          st.group = s().groups.find((g) => g.id === input.groupId)?.name ?? '';
        }
      }
      return wait(undefined);
    },
    async archiveStudent(id) {
      s().students = s().students.filter((x) => x.id !== id);
      return wait(undefined);
    },

    async getStudentHistory(id) {
      const st = s().students.find((x) => x.id === id);
      if (!st) return wait({ papers: [], lessons: [] });
      const base = st.latestScore || 75;
      const papers = s()
        .assessments.filter((a) => a.groupId === st.groupId && a.status !== 'awaiting_papers')
        .map((a, i) => ({
          submissionId: `sub_${a.id}_${id}`,
          assessmentId: a.id,
          title: a.title,
          score: Math.max(0, Math.min(a.totalScore || 100, Math.round(((base - i * 3) / 100) * (a.totalScore || 100)))),
          total: a.totalScore || 100,
          date: a.date,
          questionsCount: a.questionsCount,
        }));
      const lessons = (st.weakLessons.length ? st.weakLessons : ['الاشتقاق الضمني', 'قواعد الاشتقاق الأساسية'])
        .map((lesson, i) => ({ lesson, lessonId: demoLessonId(lesson), mastery: Math.max(35, base - 25 + i * 12) }))
        .sort((a, b) => a.mastery - b.mastery);
      return wait({ papers, lessons });
    },

    getTaughtLessons: (groupId) => wait({ ...(s().progress[groupId] ?? {}) }),
    async setLessonTaught(groupId, lessonId, taught) {
      const p = (s().progress[groupId] ??= {});
      if (taught) p[lessonId] = new Date().toISOString();
      else delete p[lessonId];
      return wait(undefined);
    },

    getExaminedLessons: (groupId) => {
      const out: Record<string, number | null> = {};
      if (groupId === 'g1') {
        Object.entries(MOCK_GROUP_PROGRESS_G1).forEach(([id, p]) => {
          if (p.status === 'taught_and_examined' || p.status === 'examined') out[id] = p.masteryRate ?? null;
        });
      }
      for (const a of s().assessments.filter((x) => x.groupId === groupId))
        for (const q of a.questions) if (q.lessonId && !(q.lessonId in out)) out[q.lessonId] = null;
      return wait(out);
    },

    listAssessments: () => wait(s().assessments.map(summary)),
    getAssessment: (id) => {
      const a = s().assessments.find((x) => x.id === id);
      return wait(a ? { ...summary(a), questions: a.questions } : null);
    },
    async createAssessment(input) {
      const group = s().groups.find((g) => g.id === input.groupId);
      const subject = findSubject(input.subjectId);
      const id = newId('ex');
      const lessonTitle = (lessonId: string | null) => {
        for (const u of subject?.s.units ?? []) for (const l of u.lessons) if (l.id === lessonId) return l.title;
        return '';
      };
      s().assessments.unshift({
        id,
        title: input.title,
        type: input.kind,
        subject: subject?.s.name ?? group?.subjectName ?? '',
        group: group?.name ?? '',
        groupId: input.groupId,
        subjectId: input.subjectId,
        date: input.scheduledOn ?? new Date().toISOString().slice(0, 10),
        totalScore: 0,
        uploadedCount: 0,
        totalStudents: group?.studentCount ?? 0,
        status: 'awaiting_papers',
        submissionMode: input.submissionMode,
        autoSendReports: input.autoSendReports,
        questionsCount: input.questions.length,
        submissionCode: id.slice(-10),
        submissionOpen: input.submissionMode === 'link',
        createdAt: new Date().toISOString(),
        questions: input.questions.map((q, i) => ({
          id: newId('q'),
          questionNumber: i + 1,
          text: q.text,
          type: q.type,
          maxScore: q.maxScore,
          lesson: lessonTitle(q.lessonId),
          lessonId: q.lessonId,
          modelAnswer: q.modelAnswer,
          criteria: q.criteria,
        })),
      });
      return wait(id);
    },
    async updateAssessment(id, patch) {
      const a = s().assessments.find((x) => x.id === id);
      if (a) {
        if (patch.title !== undefined) a.title = patch.title;
        if (patch.status !== undefined) a.status = patch.status;
        if (patch.submissionOpen !== undefined) a.submissionOpen = patch.submissionOpen;
        if (patch.autoSendReports !== undefined) a.autoSendReports = patch.autoSendReports;
      }
      return wait(undefined);
    },
    async deleteAssessment(id) {
      s().assessments = s().assessments.filter((a) => a.id !== id);
      return wait(undefined);
    },

    listSubmissions: (assessmentId) => wait(s().submissions.filter((x) => x.assessmentId === assessmentId)),
    listQuestionGrades: (submissionId) =>
      wait(s().grades.filter((g) => g.submissionId === submissionId).sort((a, b) => a.questionNumber - b.questionNumber)),
    listAssessmentGrades: (assessmentId) => {
      const subs = new Set(s().submissions.filter((x) => x.assessmentId === assessmentId).map((x) => x.id));
      return wait(s().grades.filter((g) => subs.has(g.submissionId)).map((g) => ({ ...g })));
    },
    async saveTeacherGrade(id, finalScore, teacherNote) {
      const g = s().grades.find((x) => x.id === id);
      if (g) {
        g.finalScore = finalScore;
        g.teacherNote = teacherNote;
        g.reviewedAt = new Date().toISOString();
        const sub = s().submissions.find((x) => x.id === g.submissionId);
        if (sub) {
          const rows = s().grades.filter((x) => x.submissionId === sub.id);
          sub.totalScore = rows.reduce((n, r) => n + (r.finalScore ?? 0), 0);
          sub.lowConfidenceUnreviewed = rows.filter((r) => !r.reviewedAt && (r.aiConfidence ?? 1) < 0.7).length;
        }
      }
      return wait(undefined);
    },
    async uploadPaper(assessmentId, pages, studentId = null) {
      const id = newId('sub');
      const st = s().students.find((x) => x.id === studentId);
      s().submissions.push({
        id,
        assessmentId,
        studentId: st?.id ?? null,
        studentName: st?.name ?? 'طالب غير محدد',
        studentCode: st?.studentCode ?? '',
        source: 'teacher_scan',
        status: 'uploaded',
        totalScore: 0,
        lowConfidenceUnreviewed: 0,
        submittedAt: new Date().toISOString(),
        pageCount: pages.length,
      });
      s().pages[id] = pages.map((p) => p.dataUrl);
      const a = s().assessments.find((x) => x.id === assessmentId);
      if (a) a.uploadedCount += 1;
      return wait(id);
    },
    async gradeSubmission(id) {
      const sub = s().submissions.find((x) => x.id === id);
      const a = s().assessments.find((x) => x.id === sub?.assessmentId);
      if (!sub || !a) return { ok: false, error: 'لم نجد الورقة.' };
      if (!a.questions.length) return { ok: false, error: 'أضف أسئلة ومعايير لهذا الامتحان أولاً.' };
      sub.status = 'grading';
      try {
        const result = await requestGrading(
          {
            title: a.title,
            subject: a.subject,
            feedbackLanguage: 'ar',
            classRoster: s().students.filter((x) => x.groupId === a.groupId).map((x) => x.name),
            questions: a.questions.map((q) => ({
              questionNumber: q.questionNumber, text: q.text, type: q.type, maxScore: q.maxScore,
              modelAnswer: q.modelAnswer, criteria: q.criteria, lesson: q.lesson,
            })),
          },
          (s().pages[id] ?? []).map((url) => ({ base64: url.slice(url.indexOf(',') + 1), dataUrl: url, mediaType: 'image/jpeg' as const })),
        );
        if (!sub.studentId && result.studentCodeOnPaper) {
          const st = s().students.find((x) => x.studentCode === result.studentCodeOnPaper);
          if (st) Object.assign(sub, { studentId: st.id, studentName: st.name, studentCode: st.studentCode });
        }
        if (!sub.studentId && result.studentNameOnPaper) {
          const hits = s().students.filter((x) => x.groupId === a.groupId && x.name === result.studentNameOnPaper);
          if (hits.length === 1) Object.assign(sub, { studentId: hits[0].id, studentName: hits[0].name, studentCode: hits[0].studentCode });
        }
        s().grades = s().grades.filter((g) => g.submissionId !== id);
        for (const r of result.questions) {
          const q = a.questions.find((x) => x.questionNumber === r.questionNumber);
          if (!q) continue;
          s().grades.push({
            id: newId('gr'), submissionId: id, questionId: q.id, questionNumber: q.questionNumber, questionText: q.text,
            maxScore: q.maxScore, modelAnswer: q.modelAnswer, aiScore: r.score, aiReason: r.reason, aiTranscription: r.transcription,
            aiConfidence: r.unreadable ? 0.2 : r.confidence === 'high' ? 0.95 : r.confidence === 'medium' ? 0.75 : 0.4,
            aiCriteria: r.criteria.map((c) => ({ criterion: c.criterion, met: c.met, points: c.pointsAwarded })),
            finalScore: r.score, teacherNote: r.feedbackForStudent || null, reviewedAt: null,
          });
        }
        const rows = s().grades.filter((g) => g.submissionId === id);
        sub.totalScore = rows.reduce((n, r) => n + (r.finalScore ?? 0), 0);
        sub.lowConfidenceUnreviewed = rows.filter((r) => (r.aiConfidence ?? 1) < 0.7).length;
        sub.status = 'needs_review';
        if (a.status === 'awaiting_papers') a.status = 'needs_review';
        return { ok: true };
      } catch (e) {
        sub.status = 'failed';
        return { ok: false, error: e instanceof Error ? e.message : 'تعذّر التصحيح.' };
      }
    },
    getPageUrls: (id) => wait(s().pages[id] ?? []),
    async assignStudent(id, studentId) {
      const sub = s().submissions.find((x) => x.id === id);
      const st = s().students.find((x) => x.id === studentId);
      if (sub) Object.assign(sub, { studentId: st?.id ?? null, studentName: st?.name ?? 'طالب غير محدد', studentCode: st?.studentCode ?? '' });
      return wait(undefined);
    },
    async deleteSubmission(id) {
      s().submissions = s().submissions.filter((x) => x.id !== id);
      s().grades = s().grades.filter((g) => g.submissionId !== id);
      return wait(undefined);
    },
    listReportStatuses: (ids) => wait(Object.fromEntries(ids.filter((id) => s().reports[id]).map((id) => [id, s().reports[id]]))),
    async queueReports(items) {
      for (const i of items) s().reports[i.submissionId] = 'queued';
      return wait({ queued: items.length, sent: 0, error: 'وضع التجربة: الإرسال الآلي يعمل بعد ربط واتساب. استخدم زر «أرسل يدوياً» الآن.' });
    },
    async approveSubmission(id) {
      const sub = s().submissions.find((x) => x.id === id);
      if (sub) sub.status = 'approved';
      return wait(undefined);
    },
  };
  return { ...base, ...createDemoSchool(base) };
}
