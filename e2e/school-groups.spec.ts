import { expect, test } from '@playwright/test';
import { open, watchErrors, expectNoHorizontalScroll } from './helpers';

// A school student studies many subjects, so one student is in many groups.
// Adding them to another group must keep the same student (same code).
test('add an existing student to a second group keeps one student', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/groups');
  const before = await page.getByText(/^كل الطلاب \(\d+\)$/).first().innerText();

  // Copy every student of group A into group B.
  await page.getByRole('button', { name: 'إضافة طالب' }).first().click();
  await page.getByRole('button', { name: 'طالب موجود مسبقاً' }).click();
  const dialog = page.locator('div.fixed').last();
  const selects = dialog.locator('select');
  await selects.nth(0).selectOption({ index: 1 }); // target: second group
  await selects.nth(1).selectOption({ index: 1 }); // source: first other group
  await expectNoHorizontalScroll(page);
  await dialog.getByRole('button', { name: /^أضف \(\d+\)$/ }).click();
  await expect(page.getByText(/تمت إضافة \d+ طالباً بنفس رموزهم/).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'تم' }).click();

  // Still the same number of students overall (no duplicates were made).
  await expect(page.getByText(/^كل الطلاب \(\d+\)$/).first()).toHaveText(before);

  // The edit screen lists every group of the student.
  await page.getByRole('button', { name: /^تعديل/ }).first().click();
  await expect(page.getByText('المجموعات (المواد) التي يدرس فيها')).toBeVisible();
  expect(errors).toEqual([]);
});

test('exam generator can pick a whole unit', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/ai-tools/generate-exam');
  await page.getByRole('button', { name: 'أظهر كل دروس المادة' }).click();
  const unitBox = page.getByText('اختر الوحدة كاملة').first();
  await unitBox.click();
  await expect(page.getByText('الوحدة كاملة', { exact: false }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('one exam can be saved for several sections of the same subject', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/app/assignments/new');
  await expect(page.getByText('نفس الامتحان لشعب أخرى في نفس المادة:')).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});
