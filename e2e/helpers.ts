import { expect, Page } from '@playwright/test';

// Every screen address, grouped by area. Keep in step with src/routes.ts.
export const VISITOR_PATHS = ['/', '/pricing', '/register', '/login', '/s/demo'];
export const TEACHER_PATHS = [
  '/app', '/app/groups', '/app/student', '/app/assignments', '/app/assignments/new', '/app/answer-sheets',
  '/app/upload', '/app/review', '/app/results', '/app/reports', '/app/billing', '/app/corrected-paper',
  '/app/progress', '/app/diagnostics', '/app/support', '/app/ai-tools', '/app/ai-tools/generate-exam',
  '/app/ai-tools/remedial', '/app/ai-tools/question-bank', '/app/ai-tools/convert-exam',
  '/app/ai-tools/group-answers', '/app/ai-tools/study-plan', '/app/ai-tools/at-risk',
  '/app/ai-tools/parent-replies', '/app/ai-tools/my-files',
];
export const SCHOOL_PATHS = [
  '/school', '/school/teachers', '/school/report', '/school/compare', '/school/classes', '/school/student',
  '/school/quality', '/school/results', '/school/corrected-paper', '/school/group-answers',
  '/school/parent-reports', '/school/billing', '/school/support',
];
export const ADMIN_PATHS = ['/admin', '/admin/billing', '/admin/quality', '/admin/curricula', '/admin/support', '/admin/landing'];

export type Area = 'visitor' | 'student' | 'teacher' | 'school' | 'admin';
export function areaOf(pathname: string): Area {
  if (pathname.startsWith('/s/')) return 'student';
  if (pathname === '/app' || pathname.startsWith('/app/')) return 'teacher';
  if (pathname === '/school' || pathname.startsWith('/school/')) return 'school';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return 'visitor';
}

/** Collects page crashes and console errors while a test runs. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`crash: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('dialog', (d) => {
    // The app uses notify() for messages; a browser pop-up blocks the user.
    errors.push(`browser pop-up (${d.type()}): ${d.message()}`);
    void d.dismiss();
  });
  return errors;
}

export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
}

/** No sideways scrolling on the page (390px phones included). */
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, 'page is wider than the screen').toBeLessThanOrEqual(innerWidth + 1);
}

export const pathname = (page: Page) => new URL(page.url()).pathname;

/** Toast text shown by notify(). */
export const toast = (page: Page, text: string | RegExp) => page.getByText(text).first();
