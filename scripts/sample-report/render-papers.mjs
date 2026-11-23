// Draws made-up photos of the sample student's papers (one page each): the
// original answer sheet, and the same sheet corrected in red pen (✓ ✗, marks,
// teacher's note). Used only by .github/workflows/sample-report.yml.
// Usage: node render-papers.mjs <papers.json> <out dir>
// Writes <out>/<submission id>.jpg and <out>/<submission id>-corrected.jpg
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , input, out] = process.argv;
const papers = JSON.parse(readFileSync(input, 'utf8'));
mkdirSync(out, { recursive: true });

// A plausible handwritten answer for each question, by subject (all made up).
const ANSWERS = {
  'الرياضيات': [
    'ق(−س) = (−س)² + ٣ = س² + ٣ = ق(س)\nإذن الاقتران زوجي ومتماثل حول محور الصادات',
    'ق(س) = (س − ٢)² : نسحب منحنى س² وحدتين لليمين\nرأس المنحنى (٢ ، ٠)',
    'هـ(س) = −ق(س) انعكاس حول محور السينات\n(لم يكمل الرسم)',
  ],
  'اللغة العربية': [
    'الحالُ: «مبتسماً» منصوبٌ وعلامةُ نصبِه تنوينُ الفتح',
    'جاءَ الطالبُ مسرعاً ← «مسرعاً» حالٌ مفردة',
    'الحال جملة: «وهو يضحك» في محل نصب حال',
  ],
  'اللغة الإنجليزية': [
    'I usually play football with my friends on Friday.',
    'Yesterday I visit my grandmother and we talk a lot.',
    'Dear Sami, how are you? I am writing to tell you about my new school.',
  ],
  'الفيزياء': [
    'الكميات الأساسية: الطول، الكتلة، الزمن\nالوحدات: م ، كغ ، ث',
    'المسافة = ٢٠ م ، الإزاحة = ١٢ م شرقاً\nالسرعة = ٢٠ ÷ ٤ = ٥ م/ث',
  ],
  'الكيمياء': [
    'أشعة المهبط تتكون من جسيمات سالبة الشحنة (إلكترونات)',
    'نموذج رذرفورد: الذرة معظمها فراغ وفي مركزها نواة موجبة',
  ],
  'التربية الإسلامية': [
    'من وجوه إعجاز القرآن: الإعجاز البياني والعلمي والتشريعي\nقال تعالى: «قل لئن اجتمعت الإنس والجن...»',
  ],
};

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = (n) => String(Number(Number(n).toFixed(2)));

function html(p, corrected) {
  const answers = ANSWERS[p.subject] ?? [];
  const latin = p.subject === 'اللغة الإنجليزية';
  const qs = p.questions
    .map((q, i) => {
      const ok = Number(q.score) >= Number(q.max) * 0.7;
      const mark = corrected
        ? `<div class="mark ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</div>
           <div class="score">${num(q.score)}/${num(q.max)}</div>`
        : '';
      const note = corrected && q.note ? `<div class="note">${esc(q.note)}</div>` : '';
      return `<div class="q">
        <div class="qt">السؤال ${q.n}: ${esc(q.lesson ?? '')} <span class="pts">(${num(q.max)} علامات)</span></div>
        <div class="ans ${latin ? 'latin' : ''}">${esc(answers[i] ?? 'الإجابة ...').replace(/\n/g, '<br>')}</div>
        ${mark}${note}
      </div>`;
    })
    .join('');
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Caveat:wght@500&display=block" rel="stylesheet">
<style>
  body { margin: 0; background: #fff; }
  .page { width: 760px; min-height: 760px; padding: 36px 44px; box-sizing: border-box; font-family: 'Noto Naskh Arabic', serif;
          background: repeating-linear-gradient(#fdfcf7 0 37px, #c9d8ea 37px 38px); position: relative; color: #1b2a44; }
  .page::before { content: ''; position: absolute; top: 0; bottom: 0; right: 30px; width: 2px; background: #e8a3a3; }
  .head { display: flex; justify-content: space-between; font-weight: 700; font-size: 17px; border-bottom: 2px solid #1b2a44; padding-bottom: 8px; margin-bottom: 18px; }
  .hand { font-family: 'Aref Ruqaa', serif; color: #1c3d8f; font-size: 22px; }
  .q { position: relative; margin-bottom: 26px; padding-left: 110px; }
  .qt { font-weight: 700; font-size: 16px; }
  .pts { font-weight: 400; color: #555; font-size: 13px; }
  .ans { font-family: 'Aref Ruqaa', serif; color: #1c3d8f; font-size: 23px; line-height: 38px; margin-top: 4px; }
  .ans.latin { font-family: 'Caveat', cursive; direction: ltr; text-align: left; font-size: 27px; }
  .mark { position: absolute; left: 8px; top: 2px; font-size: 54px; line-height: 1; font-weight: 700; transform: rotate(-8deg); }
  .mark.ok { color: #d11; } .mark.bad { color: #d11; }
  .score { position: absolute; left: 58px; top: 14px; color: #d11; font-family: 'Caveat', cursive; font-size: 28px; direction: ltr; }
  .note { font-family: 'Aref Ruqaa', serif; color: #d11; font-size: 21px; margin-top: 2px; transform: rotate(-1.5deg); }
</style></head><body><div class="page">
  <div class="head"><span>${esc(p.subject)} · ${esc(p.title)}</span><span>${esc(p.date)}</span></div>
  <div style="margin-bottom:16px;font-weight:700">الاسم: <span class="hand">أحمد خالد النجار</span>
    &nbsp;&nbsp; الصف: <span class="hand">العاشر (أ)</span></div>
  ${qs}
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1.5 });
for (const p of papers) {
  for (const corrected of [false, true]) {
    await page.setContent(html(p, corrected), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = `${out}/${p.sub}${corrected ? '-corrected' : ''}.jpg`;
    await page.locator('.page').screenshot({ path: file, type: 'jpeg', quality: 82 });
    console.log('drew', file);
  }
}
await browser.close();
