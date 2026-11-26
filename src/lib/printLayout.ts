// How the printed answer sheet is laid out: answer lines per question, the
// answer-space style, and the page count the teacher asked for. Saved on the
// exam (assessments.print_layout), keyed by question number so it survives
// editing the questions' text.

export type AnswerStyle = 'lines' | 'box';

export interface PrintLayout {
  /** The page count the teacher asked for (null = no target). */
  pages: number | null;
  style: AnswerStyle;
  /** Answer lines per question number. A missing number uses estimateLines. */
  lines: Record<string, number>;
  /** True once the AI suggested the lines (so opening the page again doesn't ask again). */
  ai: boolean;
}

export const MAX_LINES = 40;
export const MAX_PAGES = 10;

/**
 * A quick guess of the answer lines a question needs, used until the AI has
 * suggested its numbers (or when it can't be reached): longer model answers
 * and more marks mean more lines. Never 1 line unless it's a choice question.
 */
export function estimateLines(q: { type: string; maxScore?: number; modelAnswer?: string }): number {
  if (q.type === 'multiple_choice') return 1;
  const base = q.type === 'short_answer' ? 3 : q.type === 'essay' ? 8 : 5;
  // About 45 handwritten characters fit on one line; add 1 line of spare room.
  const fromAnswer = q.modelAnswer?.trim() ? Math.ceil(q.modelAnswer.trim().length / 45) + 1 : 0;
  const fromMarks = q.maxScore ? Math.ceil(q.maxScore / 2) + 1 : 0;
  return Math.max(base, Math.min(MAX_LINES, Math.max(fromAnswer, fromMarks)));
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
  return { pages, style: r.style === 'box' ? 'box' : 'lines', lines, ai: r.ai === true };
}

export function linesFor(layout: PrintLayout, q: { questionNumber: number; type: string; maxScore?: number; modelAnswer?: string }): number {
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
