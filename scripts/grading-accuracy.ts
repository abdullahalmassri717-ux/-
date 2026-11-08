/**
 * Accuracy test: grade real papers with several Claude models and compare
 * every question with the teacher's own grade.
 *
 *   npx tsx scripts/grading-accuracy.ts grading-test
 *   npx tsx scripts/grading-accuracy.ts grading-test --models claude-haiku-5-5,claude-opus-5-5
 *
 * Folder layout (see scripts/grading-test-example/README.md):
 *   exam.json            questions, model answers and rubric
 *   teacher-scores.csv   paper,1,2,3...  (the teacher's score per question)
 *   papers/<paper>.jpg   one photo per paper, or papers/<paper>/ with one photo per page
 *
 * Writes results.md and results.csv into the same folder. Student papers are
 * private: keep the folder out of Git (grading-test/ is already ignored).
 */
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, parse } from 'node:path';
import {
  ClaudeGradingProvider,
  DEFAULT_GRADING_CONFIG,
  estimateCostUsd,
  type ExamToGrade,
  type PaperImage,
  type ProviderOutput,
} from '../supabase/functions/_shared/grading/index.ts';
import { effortForExam } from '../supabase/functions/_shared/grading/prompt.ts';

loadDotenv({ path: '.env.local' });
loadDotenv();

const DEFAULT_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES: Record<string, PaperImage['mediaType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface Paper {
  id: string;
  pages: PaperImage[];
}

interface Run {
  model: string;
  paperId: string;
  output?: ProviderOutput;
  costUsd: number;
  error?: string;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith('--')) ?? 'grading-test';
  const modelsIndex = args.indexOf('--models');
  const models = modelsIndex >= 0 ? args[modelsIndex + 1].split(',').map((m) => m.trim()) : DEFAULT_MODELS;
  return { folder, models };
}

function loadImage(path: string): PaperImage {
  const mediaType = MEDIA_TYPES[extname(path).toLowerCase()];
  if (!mediaType) fail(`Unsupported image type: ${path} (use jpg, png or webp)`);
  const bytes = readFileSync(path);
  if (bytes.length > MAX_IMAGE_BYTES) {
    fail(`${path} is larger than 5 MB. Resize it (about 1600px on the long side is enough) and try again.`);
  }
  return { data: bytes.toString('base64'), mediaType };
}

function loadPapers(folder: string): Paper[] {
  const dir = join(folder, 'papers');
  if (!existsSync(dir)) fail(`Missing folder ${dir}`);
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort()
    .map((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        const pages = readdirSync(full)
          .filter((f) => MEDIA_TYPES[extname(f).toLowerCase()])
          .sort()
          .map((f) => loadImage(join(full, f)));
        return { id: name, pages };
      }
      return { id: parse(name).name, pages: [loadImage(full)] };
    })
    .filter((p) => p.pages.length > 0);
}

