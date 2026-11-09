import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { open, toast, watchErrors } from './helpers';

// PDF papers and Excel student lists are accepted, not only photos and CSV.
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test('a student sends a two-page PDF and gets two pages', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/demo');
  await page.getByPlaceholder('••••').fill('1042');
  // The second picker is "photos or PDF" (the first one opens the camera).
  await page.locator('input[type=file]').nth(1).setInputFiles(fixture('two-pages.pdf'));
  await expect(page.getByText('الصفحة 2').first()).toBeVisible({ timeout: 15_000 });
  const send = page.getByRole('button', { name: 'إرسال الورقة للمدرّس' }).first();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText(/وصلت|تم استلام|شكراً/).first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('teacher scans an old exam from a PDF', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/ai-tools/convert-exam');
  await page.locator('input[type=file]').first().setInputFiles(fixture('two-pages.pdf'));
  await expect(page.getByRole('button', { name: 'حذف الصفحة 2' })).toBeAttached({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('teacher imports students from an Excel file', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/groups');
  await page.getByRole('button', { name: 'استيراد من Excel' }).click();
  await page.locator('input[type=file][accept*=".xlsx"]').setInputFiles(fixture('students.xlsx'));
  await expect(page.getByText('جاهز لاستيراد 2 طالباً')).toBeVisible();
  await page.getByRole('button', { name: 'بدء الاستيراد' }).click();
  await expect(toast(page, /تم استيراد 2 طالباً|تمت إضافة 2/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('an Excel file with stage and grade columns makes one group per class in one click', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/groups');
  await page.getByRole('button', { name: 'استيراد من Excel' }).click();
  await page.locator('input[type=file][accept*=".xlsx"]').setInputFiles(fixture('students-by-class.xlsx'));
  await expect(page.getByText('ملفك مقسّم على 2 صفوف')).toBeVisible();
  await page.getByRole('button', { name: 'أنشئ المجموعات واستورد 3 طالب' }).click();
  await expect(toast(page, /أنشأنا 2 مجموعة وأضفنا 3 طالباً/)).toBeVisible();
  await expect(page.getByRole('button', { name: /المرحلة الرابعة – الصف 7/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('a file split by class can still go into existing groups one class at a time', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/groups');
  await page.getByRole('button', { name: 'استيراد من Excel' }).click();
  await page.locator('input[type=file][accept*=".xlsx"]').setInputFiles(fixture('students-by-class.xlsx'));
  await page.getByRole('button', { name: 'أو اختر بنفسك مجموعة موجودة لكل صف' }).click();
  await expect(page.getByText('ملفك فيه 2 صفوف')).toBeVisible();
  await expect(page.locator('li', { hasText: 'طارق نبيل عاشور' })).toBeVisible();
  await page.locator('select').filter({ hasText: 'اختر المجموعة' }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'بدء الاستيراد' }).click();
  await expect(toast(page, /تم استيراد 2 طالباً/)).toBeVisible();
  await expect(page.getByText('جاهز لاستيراد 1 طالباً')).toBeVisible();
  expect(errors).toEqual([]);
});
