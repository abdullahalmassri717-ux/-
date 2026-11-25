// The intro page config: old saved shapes still load, and nothing is lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_SECTIONS, DEFAULT_LANDING_CONFIG, mergeLanding, shown } from '../../src/lib/landingConfig.ts';

test('nothing saved gives the defaults with all sections shown', () => {
  const c = mergeLanding(null);
  assert.deepEqual(c.sectionOrder, [...BUILTIN_SECTIONS]);
  assert.equal(c.whoIsItFor.cards.length, 3);
  assert.ok(Object.values(c.sectionVisibility).every(Boolean));
  assert.equal(c.soonLabel, 'قريباً');
});

test('a config saved in the old shape keeps its texts and gets ids and statuses', () => {
  const old = {
    whoIsItFor: { sectionTitle: 'لمن؟', tutor: { title: 'مدرّس', features: ['أ', 'ب'] } },
    features: { items: [{ title: 'ميزة 1', desc: 'x' }, { title: 'ميزة 2', desc: 'y' }] },
    faqs: { items: [{ q: 'س', a: 'ج' }] },
    howItWorks: { steps: [{ num: '01', title: 't', desc: 'd' }] },
    sectionVisibility: { faqs: false, hero: true },
  };
  const c = mergeLanding(old);
  assert.equal(c.whoIsItFor.sectionTitle, 'لمن؟');
  assert.equal(c.whoIsItFor.cards[0].title, 'مدرّس');
  assert.deepEqual(c.whoIsItFor.cards[0].features.map((f) => f.text), ['أ', 'ب']);
  assert.equal(c.whoIsItFor.cards[1].title, DEFAULT_LANDING_CONFIG.whoIsItFor.cards[1].title);
  assert.equal(c.features.items.length, 2);
  assert.ok(c.features.items.every((i) => i.id && i.status === 'visible'));
  assert.notEqual(c.features.items[0].id, c.features.items[1].id);
  assert.equal(c.faqs.items[0].q, 'س');
  assert.equal(c.sectionVisibility.faqs, false);
  assert.equal(c.curricula.items.length, 4);
});

test('custom sections, order and statuses round-trip', () => {
  const c = mergeLanding(null);
  c.customSections.push({ id: 'abc', sectionBadge: '', sectionTitle: 'جديد', sectionSubtitle: '', items: [{ id: 'q', status: 'soon', title: 'a', desc: '' }] });
  c.sectionOrder = ['custom:abc', ...[...BUILTIN_SECTIONS].reverse()];
  c.features.items[0].status = 'hidden';
  const back = mergeLanding(JSON.parse(JSON.stringify(c)));
  assert.equal(back.sectionOrder[0], 'custom:abc');
  assert.equal(back.sectionOrder.length, BUILTIN_SECTIONS.length + 1);
  assert.equal(back.sectionOrder[1], 'ctaBanner');
  assert.equal(back.customSections[0].items[0].status, 'soon');
  assert.equal(shown(back.features.items).length, DEFAULT_LANDING_CONFIG.features.items.length - 1);
});

test('a removed custom section drops out of the order; bad values fall back safely', () => {
  const c = mergeLanding({ sectionOrder: ['custom:gone', 'faqs', 42], features: { items: [{ title: 'x', status: 'weird' }] } });
  assert.ok(!c.sectionOrder.includes('custom:gone'));
  assert.equal(c.sectionOrder.length, BUILTIN_SECTIONS.length);
  assert.ok(c.sectionOrder.indexOf('faqs') < c.sectionOrder.indexOf('ctaBanner'));
  assert.equal(c.features.items[0].status, 'visible');
});

test('the once-fixed sections load their defaults and keep saved edits', () => {
  const c = mergeLanding({
    plans: { cards: [{ id: 'plan_tutor', title: 'للمدرّس', points: [{ title: 'أ', desc: 'ب', status: 'soon' }] }] },
    whatsapp: { title: 'تقرير' },
    comparison: { rows: [{ text: 'خطأ', score: '0/3', correct: false }] },
  });
  assert.equal(c.plans.cards.length, 1);
  assert.equal(c.plans.cards[0].title, 'للمدرّس');
  assert.equal(c.plans.cards[0].tag, DEFAULT_LANDING_CONFIG.plans.cards[0].tag);
  assert.equal(c.plans.cards[0].points[0].status, 'soon');
  assert.equal(c.whatsapp.title, 'تقرير');
  assert.equal(c.whatsapp.senderName, DEFAULT_LANDING_CONFIG.whatsapp.senderName);
  assert.equal(c.comparison.rows[0].correct, false);
  assert.equal(c.comparison.subjectTabs.length, 4);
  assert.equal(c.install.points.length, 3);
  assert.deepEqual(c.testimonials.items, []);
});
