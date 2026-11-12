import { expect, test } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import { open, pathname, toast, watchErrors } from './helpers';

// The main jobs people do on the platform, from start to end, in demo mode.

test.describe('teacher', () => {
  test('creates a group and adds a student to it', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/groups');
    await page.getByRole('button', { name: 'مجموعة جديدة' }).click();
    await page.getByPlaceholder('مثال: الفوج الذهبي - رياضيات علمي أ').fill('مجموعة الفحص الآلي');
    await page.getByRole('button', { name: 'إنشاء المجموعة وربط المنهاج' }).click();
    await expect(toast(page, 'تم إنشاء المجموعة')).toBeVisible();
    await expect(page.getByRole('button', { name: /مجموعة الفحص الآلي/ })).toBeVisible();

    await page.getByRole('button', { name: 'إضافة طالب' }).first().click();
    await page.getByPlaceholder('مثال: يحيى خليل السقا').fill('طالب الفحص الآلي');
    await page.getByRole('button', { name: 'حفظ وإضافة الطالب' }).click();
    await expect(toast(page, /تمت إضافة الطالب/)).toBeVisible();
    await page.getByPlaceholder(/ابحث باسم الطالب/).fill('طالب الفحص');
    await expect(page.getByText('طالب الفحص الآلي').filter({ visible: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('pauses and resumes the monthly subscription', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/billing');
    await page.getByRole('button', { name: 'اشتراكي في دقة' }).click();
    await page.getByRole('button', { name: 'إيقاف الاشتراك' }).click();
    await page.getByRole('button', { name: 'أوقف الاشتراك' }).click();
    await expect(toast(page, /تم إيقاف الاشتراك/)).toBeVisible();
    await expect(page.getByText(/اشتراكك موقوف الآن/)).toBeVisible();
    await page.getByRole('button', { name: 'أرجِع الاشتراك الآن' }).click();
    await expect(toast(page, /رجع الاشتراك/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'إيقاف الاشتراك' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('pauses a group and turns it back on', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/groups');
    await page.getByRole('button', { name: /^كل الطلاب/ }).locator('xpath=following-sibling::button[1]').click();
    await page.getByRole('button', { name: 'إيقاف المجموعة' }).click();
    await page.getByRole('button', { name: 'نعم، أوقف المجموعة' }).click();
    await expect(toast(page, /تم إيقاف/)).toBeVisible();
    await expect(page.getByText(/المجموعات الموقوفة \(1\)/)).toBeVisible();
    await page.getByRole('button', { name: 'تفعيل' }).first().click();
    await expect(toast(page, /تعمل من جديد/)).toBeVisible();
    await expect(page.getByText(/المجموعات الموقوفة/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('opens a student profile from the list', async ({ page, isMobile }) => {
    const errors = watchErrors(page);
    await open(page, '/app/groups');
    // Phones show a card per student (tap the card); computers show a table.
    if (isMobile) await page.getByText('أحمد محمود المصري').filter({ visible: true }).first().click();
    else await page.getByRole('button', { name: 'الملف الشخصي' }).first().click();
    await expect(page).toHaveURL(/\/app\/student$/);
    expect(errors).toEqual([]);
  });
});

test.describe('exams', () => {
  test('teacher creates an exam with a question and its criteria', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/assignments/new');
    await page.getByPlaceholder('مثال: امتحان الشهر الأول في التفاضل').fill('امتحان الفحص الآلي');
    await page.getByPlaceholder('اكتب نص السؤال كما في الورقة').first().fill('احسب مشتقة س²');
    await page.getByPlaceholder('مثال: كتابة القانون الصحيح').first().fill('كتابة الناتج الصحيح');
    await page.getByRole('button', { name: 'حفظ الامتحان ومعايير التصحيح' }).click();
    await expect(toast(page, /تم حفظ الامتحان/)).toBeVisible();
    expect(['/app/assignments', '/app/answer-sheets']).toContain(pathname(page));
    // Demo data lives in memory, so go back through the app instead of reloading.
    await page.evaluate(() => {
      history.pushState({}, '', '/app/assignments');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByText('امتحان الفحص الآلي').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('saving an exam without a title explains what is missing', async ({ page }) => {
    await open(page, '/app/assignments/new');
    await page.getByRole('button', { name: 'حفظ الامتحان ومعايير التصحيح' }).click();
    await expect(toast(page, 'اكتب عنوان الامتحان أو الواجب')).toBeVisible();
    expect(pathname(page)).toBe('/app/assignments/new');
  });
});

test.describe('student submission link', () => {
  // A plain light-grey PNG, bright enough to pass the "photo too dark" check.
  const photo = { name: 'page1.png', mimeType: 'image/png', buffer: lightPng(64, 64) };

  test('never shows the list of student names', async ({ page }) => {
    await open(page, '/s/demo');
    for (const name of ['أحمد محمود المصري', 'مريم إياد النجار']) {
      await expect(page.getByText(name)).toHaveCount(0);
    }
  });

  test('a student sends a photo of their paper with their code', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/demo');
    await page.getByPlaceholder('••••').fill('1042');
    await page.locator('input[type=file]').first().setInputFiles(photo);
    const send = page.getByRole('button', { name: 'إرسال الورقة للمدرّس' }).first();
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText(/وصلت|تم استلام|شكراً/).first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test('a wrong student code is refused', async ({ page }) => {
    await open(page, '/s/demo');
    await page.getByPlaceholder('••••').fill('9999');
    await page.locator('input[type=file]').first().setInputFiles(photo);
    await page.getByRole('button', { name: 'إرسال الورقة للمدرّس' }).first().click();
    await expect(page.getByText('رمز الطالب غير صحيح').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('grading review', () => {
  test('teacher approves an answer and the high-confidence answers', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/review');
    await page.getByRole('button', { name: 'اعتمد الدرجة والملاحظة' }).click();
    await page.getByRole('button', { name: 'اعتمد كل الإجابات عالية الثقة' }).click();
    await expect(page.getByText(/اعتُمدت|لا توجد إجابات عالية الثقة/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('results screen opens the Moodle export', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/results');
    await page.getByRole('button', { name: 'تصدير لـ Moodle' }).click();
    await expect(page.getByText('تصدير العلامات إلى Moodle')).toBeVisible();
    await expect(page.getByText(/علامة جاهزة للتصدير/)).toBeVisible();
    await expect(page.getByRole('button', { name: /تنزيل ملف Moodle/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('platform admin', () => {
  test('sees the organization waiting for approval', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/admin');
    await page.getByRole('button', { name: 'راجعها الآن ←' }).click();
    await expect(page.getByText(/تنتظر|بانتظار/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('opens payments and invoices', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/admin/billing');
    await page.getByRole('button', { name: 'مراجعة' }).first().click();
    await expect(page.getByRole('button', { name: /تأكيد/ }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('adds a staff member with a role and chosen sections', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/admin/team');
    await page.getByRole('button', { name: 'إضافة عضو' }).click();
    await page.getByPlaceholder('0599123456').fill('0599777888');
    await page.getByPlaceholder(/سامي أحمد/).fill('ليلى للدعم');
    await page.getByRole('button', { name: /دعم فني/ }).click();
    await page.getByRole('checkbox', { name: /المناهج والكتب/ }).check();
    await page.getByRole('button', { name: 'إضافة العضو' }).click();
    await expect(page.getByText('ليلى للدعم')).toBeVisible();
    await expect(page.getByText('لم يدخل المنصة بعد')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('school owner', () => {
  test('invites a teacher', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/school/teachers');
    await page.getByRole('button', { name: /دعوة|إضافة معلم/ }).first().click();
    await page.getByPlaceholder(/اسم/).first().fill('أ. معلم الفحص');
    await page.getByPlaceholder(/059/).first().fill('0599111222');
    await page.getByRole('button', { name: /إرسال الدعوة|دعوة|حفظ/ }).last().click();
    expect(pathname(page)).toBe('/school/teachers');
    expect(errors).toEqual([]);
  });
});

test.describe('parent reports', () => {
  test('teacher previews the WhatsApp report text', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/app/reports');
    await expect(page.getByText(/واتساب/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});

function lightPng(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // 8 bits
  header.writeUInt8(0, 9); // greyscale
  const rows = Buffer.alloc((width + 1) * height, 220);
  for (let y = 0; y < height; y++) rows[y * (width + 1)] = 0; // no filter
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
