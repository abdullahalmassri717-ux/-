import type {
  ExamToGrade,
  GradePaperInput,
  GradePaperResult,
} from '../../supabase/functions/_shared/grading/types.ts';
import type { PreparedImage } from './imageResize';

export type { ExamToGrade, GradePaperResult };

/** Sends one student's paper to the server for grading. The AI key never touches the browser. */
export async function requestGrading(exam: ExamToGrade, pages: PreparedImage[]): Promise<GradePaperResult> {
  const body: GradePaperInput = {
    exam,
    pages: pages.map((p) => ({ data: p.base64, mediaType: p.mediaType })),
  };

  let response: Response;
  try {
    response = await fetch('/api/grade-paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تأكد من الإنترنت.');
  }

  if (response.status === 404) {
    throw new Error('التصحيح الحقيقي متاح حالياً في وضع التجربة المحلي فقط (npm run dev).');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? 'حدث خطأ أثناء التصحيح.');
  }
  return data as GradePaperResult;
}
