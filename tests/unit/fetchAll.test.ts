// fetchAll must collect every row past Supabase's 1000-rows-per-request limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAll } from '../../src/data/fetchAll.ts';

const fakeTable = (n: number) => {
  const rows = Array.from({ length: n }, (_, i) => i);
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null };
  };
  return { page, calls };
};

test('collects all rows across pages', async () => {
  const t = fakeTable(2500);
  const { data, error } = await fetchAll(t.page);
  assert.equal(error, null);
  assert.equal(data.length, 2500);
  assert.deepEqual(t.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test('one request when the table is small, and when it is exactly one page', async () => {
  assert.equal((await fetchAll(fakeTable(5).page)).data.length, 5);
  const t = fakeTable(1000);
  assert.equal((await fetchAll(t.page)).data.length, 1000);
  assert.equal(t.calls.length, 2);
});

test('stops at max', async () => {
  const t = fakeTable(30_000);
  const { data } = await fetchAll(t.page, 10_000);
  assert.equal(data.length, 10_000);
  assert.deepEqual(t.calls.at(-1), [9000, 9999]);
});

test('returns the error and the rows read so far', async () => {
  let n = 0;
  const { data, error } = await fetchAll(async () => (n++ === 0 ? { data: Array(1000).fill(1), error: null } : { data: null, error: { message: 'boom' } }));
  assert.equal(data.length, 1000);
  assert.equal(error?.message, 'boom');
});
