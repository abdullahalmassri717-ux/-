// Grades one stored submission end to end, on the server only:
// reads the exam and the photographed pages, asks the AI, and saves the
// suggested grades. The teacher then reviews them in the review screen.
//
// `admin` must be a Supabase client created with the service_role key. It is
// only ever created inside Edge Functions (never in the browser).
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ClaudeGradingProvider,
  GradingError,
  demoGrade,
  gradePaper,
  gradingConfigFromEnv,
  type ExamToGrade,
  type PaperImage,
  type QuestionResult,
} from './grading/index.ts';

const CONFIDENCE_VALUE = { high: 0.95, medium: 0.75, low: 0.4 } as const;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mediaTypeFor(path: string): PaperImage['mediaType'] | null {
  const p = path.toLowerCase();
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  return null;
}

export interface GradeSubmissionResult {
  ok: boolean;
  status: string;
  error?: string;
}

export async function gradeSubmission(
  admin: SupabaseClient,
  submissionId: string,
  env: Record<string, string | undefined>,
): Promise<GradeSubmissionResult> {
  const apiKey = env.ANTHROPIC_API_KEY;
  // No AI key yet: grade with made-up practice scores so the flow can be tried
  // (see grading/demoGrade.ts). Set AI_DEMO_GRADING=off to refuse instead.
  const demo = !apiKey;
  if (demo && env.AI_DEMO_GRADING === 'off') {
    return { ok: false, status: 'uploaded', error: 'لم يُضبط مفتاح الذكاء الاصطناعي على الخادم بعد.' };
  }

  const { data: sub, error: subError } = await admin
    .from('submissions')
    .select('id, organization_id, assessment_id, student_id, status, assessments(title, auto_send_reports, status, subjects(name))')
    .eq('id', submissionId)
    .maybeSingle();
  if (subError || !sub) return { ok: false, status: 'failed', error: 'لم نجد هذه الورقة.' };
  if (sub.status === 'approved') return { ok: false, status: 'approved', error: 'هذه الورقة معتمدة من قبل.' };

  const orgId = sub.organization_id as string;
  type A = { title: string; auto_send_reports: boolean; status: string; subjects: { name: string } | { name: string }[] | null };
  const assessment = (Array.isArray(sub.assessments) ? sub.assessments[0] : sub.assessments) as A | null;
  const subjectName = Array.isArray(assessment?.subjects) ? assessment?.subjects[0]?.name : assessment?.subjects?.name;

  const { data: run } = await admin
    .from('grading_runs')
    .insert({ organization_id: orgId, submission_id: submissionId })
    .select('id')
    .single();
  await admin.from('submissions').update({ status: 'grading' }).eq('id', submissionId);

  const finish = async (status: 'succeeded' | 'failed', patch: Record<string, unknown>) => {
    if (run?.id) {
      await admin.from('grading_runs').update({ status, finished_at: new Date().toISOString(), ...patch }).eq('id', run.id);
    }
  };

  try {
    const [{ data: questions, error: qError }, { data: pages, error: pError }] = await Promise.all([
      admin
        .from('questions')
        .select('id, number, text, type, max_score, model_answer, lessons(title), rubric_criteria(description, points, sort_order)')
        .eq('assessment_id', sub.assessment_id)
        .order('number'),
      admin.from('submission_pages').select('page_number, storage_path').eq('submission_id', submissionId).order('page_number'),
    ]);
    if (qError || pError) throw new GradingError('load failed', 'تعذّر تحميل الامتحان أو صور الورقة.', true);

    type Q = {
      id: string; number: number; text: string; type: ExamToGrade['questions'][number]['type']; max_score: number;
      model_answer: string | null; lessons: { title: string } | { title: string }[] | null;
      rubric_criteria: { description: string; points: number; sort_order: number }[];
    };
    const qs = (questions ?? []) as unknown as Q[];
    const exam: ExamToGrade = {
      title: assessment?.title ?? '',
      subject: subjectName ?? '',
      feedbackLanguage: 'ar',
      questions: qs.map((q) => ({
        questionNumber: q.number,
        text: q.text,
        type: q.type,
        maxScore: Number(q.max_score),
        modelAnswer: q.model_answer ?? '',
        criteria: [...(q.rubric_criteria ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({ description: c.description, points: Number(c.points) })),
        lesson: (Array.isArray(q.lessons) ? q.lessons[0]?.title : q.lessons?.title) ?? undefined,
      })),
    };

    const images: PaperImage[] = [];
    for (const page of demo ? [] : pages ?? []) {
      const mediaType = mediaTypeFor(page.storage_path as string);
      if (!mediaType) throw new GradingError('unsupported page', 'صيغة إحدى الصفحات غير مدعومة. ارفع الصور بصيغة JPG أو PNG.');
      const { data: blob, error } = await admin.storage.from('submission-pages').download(page.storage_path as string);
      if (error || !blob) throw new GradingError('download failed', 'تعذّر قراءة صورة الورقة من التخزين.', true);
      images.push({ data: toBase64(new Uint8Array(await blob.arrayBuffer())), mediaType });
    }

    if (demo && !exam.questions.length) throw new GradingError('no questions', 'لا توجد أسئلة في هذا الامتحان.');
    if (demo && !(pages ?? []).length) throw new GradingError('no pages', 'لم تُرفع أي صورة.');
    const result = demo
      ? demoGrade(exam, submissionId)
      : await gradePaper(new ClaudeGradingProvider(apiKey!), gradingConfigFromEnv(env), { exam, pages: images });

    // Match the student from the code written on the paper, if not known yet.
    let studentId = sub.student_id as string | null;
    if (!studentId && result.studentCodeOnPaper) {
      const { data: st } = await admin
        .from('students')
        .select('id')
        .eq('organization_id', orgId)
        .eq('student_code', result.studentCodeOnPaper)
        .eq('status', 'active')
        .maybeSingle();
      if (st?.id) {
        const { data: clash } = await admin
          .from('submissions')
          .select('id')
          .eq('assessment_id', sub.assessment_id)
          .eq('student_id', st.id)
          .maybeSingle();
        if (!clash) studentId = st.id as string;
      }
    }

    // Keep what the teacher already reviewed; replace the rest with the new AI answer.
    const { data: existing } = await admin
      .from('question_grades')
      .select('id, question_id, reviewed_at')
      .eq('submission_id', submissionId);
    const reviewed = new Map((existing ?? []).filter((g) => g.reviewed_at).map((g) => [g.question_id as string, g.id as string]));
    const unreviewedIds = (existing ?? []).filter((g) => !g.reviewed_at).map((g) => g.id as string);
    if (unreviewedIds.length) await admin.from('question_grades').delete().in('id', unreviewedIds);

    const byNumber = new Map<number, QuestionResult>(result.questions.map((q) => [q.questionNumber, q]));
    const now = new Date().toISOString();
    const inserts: Record<string, unknown>[] = [];
    for (const q of qs) {
      const r = byNumber.get(q.number);
      if (!r) continue;
      const max = Number(q.max_score);
      const ai = {
        ai_score: Math.max(0, Math.min(max, r.score)),
        ai_reason: r.reason,
        ai_transcription: r.transcription,
        ai_confidence: r.unreadable ? 0.2 : CONFIDENCE_VALUE[r.confidence],
        ai_criteria: r.criteria.map((c) => ({ criterion: c.criterion, met: c.met, points: c.pointsAwarded })),
        ai_feedback: { forStudent: r.feedbackForStudent, unreadable: r.unreadable },
        ai_model: r.model ?? result.model,
        graded_at: now,
      };
      const reviewedId = reviewed.get(q.id);
      if (reviewedId) {
        await admin.from('question_grades').update(ai).eq('id', reviewedId);
      } else {
        inserts.push({ submission_id: submissionId, organization_id: orgId, question_id: q.id, teacher_note: r.feedbackForStudent || null, ...ai });
      }
    }
    if (inserts.length) {
      const { error } = await admin.from('question_grades').insert(inserts);
      if (error) throw new GradingError(error.message, 'تعذّر حفظ نتيجة التصحيح.', true);
    }

    const unsure = result.questions.some((q) => q.unreadable || q.confidence === 'low');
    // Practice grades are never sent on their own: the teacher always reviews them.
    const status = assessment?.auto_send_reports && !unsure && studentId && !demo ? 'approved' : 'needs_review';
    await admin
      .from('submissions')
      .update({ status, student_id: studentId, graded_at: now })
      .eq('id', submissionId);
    if (assessment && ['draft', 'awaiting_papers', 'grading'].includes(assessment.status)) {
      await admin.from('assessments').update({ status: 'needs_review' }).eq('id', sub.assessment_id);
    }
    await finish('succeeded', {
      model: result.model,
      attempts: result.attempts,
      cost_usd: result.totalCostUsd,
      escalated: result.escalatedQuestions.length > 0,
    });
    return { ok: true, status };
  } catch (error) {
    const message = error instanceof GradingError ? error.userMessage : 'حدث خطأ غير متوقع أثناء التصحيح.';
    await admin.from('submissions').update({ status: 'failed' }).eq('id', submissionId);
    await finish('failed', { error: error instanceof Error ? error.message.slice(0, 500) : String(error) });
    return { ok: false, status: 'failed', error: message };
  }
}
