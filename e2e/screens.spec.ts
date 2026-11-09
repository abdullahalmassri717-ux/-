import { expect, test } from '@playwright/test';
import { ADMIN_PATHS, SCHOOL_PATHS, TEACHER_PATHS, VISITOR_PATHS, expectNoHorizontalScroll, open, pathname, watchErrors } from './helpers';

// Every screen opens, shows content, stays at its address, has no errors and
// fits the screen width (desktop and 390px phone).
for (const path of [...VISITOR_PATHS, ...TEACHER_PATHS, ...SCHOOL_PATHS, ...ADMIN_PATHS]) {
  test(`screen ${path} opens cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, path);
    expect(pathname(page)).toBe(path);
    await expect(page.locator('main')).not.toBeEmpty();
    expect((await page.locator('main').innerText()).length).toBeGreaterThan(30);
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}
