import { expect, Page, test } from '@playwright/test';
import { open, pathname, watchErrors } from './helpers';

// One person can belong to several organizations (own tutoring + teacher at a
// school + owner of a centre). The switcher in the top bar moves between them.

async function switchTo(page: Page, name: RegExp) {
  await page.getByTitle('التبديل بين الحسابات والجهات المسجلة').click();
  await page.getByText(name).last().click();
  await page.waitForLoadState('networkidle');
}

/** Moves inside the app without reloading (demo data lives in memory). */
async function goInside(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(300);
}

test('owner of a centre lands in the school area', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app');
  await switchTo(page, /مركز الروّاد التعليمي/);
  expect(pathname(page)).toBe('/school');
  expect(errors).toEqual([]);
});

test('teacher at a school lands in the teacher area', async ({ page }) => {
  await open(page, '/app');
  await switchTo(page, /مدرسة الأمل الخاصة/);
  expect(pathname(page)).toBe('/app');
});

test('a school teacher never sees the subscription and invoices', async ({ page, isMobile }) => {
  await open(page, '/app');
  await switchTo(page, /مدرسة الأمل الخاصة/);
  if (isMobile) await page.locator('nav.fixed').getByText('القائمة').click();
  const menu = isMobile ? page.locator('div.fixed.inset-0.z-50') : page.locator('aside');
  await expect(menu.getByRole('button', { name: 'لوحة المتابعة الرئيسية' })).toBeVisible();
  await expect(menu.getByRole('button', { name: /رسوم الطلاب والمالية/ })).toHaveCount(0);
  // Even when the address is typed or opened from a saved link.
  await goInside(page, '/app/billing');
  await expect(page).toHaveURL(/\/app$/);
});
