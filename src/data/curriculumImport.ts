// Bulk import of a curriculum tree from a spreadsheet (Excel .xlsx, .csv, or cells
// pasted from Excel). One row per lesson or per learning outcome:
//   الصف | المادة | الوحدة | الدرس | ناتج التعلّم | محتوى الدرس
// Blank cells repeat the value from the row above (like merged cells in Excel), so
// a grade or subject only needs writing once. Whatever already exists is matched by
// name and skipped; only the missing parts are added.
import type { CCurriculum, CurriculumAdminApi } from './curriculumAdmin';

export const IMPORT_COLUMNS = ['الصف', 'المادة', 'الوحدة', 'الدرس', 'ناتج التعلّم', 'محتوى الدرس'] as const;
export const IMPORT_TEMPLATE_URL = '/curriculum-template.csv';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const key = (s: string) => norm(s).toLowerCase();

interface LessonIn {
  name: string;
  outcomes: string[];
  content: string;
}
interface UnitIn {
  name: string;
  lessons: Map<string, LessonIn>;
}
interface SubjectIn {
  name: string;
  units: Map<string, UnitIn>;
}
interface GradeIn {
  name: string;
  subjects: Map<string, SubjectIn>;
}

export interface ParsedImport {
  grades: Map<string, GradeIn>;
  /** Data rows read (header and empty rows not counted). */
  rows: number;
  /** Rows that could not be placed, with the reason (row numbers as in the sheet). */
  problems: string[];
}

export interface ImportSummary {
  grades: number;
  subjects: number;
  units: number;
  lessons: number;
  outcomes: number;
  /** Items in the file that already existed and were left as they are. */
  existing: number;
}

// ---------------------------------------------------------------------------
// Reading the input

/** Splits CSV text (quoted fields, "" escapes, commas or semicolons). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split('\n', 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Text pasted from Excel is tab-separated; anything else is read as CSV. */
export function rowsFromText(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  if (clean.includes('\t')) return clean.split(/\r?\n/).map((line) => line.split('\t'));
  return parseCsv(clean);
}

export async function rowsFromFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))));
  }
  if (name.endsWith('.xls')) {
    throw new Error('صيغة ‎.xls‎ القديمة غير مدعومة. احفظ الملف من Excel بصيغة ‎.xlsx‎ أو CSV.');
  }
  const bytes = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(bytes);
  // Excel on Windows saves "CSV" (not "CSV UTF-8") in the Arabic code page.
  if (text.includes('�')) text = new TextDecoder('windows-1256').decode(bytes);
  return rowsFromText(text);
}

// ---------------------------------------------------------------------------
// Building the tree from rows

const isHeader = (row: string[]) => /الصف|المرحلة|المادة/.test(row[0] ?? '') && /المادة|الوحدة/.test(row.slice(1).join(' '));

export function parseImportRows(input: string[][]): ParsedImport {
  const grades = new Map<string, GradeIn>();
  const problems: string[] = [];
  const carry: string[] = ['', '', '', ''];
  let rows = 0;

  input.forEach((raw, index) => {
    const cells = raw.map((c) => norm(String(c ?? '')));
    if (!cells.some(Boolean)) return;
    if (index === 0 && isHeader(cells)) return;
    rows++;
    const line = index + 1;

    // A value at one level starts a new branch: forget the levels below it.
    for (let lvl = 0; lvl < 4; lvl++) {
      if (cells[lvl]) {
        carry[lvl] = cells[lvl];
        for (let below = lvl + 1; below < 4; below++) carry[below] = '';
      }
    }
    const [g, s, u, l] = carry;
    const outcome = cells[4] ?? '';
    const content = cells[5] ?? '';

    const deepest = l ? 3 : u ? 2 : s ? 1 : g ? 0 : -1;
    const gap = [g, s, u, l].slice(0, deepest + 1).findIndex((v) => !v);
    if (deepest < 0 || gap !== -1) {
      problems.push(`السطر ${line}: ينقصه «${IMPORT_COLUMNS[Math.max(gap, 0)]}».`);
      return;
    }
    if ((outcome || content) && !l) {
      problems.push(`السطر ${line}: فيه ناتج تعلّم أو محتوى بدون اسم درس.`);
      return;
    }

    let grade = grades.get(key(g));
    if (!grade) grades.set(key(g), (grade = { name: g, subjects: new Map() }));
    if (!s) return;
    let subject = grade.subjects.get(key(s));
    if (!subject) grade.subjects.set(key(s), (subject = { name: s, units: new Map() }));
    if (!u) return;
    let unit = subject.units.get(key(u));
    if (!unit) subject.units.set(key(u), (unit = { name: u, lessons: new Map() }));
    if (!l) return;
    let lesson = unit.lessons.get(key(l));
    if (!lesson) unit.lessons.set(key(l), (lesson = { name: l, outcomes: [], content: '' }));
    if (outcome && !lesson.outcomes.some((o) => key(o) === key(outcome))) lesson.outcomes.push(outcome);
    if (content && !lesson.content) lesson.content = content;
  });

  return { grades, rows, problems };
}

// ---------------------------------------------------------------------------
// Comparing with what exists, and saving

const CHUNK = 400;

/**
 * Adds the parts of `parsed` that are not yet in `curriculum`.
 * With `api` null nothing is saved: it only counts what would be added (preview).
 */
