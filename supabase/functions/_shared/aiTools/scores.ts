// Fits an exam to the total mark the teacher chose before generating it.
// Marks move in half-points. Each question keeps its share of the total
// (harder, longer questions keep more), and its grading criteria are rescaled
// so they still add up to the question's new mark.
// Plain TypeScript (no Deno APIs), so the browser and the server share it.

interface Scored {
  maxScore: number;
  criteria: { description: string; points: number }[];
}

/** Splits `units` whole units by weight (largest remainder), at least `min` each. */
function split(weights: number[], units: number, min: number): number[] {
  const n = weights.length;
  if (!n) return [];
  const safe = weights.map((w) => (w > 0 && Number.isFinite(w) ? w : 1));
  const sum = safe.reduce((s, w) => s + w, 0);
  const free = units - min * n;
  const raw = safe.map((w) => (w / sum) * free);
  const out = raw.map((r) => min + Math.floor(r));
  let left = units - out.reduce((s, u) => s + u, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % n, left--) out[order[k][1]]++;
  return out;
}

/** Rescales criteria to add up to `score`, merging the last ones if there are more criteria than half-points. */
export function fitCriteria(criteria: Scored['criteria'], score: number): Scored['criteria'] {
  const units = Math.max(1, Math.round(score * 2));
  let list = criteria.filter((c) => c.description.trim());
  if (!list.length) list = [{ description: 'الإجابة الصحيحة الكاملة', points: score }];
  if (list.length > units) {
    const head = list.slice(0, units - 1);
    const tail = list.slice(units - 1);
    list = [...head, { description: tail.map((c) => c.description.trim()).join('، '), points: tail.reduce((s, c) => s + c.points, 0) }];
  }
  const parts = split(list.map((c) => c.points), units, 1);
  return list.map((c, i) => ({ description: c.description.trim(), points: parts[i] / 2 }));
}

/**
 * Gives the questions marks that add up to exactly `total` (each at least half
 * a mark), in proportion to the marks they have now.
 */
export function fitToTotal<T extends Scored>(questions: T[], total: number): T[] {
  if (!questions.length || !(total > 0)) return questions;
  const units = Math.max(questions.length, Math.round(total * 2));
  const parts = split(questions.map((q) => q.maxScore), units, 1);
  return questions.map((q, i) => {
    const maxScore = parts[i] / 2;
    return { ...q, maxScore, criteria: fitCriteria(q.criteria, maxScore) };
  });
}

export const sumScores = (questions: { maxScore: number }[]) => questions.reduce((s, q) => s + q.maxScore, 0);
