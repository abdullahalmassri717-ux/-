// The student submission link (/s/<code>) talks to the student-submit Edge
// Function. Students have no account; the server checks their 4-digit code.
import { isSupabaseConfigured } from './supabase';
import { MOCK_EXAMS, MOCK_STUDENTS, MOCK_ENTITIES } from '../mockData';

export interface LinkInfo {
  title: string;
  kind: 'exam' | 'homework';
  organizationName: string;
  open: boolean;
  maxPages: number;
}

export interface LinkPage {
  base64: string;
  mediaType: 'image/jpeg';
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const endpoint = () => `${url}/functions/v1/student-submit`;
const headers = () => ({ apikey: anonKey ?? '', Authorization: `Bearer ${anonKey ?? ''}`, 'Content-Type': 'application/json' });

export class LinkError extends Error {
  constructor(message: string, readonly offline = false) {
    super(message);
  }
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new LinkError('لا يوجد اتصال بالإنترنت.', true);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new LinkError(body?.error ?? 'حدث خطأ. حاول مرة أخرى.');
  return body as T;
}

export async function getLinkInfo(code: string): Promise<LinkInfo> {
  if (!isSupabaseConfigured) {
    // Demo mode: any link shows the first demo homework.
    const exam = MOCK_EXAMS.find((e) => e.submissionMode === 'link') ?? MOCK_EXAMS[0];
    return { title: exam.title, kind: exam.type, organizationName: MOCK_ENTITIES[0].name, open: true, maxPages: 6 };
  }
  return call<LinkInfo>(`${endpoint()}?code=${encodeURIComponent(code)}`, { headers: headers() });
}

export async function submitPaper(code: string, studentCode: string, pages: LinkPage[]): Promise<{ firstName: string }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 800));
    const st = MOCK_STUDENTS.find((s) => s.studentCode === studentCode);
    if (!st) throw new LinkError('رمز الطالب غير صحيح. تأكد منه مع المدرّس.');
    return { firstName: st.name.split(' ')[0] };
  }
  return call<{ firstName: string }>(endpoint(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ code, studentCode, pages }),
  });
}

/** Rough check for a photo that is too dark to read well (average brightness 0–255). */
export async function isTooDark(dataUrl: string): Promise<boolean> {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return sum / (data.length / 4) < 90;
  } catch {
    return false;
  }
}
