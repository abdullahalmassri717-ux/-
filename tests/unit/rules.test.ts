// Price math and the student link's opening times.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodDue, toTiers, unitPriceFor } from '../../src/lib/pricing.ts';
import { linkState, OFFLINE_GRACE_MINUTES } from '../../supabase/functions/_shared/submissionWindow.ts';

test('tier price: whole count priced at its bracket, else base', () => {
  const tiers = [{ upTo: 100, price: 9 }, { upTo: null, price: 7 }, { upTo: 50, price: 10 }];
  assert.equal(unitPriceFor(tiers, 12, 30), 10);
  assert.equal(unitPriceFor(tiers, 12, 80), 9);
  assert.equal(unitPriceFor(tiers, 12, 500), 7);
  assert.equal(unitPriceFor([], 12, 500), 12);
});

test('period due: monthly and yearly in installments', () => {
  const monthly = { cycle: 'monthly' as const, pricePerStudent: 10, tiers: [], installments: 1 };
  assert.equal(periodDue(monthly, 25), 250);
  const yearly = { cycle: 'yearly' as const, pricePerStudent: 80, tiers: [], installments: 2 };
  assert.equal(periodDue(yearly, 3), 120);
  assert.equal(periodDue({ ...yearly, installments: 0 }, 3), 240);
  assert.equal(periodDue({ ...monthly, pricePerStudent: 3.333 }, 1), 3.33);
  assert.equal(periodDue(null, 10), 0);
});

test('tiers from the database: bad prices dropped', () => {
  assert.deepEqual(toTiers([{ up_to: 10, price: 5 }, { price: 'x' }, { up_to: null, price: 4 }]), [
    { upTo: 10, price: 5 },
    { upTo: null, price: 4 },
  ]);
  assert.deepEqual(toTiers(null), []);
});

test('student link window', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  assert.equal(linkState({ open: false, opensAt: null, closesAt: null }, now), 'closed_by_teacher');
  assert.equal(linkState({ open: true, opensAt: null, closesAt: null }, now), 'open');
  assert.equal(linkState({ open: true, opensAt: '2026-11-19T13:00:00Z', closesAt: null }, now), 'not_started');
  assert.equal(linkState({ open: true, opensAt: null, closesAt: '2026-11-19T12:00:00Z' }, now), 'ended');
  assert.equal(linkState({ open: true, opensAt: '2026-11-19T11:00:00Z', closesAt: '2026-11-19T12:00:01Z' }, now), 'open');
  assert.equal(OFFLINE_GRACE_MINUTES, 30);
});
