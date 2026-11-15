import { test, expect } from '@playwright/test';

// Tapping an exam card opens its questions; the teacher can edit and save them.
test('exam card opens the questions page and edits save', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/assignments');
  const card = page.getByTitle('عرض أسئلة الامتحان').first();
  await card.click();
  await expect(page).toHaveURL(/\/app\/assignments\/questions$/);
  await expect(page.getByRole('button', { name: 'تعديل الأسئلة' })).toBeVisible();
  const before = await page.locator('span.rounded-full.bg-\\[\\#1E3A5F\\]').count();
  await page.getByRole('button', { name: 'تعديل الأسئلة' }).click();
  await page.getByRole('button', { name: 'إضافة سؤال' }).click();
  await page.locator('textarea[placeholder="اكتب نص السؤال كما في الورقة"]').last().fill('سؤال جديد للتجربة');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('سؤال جديد للتجربة')).toBeVisible();
  expect(await page.locator('span.rounded-full.bg-\\[\\#1E3A5F\\]').count()).toBe(before + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/exam-questions.png', fullPage: true });
});
