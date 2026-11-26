// Answer-sheet page fitting: questions are packed whole into pages, and
// "make it N pages" spreads the answer lines to fill exactly N pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitToPages, fitsIn, normalizePrintLayout, packPages, type PageMetrics } from '../../src/lib/printLayout.ts';

const m = (questions: number[]): PageMetrics => ({ page: 1000, firstHeader: 200, nextHeader: 80, gap: 10, line: 30, questions });

test('packs whole questions and starts a new page when one does not fit', () => {
  const pages = packPages(m([100, 100, 100]), [10, 10, 10]); // 400 each
  assert.deepEqual(pages, [[0], [1, 2]]);
});

test('fitting to N pages fills N pages and never overflows', () => {
  const metrics = m([60, 60, 60, 60, 60, 60]);
  for (const target of [1, 2, 3]) {
    const out = fitToPages(metrics, [1, 3, 3, 6, 6, 8], target);
    assert.ok(out, `fits in ${target}`);
    assert.equal(packPages(metrics, out).length, target);
    assert.ok(fitsIn(metrics, out, target));
    // Longer questions keep at least as much room as shorter ones.
    assert.ok(out[5] >= out[0]);
  }
});

test('questions with no space stay at zero lines', () => {
  const out = fitToPages(m([60, 60]), [0, 4], 1)!;
  assert.equal(out[0], 0);
  assert.ok(out[1] > 4);
});

test('returns null when even the least space does not fit', () => {
  assert.equal(fitToPages(m(Array(30).fill(100)), Array(30).fill(3), 1), null);
});

test('one huge question cannot claim to fit by sitting alone on a page', () => {
  const metrics = m([60, 60]);
  const out = fitToPages(metrics, [6, 6], 2)!;
  assert.ok(out.every((n) => 60 + n * 30 <= 1000 - 80));
});

test('normalize drops bad values', () => {
  assert.deepEqual(normalizePrintLayout({ pages: 99, style: 'x', lines: { '1': 5.4, a: 3, '2': -1, '3': 500 } }), {
    pages: null,
    style: 'lines',
    lines: { '1': 5, '2': 0, '3': 40 },
  });
});

test('estimates answer space from the model answer, not one line', async () => {
  const { estimateLines, layoutFromQuestions } = await import('../../src/lib/printLayout.ts');
  assert.equal(estimateLines({ type: 'multiple_choice', modelAnswer: 'ب' }), 1);
  const long = 'كلمة '.repeat(80);
  assert.ok(estimateLines({ type: 'essay', modelAnswer: long }) >= 10);
  assert.ok(estimateLines({ type: 'problem_solving', modelAnswer: 'س = 3' }) >= 4);
  assert.ok(estimateLines({ type: 'short_answer', modelAnswer: '' }) >= 2);
  assert.deepEqual(layoutFromQuestions([{ answerLines: 5 }, {}, { answerLines: 99 }]).lines, { '1': 5, '3': 40 });
});
