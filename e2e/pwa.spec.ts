import { test, expect } from '@playwright/test';

// The site can be installed as a phone app: manifest, icons and offline opening.
test('app manifest and icons are served', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.short_name).toBe('دقة');
  expect(m.dir).toBe('rtl');
  expect(m.display).toBe('standalone');
  for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
});

test('pages open without internet after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/s/demo');
  await expect(page.locator('body')).toContainText('تسليم');
  await context.setOffline(false);
});

test('landing page explains how to install the app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'نزّل التطبيق' }).click();
  const section = page.locator('#install-app');
  await expect(section).toContainText('نزّل تطبيق دقة');
  await section.getByRole('tab', { name: 'آيفون' }).click();
  await expect(section).toContainText('إضافة إلى الشاشة الرئيسية');
  await section.getByRole('tab', { name: 'أندرويد' }).click();
  await expect(section).toContainText('Chrome');
});
