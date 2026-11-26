// How the printed answer sheet is laid out: answer lines per question, the
// answer-space style, and the page count the teacher asked for. Saved on the
// exam (assessments.print_layout), keyed by question number so it survives
// editing the questions' text.

export type AnswerStyle = 'lines' | 'box';

export interface PrintLayout {
  /** The page count the teacher asked for (null = no target). */
  pages: number | null;
  style: AnswerStyle;
  /** Answer lines per question number. A missing number uses the default for its type. */
  lines: Record<string, number>;
}

export const MAX_LINES = 40;
export const MAX_PAGES = 10;

/** Default answer lines by question type. */
export function defaultLines(type: string): number {
  switch (type) {
    case 'multiple_choice':
      return 1;
    case 'short_answer':
      return 3;
    case 'essay':
      return 8;
    default:
      return 6;
  }
}

export function normalizePrintLayout(raw: unknown): PrintLayout {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pages = typeof r.pages === 'number' && Number.isInteger(r.pages) && r.pages >= 1 && r.pages <= MAX_PAGES ? r.pages : null;
  const lines: Record<string, number> = {};
  if (r.lines && typeof r.lines === 'object') {
    for (const [k, v] of Object.entries(r.lines as Record<string, unknown>)) {
      if (/^\d{1,3}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) lines[k] = Math.max(0, Math.min(MAX_LINES, Math.round(v)));
    }
  }
  return { pages, style: r.style === 'box' ? 'box' : 'lines', lines };
}

/**
 * A guess at the handwriting space a question needs, from its model answer
 * (usually written by the AI): about 8 handwritten words fit on one 8 mm line,
 * and worked problems get extra room for the steps. Used when the AI did not
 * give a number (older exams, teacher-written questions).
 */
export function estimateLines(q: { type: string; modelAnswer?: string; maxScore?: number }): number {
  if (q.type === 'multiple_choice') return 1;
  const answer = (q.modelAnswer ?? '').trim();
  const least = q.type === 'short_answer' ? 2 : q.type === 'essay' ? 6 : 4;
  if (!answer) return Math.min(MAX_LINES, defaultLines(q.type) + Math.floor((q.maxScore ?? 0) / 10));
  const words = answer.split(/\s+/).length;
  const rows = answer.split('\n').filter((l) => l.trim()).length;
  let n = Math.max(Math.ceil(words / 8), rows);
  n = q.type === 'problem_solving' ? Math.ceil(n * 1.5) + 2 : n + 1;
  return Math.max(least, Math.min(30, n));
}

/** Lines for one question: the teacher's/AI's saved number, else the estimate. */
export function linesFor(layout: PrintLayout, q: { questionNumber: number; type: string; modelAnswer?: string; maxScore?: number }): number {
  return layout.lines[String(q.questionNumber)] ?? estimateLines(q);
}

// ---------------------------------------------------------------------------
// Page packing. Heights are in CSS px measured on the real sheet. A question is
// never split across pages (break-inside: avoid), so we pack whole blocks.
// ---------------------------------------------------------------------------

export interface PageMetrics {
  /** Usable height of one page. */
  page: number;
  /** Height taken by the first page's header (title, student, instructions). */
  firstHeader: number;
  /** Height taken by the small header on the next pages (student code, page number). */
  nextHeader: number;
  /** Space between question blocks. */
  gap: number;
  /** Height of one answer line. */
  line: number;
  /** Height of each question block with zero answer lines. */
  questions: number[];
}

/** Which questions go on which page (indexes), for the given answer lines. */
export function packPages(m: PageMetrics, lines: number[]): number[][] {
  const pages: number[][] = [[]];
  let left = m.page - m.firstHeader;
  m.questions.forEach((fixed, i) => {
    const h = fixed + lines[i] * m.line;
    const cur = pages[pages.length - 1];
    const need = h + (cur.length ? m.gap : 0);
    if (need > left && cur.length) {
      pages.push([i]);
      left = m.page - m.nextHeader - h;
    } else {
      cur.push(i);
      left -= need;
    }
  });
  return pages;
}

/** True when the sheet takes at most `target` pages and no question is taller than its page. */
export function fitsIn(m: PageMetrics, lines: number[], target: number): boolean {
  const pages = packPages(m, lines);
  if (pages.length > target) return false;
  return pages.every((idx, p) => {
    const room = m.page - (p === 0 ? m.firstHeader : m.nextHeader);
    return idx.every((i) => m.questions[i] + lines[i] * m.line <= room);
  });
}

/**
 * Answer lines that make the sheet exactly `target` pages, keeping each
 * question's share (its current lines) and then filling the room left at the
 * bottom of each page. Returns null when the questions do not fit even with
 * the least space (one line each, none for multiple choice that has none).
 */
export function fitToPages(m: PageMetrics, current: number[], target: number): number[] | null {
  const weights = current.map((n) => Math.max(n, 0));
  const minimum = weights.map((w) => (w > 0 ? 1 : 0));
  const scaled = (s: number) => weights.map((w, i) => Math.min(MAX_LINES, Math.max(minimum[i], Math.round(w * s))));
  if (!fitsIn(m, minimum, target)) return null;

  // Largest scale that still fits in `target` pages.
  let lo = 0;
  let hi = 1;
  while (hi < 64 && fitsIn(m, scaled(hi), target)) hi *= 2;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (fitsIn(m, scaled(mid), target)) lo = mid;
    else hi = mid;
  }
  const out = scaled(lo);

  // Fill what is left on each page by giving extra lines to that page's questions.
  const pages = packPages(m, out);
  pages.forEach((idx, p) => {
    const used = idx.reduce((sum, i, k) => sum + m.questions[i] + out[i] * m.line + (k ? m.gap : 0), 0);
    let spare = m.page - (p === 0 ? m.firstHeader : m.nextHeader) - used;
    const growable = idx.filter((i) => weights[i] > 0);
    if (!growable.length) return;
    // Hand out spare lines one at a time, biggest share first.
    let guard = 0;
    while (spare >= m.line && guard++ < 1000) {
      let gave = false;
      for (const i of [...growable].sort((a, b) => weights[b] - weights[a])) {
        if (spare < m.line) break;
        if (out[i] >= MAX_LINES) continue;
        out[i] += 1;
        spare -= m.line;
        gave = true;
      }
      if (!gave) break;
    }
  });
  return out;
}

/** The print layout a new exam starts with: the answer lines given per question (by number). */
export function layoutFromQuestions(questions: { answerLines?: number }[]): PrintLayout {
  const lines: Record<string, number> = {};
  questions.forEach((q, i) => {
    if (typeof q.answerLines === 'number' && Number.isFinite(q.answerLines)) lines[String(i + 1)] = Math.max(0, Math.min(MAX_LINES, Math.round(q.answerLines)));
  });
  return { pages: null, style: 'lines', lines };
}