export async function applyImport(
  parsed: ParsedImport,
  curriculum: CCurriculum,
  api: CurriculumAdminApi | null,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary = { grades: 0, subjects: 0, units: 0, lessons: 0, outcomes: 0, existing: 0 };
  let fakeId = 0;
  const total = { value: 0 };
  let done = 0;

  // Inserts one level for many parents at once; returns the id of every input node.
  async function addLevel(
    level: 'grade' | 'subject' | 'unit' | 'lesson',
    rows: { parentId: string; name: string; order: number; content?: string }[],
  ): Promise<string[]> {
    if (!api) return rows.map(() => `preview_${++fakeId}`);
    const ids: string[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const part = rows.slice(i, i + CHUNK);
      ids.push(...(await api.addMany(level, part)));
      done += part.length;
      onProgress?.(done, total.value);
    }
    return ids;
  }

  // Count what will be written first, so progress has a total.
  const preview = api ? await applyImport(parsed, curriculum, null) : null;
  if (preview) total.value = preview.grades + preview.subjects + preview.units + preview.lessons + preview.outcomes;

  // Grades
  const gradeJobs: { input: GradeIn; existing: CCurriculum['grades'][number] | null; id: string }[] = [];
  const newGrades: { parentId: string; name: string; order: number }[] = [];
  for (const input of parsed.grades.values()) {
    const ex = curriculum.grades.find((g) => key(g.name) === key(input.name)) ?? null;
    if (ex) summary.existing++;
    else newGrades.push({ parentId: curriculum.id, name: input.name, order: curriculum.grades.length + newGrades.length });
    gradeJobs.push({ input, existing: ex, id: ex?.id ?? '' });
  }
  summary.grades = newGrades.length;
  const gradeIds = await addLevel('grade', newGrades);
  gradeJobs.filter((j) => !j.existing).forEach((j, i) => (j.id = gradeIds[i]));

  // Subjects
  const subjectJobs: { input: SubjectIn; existing: CCurriculum['grades'][number]['subjects'][number] | null; id: string }[] = [];
  const newSubjects: { parentId: string; name: string; order: number }[] = [];
  for (const gj of gradeJobs) {
    const have = gj.existing?.subjects ?? [];
    let added = 0;
    for (const input of gj.input.subjects.values()) {
      const ex = have.find((s) => key(s.name) === key(input.name)) ?? null;
      if (ex) summary.existing++;
      else newSubjects.push({ parentId: gj.id, name: input.name, order: have.length + added++ });
      subjectJobs.push({ input, existing: ex, id: ex?.id ?? '' });
    }
  }
  summary.subjects = newSubjects.length;
  const subjectIds = await addLevel('subject', newSubjects);
  subjectJobs.filter((j) => !j.existing).forEach((j, i) => (j.id = subjectIds[i]));

  // Units
  type ExUnit = CCurriculum['grades'][number]['subjects'][number]['units'][number];
  const unitJobs: { input: UnitIn; existing: ExUnit | null; id: string }[] = [];
  const newUnits: { parentId: string; name: string; order: number }[] = [];
  for (const sj of subjectJobs) {
    const have = sj.existing?.units ?? [];
    let added = 0;
    for (const input of sj.input.units.values()) {
      const ex = have.find((u) => key(u.title) === key(input.name)) ?? null;
      if (ex) summary.existing++;
      else newUnits.push({ parentId: sj.id, name: input.name, order: have.length + added++ });
      unitJobs.push({ input, existing: ex, id: ex?.id ?? '' });
    }
  }
  summary.units = newUnits.length;
  const unitIds = await addLevel('unit', newUnits);
  unitJobs.filter((j) => !j.existing).forEach((j, i) => (j.id = unitIds[i]));

  // Lessons (new lessons carry their content in the same insert)
  type ExLesson = ExUnit['lessons'][number];
  const lessonJobs: { input: LessonIn; existing: ExLesson | null; id: string }[] = [];
  const newLessons: { parentId: string; name: string; order: number; content?: string }[] = [];
  const contentUpdates: { id: string; content: string }[] = [];
  for (const uj of unitJobs) {
    const have = uj.existing?.lessons ?? [];
    let added = 0;
    for (const input of uj.input.lessons.values()) {
      const ex = have.find((l) => key(l.title) === key(input.name)) ?? null;
      if (ex) {
        summary.existing++;
        if (input.content && !ex.hasContent) contentUpdates.push({ id: ex.id, content: input.content });
      } else newLessons.push({ parentId: uj.id, name: input.name, order: have.length + added++, content: input.content || undefined });
      lessonJobs.push({ input, existing: ex, id: ex?.id ?? '' });
    }
  }
  summary.lessons = newLessons.length;
  const lessonIds = await addLevel('lesson', newLessons);
  lessonJobs.filter((j) => !j.existing).forEach((j, i) => (j.id = lessonIds[i]));
  if (api) for (const c of contentUpdates) await api.setLessonContent(c.id, c.content);

  // Learning outcomes
  const newOutcomes: { lessonId: string; text: string; order: number }[] = [];
  for (const lj of lessonJobs) {
    const have = lj.existing?.outcomes ?? [];
    let added = 0;
    for (const text of lj.input.outcomes) {
      if (have.some((o) => key(o) === key(text))) summary.existing++;
      else newOutcomes.push({ lessonId: lj.id, text, order: have.length + added++ });
    }
  }
  summary.outcomes = newOutcomes.length;
  if (api) {
    for (let i = 0; i < newOutcomes.length; i += CHUNK) {
      const part = newOutcomes.slice(i, i + CHUNK);
      await api.addOutcomes(part);
      done += part.length;
      onProgress?.(done, total.value);
    }
  }

  return summary;
}