function loadTeacherScores(folder: string): Map<string, Map<number, number>> {
  const path = join(folder, 'teacher-scores.csv');
  if (!existsSync(path)) fail(`Missing ${path}`);
  const [header, ...rows] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const questionNumbers = header.split(',').slice(1).map((h) => Number(h.replace(/[^\d]/g, '')));
  const scores = new Map<string, Map<number, number>>();
  for (const row of rows) {
    const [paperId, ...cells] = row.split(',').map((c) => c.trim());
    if (!paperId) continue;
    const perQuestion = new Map<number, number>();
    cells.forEach((cell, i) => {
      if (cell !== '') perQuestion.set(questionNumbers[i], Number(cell));
    });
    scores.set(paperId, perQuestion);
  }
  return scores;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

async function main() {
  const { folder, models } = parseArgs();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) fail('ANTHROPIC_API_KEY is not set. Add it to .env.local.');

  const exam = JSON.parse(readFileSync(join(folder, 'exam.json'), 'utf8')) as ExamToGrade;
  const papers = loadPapers(folder);
  const teacher = loadTeacherScores(folder);
  const missing = papers.filter((p) => !teacher.has(p.id)).map((p) => p.id);
  if (missing.length) fail(`No teacher scores for: ${missing.join(', ')}`);

  console.log(`Grading ${papers.length} paper(s) with ${models.join(', ')}…`);
  const provider = new ClaudeGradingProvider(apiKey);
  const effort = effortForExam(exam);
  const runs: Run[] = [];

  for (const model of models) {
    for (const paper of papers) {
      process.stdout.write(`  ${model} · ${paper.id} … `);
      try {
        const output = await provider.gradeOnce({ exam, pages: paper.pages }, model, { effort });
        const costUsd = estimateCostUsd(model, output.usage);
        runs.push({ model, paperId: paper.id, output, costUsd });
        console.log(`$${costUsd.toFixed(4)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        runs.push({ model, paperId: paper.id, costUsd: 0, error: message });
        console.log(`failed: ${message}`);
      }
    }
  }

  // "Cheap first, stronger only when unsure" — the strategy the platform uses.
  const { primaryModel, escalationModel } = DEFAULT_GRADING_CONFIG;
  const strategyName = `${primaryModel} → ${escalationModel} (عند الشك)`;
  if (models.includes(primaryModel) && models.includes(escalationModel)) {
    for (const paper of papers) {
      const cheap = runs.find((r) => r.model === primaryModel && r.paperId === paper.id)!;
      const strong = runs.find((r) => r.model === escalationModel && r.paperId === paper.id)!;
      const unsure = !cheap.output || cheap.output.questions.some((q) => q.confidence === 'low' || q.unreadable);
      runs.push({
        model: strategyName,
        paperId: paper.id,
        output: unsure ? strong.output : cheap.output,
        error: unsure ? strong.error : undefined,
        costUsd: cheap.costUsd + (unsure ? strong.costUsd : 0),
      });
    }
  }

  const csv: string[] = ['model,paper,question,teacher,ai,diff,confidence'];
  const summary: string[] = [];
  const allModels = [...new Set(runs.map((r) => r.model))];

  for (const model of allModels) {
    const modelRuns = runs.filter((r) => r.model === model);
    let total = 0;
    let exact = 0;
    let withinOne = 0;
    let absDiff = 0;
    let confidentButWrong = 0;
    let flagged = 0;
    for (const run of modelRuns) {
      const t = teacher.get(run.paperId)!;
      for (const [questionNumber, teacherScore] of t) {
        const q = run.output?.questions.find((x) => x.questionNumber === questionNumber);
        total += 1;
        if (!q) {
          csv.push(`${model},${run.paperId},${questionNumber},${teacherScore},,,error`);
          continue;
        }
        const diff = q.score - teacherScore;
        if (Math.abs(diff) < 0.01) exact += 1;
        if (Math.abs(diff) <= 1) withinOne += 1;
        absDiff += Math.abs(diff);
        if (q.confidence === 'high' && Math.abs(diff) > 1) confidentButWrong += 1;
        if (q.confidence !== 'high') flagged += 1;
        csv.push(`${model},${run.paperId},${questionNumber},${teacherScore},${q.score},${diff},${q.confidence}`);
      }
    }
    const cost = modelRuns.reduce((s, r) => s + r.costUsd, 0);
    const errors = modelRuns.filter((r) => r.error).length;
    summary.push(
      `| ${model} | ${pct(exact, total)} | ${pct(withinOne, total)} | ${(absDiff / Math.max(total, 1)).toFixed(2)} | ${confidentButWrong} | ${pct(flagged, total)} | ${errors} | $${cost.toFixed(4)} | $${(cost / Math.max(papers.length, 1)).toFixed(4)} |`,
    );
  }

  const report = [
    `# نتيجة تجربة الدقة`,
    ``,
    `الامتحان: ${exam.title} · عدد الأوراق: ${papers.length}`,
    ``,
    `| النموذج | تطابق تام | فرق علامة أو أقل | متوسط الفرق | واثق لكنه أخطأ | أُحيل للمراجعة | أخطاء | التكلفة الكلية | لكل ورقة |`,
    `|---|---|---|---|---|---|---|---|---|`,
    ...summary,
    ``,
    `- **واثق لكنه أخطأ:** أسئلة قال النموذج إنه متأكد منها وفرقها عن تصحيح المعلم أكثر من علامة. هذا أخطر رقم، لأن المعلم لا يراجعها عادةً.`,
    `- **أُحيل للمراجعة:** نسبة الأسئلة التي سيراجعها المعلم (ثقة متوسطة أو منخفضة).`,
    `- التفاصيل سؤالاً سؤالاً في results.csv.`,
  ].join('\n');

  writeFileSync(join(folder, 'results.md'), report + '\n');
  writeFileSync(join(folder, 'results.csv'), csv.join('\n') + '\n');
  console.log(`\n${report}\n\nSaved ${join(folder, 'results.md')} and results.csv`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
