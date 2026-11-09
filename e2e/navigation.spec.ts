import { expect, Page, test } from '@playwright/test';
import { SCHOOL_PATHS, areaOf, open, pathname, watchErrors } from './helpers';

// The menu of each area: every item opens a screen of the same area, with the
// same menu still showing (e.g. a school owner never lands in the teacher menu).
const AREAS = [
  { start: '/app', firstItem: 'لوحة المتابعة الرئيسية' },
  { start: '/school', firstItem: 'لوحة إدارة المدرسة' },
  { start: '/admin', firstItem: 'لوحة الإشراف العام' },
];

async function openMenu(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.locator('nav.fixed').getByText('القائمة').click();
    return page.locator('div.fixed.inset-0.z-50');
  }
  return page.locator('aside');
}

for (const area of AREAS) {
  test(`every menu item in ${area.start} stays in that area`, async ({ page, isMobile }) => {
    const errors = watchErrors(page);
    await open(page, area.start);
    const menu = await openMenu(page, isMobile);
    const labels = (await menu.locator('button:has(svg)').allInnerTexts())
      .map((t) => t.split('\n')[0].trim())
      .filter((t) => t.length > 1);
    expect(labels.length).toBeGreaterThan(3);

    for (const label of labels) {
      await open(page, area.start);
      const m = await openMenu(page, isMobile);
      await m.getByRole('button', { name: label }).first().click();
      await page.waitForLoadState('networkidle');
      expect(areaOf(pathname(page)), `menu item «${label}» left ${area.start}`).toBe(areaOf(area.start));
      // The same area's menu is still there.
      const after = await openMenu(page, isMobile);
      await expect(after.getByRole('button', { name: area.firstItem })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

// Every button inside the school screens keeps the owner in the school area
// (only signing out leaves it).
test.describe('school screens keep the school layout', () => {
  test.skip(({ isMobile }) => isMobile, 'checked once, on desktop');
  for (const path of SCHOOL_PATHS) {
    test(`buttons on ${path}`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors = watchErrors(page);
      await open(page, path);
      const selector = 'main button:visible, main a:visible';
      const count = Math.min(await page.locator(selector).count(), 40);
      for (let i = 0; i < count; i++) {
        await open(page, path);
        const el = page.locator(selector).nth(i);
        const label = ((await el.innerText().catch(() => '')) || '').trim().slice(0, 40);
        if (/خروج/.test(label)) continue;
        await el.click({ timeout: 2000 }).catch(() => undefined);
        await page.waitForTimeout(150);
        expect(areaOf(pathname(page)), `button «${label}» on ${path} left the school area`).toBe('school');
      }
      expect(errors).toEqual([]);
    });
  }
});
