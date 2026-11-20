// Reads a student list the way teachers really keep it in Excel: any column
// order, with or without a header row, the grade as a number ("9") or a word
// ("التاسع"), the section in its own column or joined to the grade ("9/أ"),
// and phone numbers written in many ways.
//
// Two steps:
//   1. guessColumns() decides what each column holds (name, phone, grade, ...),
//      from its header or, when there is none, from what the cells look like.
//      When it is not sure, the screen asks the AI to read the first rows and
//      say what each column is (see aiMapStudentColumns), and the teacher can
//      still change any column by hand in the preview.
//   2. applyColumns() turns the rows into students using that column map.

export interface ImportedStudent {
  name: string;
  parentPhone: string;
  studentPhone: string;
  /** Grade + section (+ any other class info), e.g. "الصف التاسع – شعبة 1". Empty when the file has none. */
  classLabel: string;
  /** Grade number (1–12) when the file says it, else null. */
  grade: number | null;
  /** Section as written, e.g. "1" or "أ". Empty when the file has none. */
  section: string;
}

/** What a column holds. "class" is any other class information, such as the stage. */
export type ColumnRole = 'name' | 'parentPhone' | 'studentPhone' | 'grade' | 'section' | 'class' | 'ignore';

export const COLUMN_ROLES: { role: ColumnRole; label: string }[] = [
  { role: 'name', label: 'اسم الطالب' },
  { role: 'grade', label: 'الصف' },
  { role: 'section', label: 'الشعبة' },
  { role: 'parentPhone', label: 'جوال ولي الأمر' },
  { role: 'studentPhone', label: 'جوال الطالب' },
  { role: 'class', label: 'معلومة صف أخرى (مثل المرحلة)' },
  { role: 'ignore', label: 'تجاهل هذا العمود' },
];

export interface ColumnMap {
  /** Index of the header row, or -1 when the file has no header. */
  headerRow: number;
  roles: ColumnRole[];
}

const toLatinDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const digitsOf = (cell: string) => toLatinDigits(cell).replace(/\D/g, '');

/** A Palestinian / Israeli mobile number in any usual form: 059…, 59…, 970 59…, +972 56…, 00970… */
const isMobile = (cell: string) => {
  const c = toLatinDigits(cell).trim();
  if (!/^[+\d][\d\s\-().]*$/.test(c)) return false;
  return /^(00)?(970|972)?0?5\d{8}$/.test(digitsOf(c));
};

/** Any phone-like number (9–15 digits). Used only together with a phone header. */
const looksLikePhone = (cell: string) => {
  const c = toLatinDigits(cell).trim();
  const n = digitsOf(c).length;
  return /^[+\d][\d\s\-().]*$/.test(c) && n >= 9 && n <= 15;
};

/** Cleans a phone number: Latin digits only, and puts back the 0 that Excel drops ("599…" → "0599…"). */
export function cleanPhone(cell: string): string {
  const c = toLatinDigits(cell ?? '').trim();
  if (!c) return '';
  const plus = c.startsWith('+') ? '+' : '';
  let d = digitsOf(c);
  if (/^5\d{8}$/.test(d)) d = `0${d}`;
  return plus + d;
}

const NAME_HEAD = /اسم|الإسم|name/i;
const PARENT_HEAD = /ولي|الأب|الاب|الأم|الام|الأهل|الاهل|parent|guardian|father|mother/i;
const PHONE_HEAD = /جوال|هاتف|موبايل|واتس|تلفون|تليفون|phone|mobile|whats|tel/i;
const STUDENT_HEAD = /طالب|student/i;
const SECTION_HEAD = /شعب|section|division|فصل|الفوج|فوج/i;
const GRADE_HEAD = /صف|grade|class|مستوى|level/i;
const STAGE_HEAD = /مرحل|stage/i;
const ID_HEAD = /هوي|^id$|identity|رقم الطالب|رقم الجلوس|الرقم المدرسي|serial|^م$|^#$|^ت$|^الرقم$|^رقم$|^no\.?$|التسلسل|تسلسل/i;

/** Splits pasted text (tab, comma or semicolon separated) into cells. */
export function textToRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,|؛|;/).map((c) => c.trim().replace(/^"|"$/g, '').trim()))
    .filter((cells) => cells.some((c) => c));
}

/** A header cell on its own, e.g. "الصف" or "المرحلة" (a data cell would be "الصف 7"). */
const CLASS_HEAD_ALONE = /^(ال)?(صف|مرحلة|مرحله|شعبة|شعبه|فصل|فوج)$|^(class|grade|stage|section)$/i;

function isHeaderRow(cells: string[]): boolean {
  // Headers have no long numbers; data rows usually have a phone or a grade number.
  if (cells.some((c) => /\d{3,}|[٠-٩]{3,}/.test(c))) return false;
  if (cells.some((c) => /^\s*[\d٠-٩]{1,2}\s*$/.test(c))) return false;
  return cells.some(
    (c) =>
      c.length <= 30 &&
      (NAME_HEAD.test(c) || PHONE_HEAD.test(c) || PARENT_HEAD.test(c) || CLASS_HEAD_ALONE.test(c.trim()) || /^(م|#)$/.test(c.trim())),
  );
}

// ---------------------------------------------------------------------------
// Grade and section values

const ORDINALS: [RegExp, number][] = [
  [/حادي\s*عشر|حاديه?\s*عشر/, 11],
  [/ثاني\s*عشر|ثانيه?\s*عشر|توجيهي|إنجاز|انجاز/, 12],
  [/عاشر/, 10],
  [/(^|[\sال])(أول|اول|أولى|اولى)/, 1],
  [/(^|[\sال])(ثاني|ثانية|ثانيه)/, 2],
  [/ثالث/, 3],
  [/رابع/, 4],
  [/خامس/, 5],
  [/سادس/, 6],
  [/سابع/, 7],
  [/ثامن/, 8],
  [/تاسع/, 9],
];

/** A grade written as a word on its own: "التاسع", "تاسع", "الحادي عشر", "الثاني عشر علمي". */
const GRADE_WORD_ONLY = /^(ال)?(أول|اول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر|حادي عشر|توجيهي)(\s+عشر)?(\s+\S+)?$/;

const GRADE_WORDS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];

/** "الصف التاسع" for 9. */
export const gradeName = (n: number) => `الصف ${GRADE_WORDS[n] ?? n}`;

/** The grade number in a class or grade name: "الصف 7" → 7, "الصف السابع الأساسي" → 7, "9" → 9. */
export function gradeNumber(text: string): number | null {
  // Prefer the part that says "صف" (the stage part may hold another ordinal).
  const part = text.split(/\s[–-]\s|،|\|/).find((p) => /صف|grade|class/i.test(p)) ?? text;
  const digits = toLatinDigits(part).match(/\d{1,2}/);
  if (digits) {
    const n = Number(digits[0]);
    return n >= 1 && n <= 12 ? n : null;
  }
  for (const [re, n] of ORDINALS) if (re.test(part)) return n;
  return null;
}

/** A section value on its own: "1", "شعبة 2", "أ", "B". */
const SECTION_VALUE = /^(شعبة|شعبه|section|فصل)?\s*([\d٠-٩]{1,2}|[أ-ي]|[a-z])$/i;
const sectionOf = (cell: string) => {
  const m = toLatinDigits(cell.trim()).match(SECTION_VALUE);
  return m ? m[2] : cell.trim();
};

/** "9/1", "9-أ", "التاسع أ", "الصف التاسع (2)", "تاسع ب" → grade 9 and section. */
function splitCombined(cell: string): { grade: number | null; section: string } {
  const c = toLatinDigits(cell.trim());
  const num = c.match(/^(?:الصف\s*)?(\d{1,2})\s*[/\\\-–.،,_ ]\s*(?:شعبة\s*)?(\d{1,2}|[أ-ي]|[a-z])\)?$/i);
  if (num) return { grade: gradeNumber(num[1]), section: num[2] };
  const word = c.match(/^(.*?)[\s/\-–(]+(?:شعبة\s*)?(\d{1,2}|[أ-ي]|[a-z])\)?$/i);
  if (word) {
    const g = gradeNumber(word[1]);
    if (g !== null) return { grade: g, section: word[2] };
  }
  return { grade: gradeNumber(c), section: '' };
}

// ---------------------------------------------------------------------------
// Guessing the columns

export interface ColumnGuess {
  map: ColumnMap;
  /** False when a column could not be placed with confidence: the screen then asks the AI. */
  confident: boolean;
}

export function guessColumns(rows: string[][]): ColumnGuess {
  const width = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
  const headerRow = rows.slice(0, 3).findIndex(isHeaderRow);
  const header = headerRow >= 0 ? rows[headerRow] : [];
  const body = rows.slice(headerRow + 1).filter((r) => r.some((c) => c));
  const head = (i: number) => (header[i] ?? '').trim();
  const values = (i: number) => body.map((r) => (r[i] ?? '').trim()).filter(Boolean);
  const share = (i: number, test: (c: string) => boolean) => {
    const v = values(i);
    return v.length ? v.filter(test).length / v.length : 0;
  };
  const isInt = (c: string) => /^\d{1,4}$/.test(toLatinDigits(c));
  const roles: ColumnRole[] = Array(width).fill('ignore');
  let sure = true;
  const unsure: number[] = [];

  for (let i = 0; i < width; i++) {
    const v = values(i);
    if (!v.length) continue;
    const h = head(i);
    const mobile = share(i, isMobile);
    const phoneish = share(i, looksLikePhone);
    const distinct = new Set(v).size;

    // Serial numbers and ID numbers: not students' data we keep.
    if (h && ID_HEAD.test(h) && !PHONE_HEAD.test(h)) continue;
    if (share(i, isInt) >= 0.9 && mobile < 0.6) {
      const nums = v.map((c) => Number(toLatinDigits(c)));
      const counting = nums.length >= 3 && nums.every((n, k) => k === 0 || n === nums[k - 1] + 1);
      if (distinct > 12 || counting) continue;
    }

    if (mobile >= 0.6 || (phoneish >= 0.6 && PHONE_HEAD.test(h))) {
      roles[i] = STUDENT_HEAD.test(h) && !PARENT_HEAD.test(h) ? 'studentPhone' : 'parentPhone';
      continue;
    }
    if (h) {
      if (NAME_HEAD.test(h) && !PARENT_HEAD.test(h) && !GRADE_HEAD.test(h) && !SECTION_HEAD.test(h) && !STAGE_HEAD.test(h)) {
        roles[i] = 'name';
        continue;
      }
      if ((GRADE_HEAD.test(h) || SECTION_HEAD.test(h)) && share(i, (c) => splitCombined(c).section !== '' && splitCombined(c).grade !== null) >= 0.6) {
        // "الصف" or "الصف والشعبة" holding "9/1" or "التاسع أ": grade and section together.
        roles[i] = 'class';
        continue;
      }
      if (SECTION_HEAD.test(h)) {
        roles[i] = 'section';
        continue;
      }
      if (STAGE_HEAD.test(h)) {
        roles[i] = 'class';
        continue;
      }
      if (GRADE_HEAD.test(h)) {
        roles[i] = 'grade';
        continue;
      }
      if (PHONE_HEAD.test(h)) {
        roles[i] = STUDENT_HEAD.test(h) && !PARENT_HEAD.test(h) ? 'studentPhone' : 'parentPhone';
        sure = false;
        continue;
      }
    }
    // No useful header: judge by the cells.
    if (share(i, (c) => SECTION_VALUE.test(toLatinDigits(c)) && !/^\d+$/.test(c)) >= 0.8 && distinct <= 15) {
      roles[i] = 'section';
    } else if (share(i, (c) => gradeNumber(c) !== null && splitCombined(c).section !== '') >= 0.8) {
      roles[i] = 'class';
    } else if (share(i, (c) => !STAGE_HEAD.test(c) && gradeNumber(c) !== null && (isInt(c) || /صف|grade/i.test(c) || GRADE_WORD_ONLY.test(c.trim()))) >= 0.8 && distinct <= 12) {
      roles[i] = 'grade';
      if (share(i, isInt) > 0.5) unsure.push(i);
    } else if (share(i, isInt) >= 0.8 && distinct <= 15) {
      roles[i] = 'section';
      unsure.push(i);
    } else {
      roles[i] = 'class';
      unsure.push(i);
    }
  }

  // Two number columns with no header ("9" and "1"): the first is the grade, the second the section.
  const numberCols = unsure.filter((i) => roles[i] === 'grade' || roles[i] === 'section');
  if (numberCols.length >= 2) {
    roles[numberCols[0]] = 'grade';
    roles[numberCols[1]] = 'section';
    sure = false;
  } else if (numberCols.length === 1 && !roles.includes('grade') && roles[numberCols[0]] === 'section') {
    // A lone small number column is more likely the grade, but we are not sure.
    sure = false;
  }

  // Name column: by header, else the text column whose values are most varied
  // (every student has a different name, while stage and grade repeat).
  if (!roles.includes('name')) {
    const textCols = roles.map((r, i) => (r === 'class' ? i : -1)).filter((i) => i >= 0);
    const score = (i: number) => {
      const v = values(i);
      const words = v.reduce((n, c) => n + c.split(/\s+/).length, 0) / Math.max(v.length, 1);
      return new Set(v).size * 10 + words;
    };
    const best = textCols.sort((a, b) => score(b) - score(a))[0];
    if (best !== undefined) {
      roles[best] = 'name';
      if (headerRow < 0 || unsure.filter((i) => i !== best && roles[i] === 'class').length) sure = false;
    } else sure = false;
  } else if (unsure.some((i) => roles[i] === 'class')) {
    sure = false;
  }

  // Two parent phone columns: the second is most likely the student's own.
  const parentCols = roles.map((r, i) => (r === 'parentPhone' ? i : -1)).filter((i) => i >= 0);
  if (parentCols.length > 1 && !roles.includes('studentPhone')) {
    const studentCol = parentCols.find((i) => STUDENT_HEAD.test(head(i)) && !PARENT_HEAD.test(head(i))) ?? parentCols[1];
    roles[studentCol] = 'studentPhone';
  }
  if (!roles.includes('parentPhone') && roles.includes('studentPhone')) {
    roles[roles.indexOf('studentPhone')] = 'parentPhone';
  }

  return { map: { headerRow, roles }, confident: sure && roles.includes('name') };
}

// ---------------------------------------------------------------------------
// Reading the students with a column map

export function applyColumns(rows: string[][], map: ColumnMap): ImportedStudent[] {
  const body = rows.slice(map.headerRow + 1);
  const cols = (role: ColumnRole) => map.roles.map((r, i) => (r === role ? i : -1)).filter((i) => i >= 0);
  const nameCols = cols('name');
  if (!nameCols.length) return [];
  const [parentCol] = cols('parentPhone');
  const [studentCol] = cols('studentPhone');
  const [gradeCol] = cols('grade');
  const [sectionCol] = cols('section');
  const classCols = cols('class');
  const cell = (r: string[], i: number | undefined) => (i === undefined ? '' : (r[i] ?? '').trim());

  return body
    .map((r) => {
      let grade = gradeCol === undefined ? null : gradeNumber(cell(r, gradeCol));
      let section = sectionCol === undefined ? '' : sectionOf(cell(r, sectionCol));
      // Label parts in the file's own column order, with grade and section written the same way every time.
      const parts: { col: number; text: string }[] = [];
      for (const i of classCols) {
        const v = cell(r, i);
        if (!v) continue;
        const split = splitCombined(v);
        if (grade === null && split.grade !== null && (split.section || gradeCol === undefined) && !STAGE_HEAD.test(v)) {
          grade = split.grade;
          if (!section) section = split.section;
          continue;
        }
        parts.push({ col: i, text: v });
      }
      const gradeText = grade !== null ? gradeName(grade) : cell(r, gradeCol);
      if (gradeText) parts.push({ col: gradeCol ?? classCols[0] ?? 0, text: gradeText });
      if (section) parts.push({ col: (sectionCol ?? gradeCol ?? classCols[0] ?? 0) + 0.5, text: `شعبة ${section}` });
      parts.sort((a, b) => a.col - b.col);
      return {
        name: nameCols.map((i) => cell(r, i)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        parentPhone: cleanPhone(cell(r, parentCol)),
        studentPhone: cleanPhone(cell(r, studentCol)),
        classLabel: parts.map((p) => p.text).join(' – '),
        grade,
        section,
      };
    })
    .filter((s) => s.name && !looksLikePhone(s.name) && !/^\d+$/.test(s.name) && !(NAME_HEAD.test(s.name) && s.name.length <= 15));
}

/** Guess the columns and read the students in one go. */
export function parseStudentTable(rows: string[][]): ImportedStudent[] {
  return applyColumns(rows, guessColumns(rows).map);
}

// Words that describe a column or a class. Every other word (names!) is hidden before the AI sees the file.
const KEEP_WORD =
  /^(و?ال)?(اسم|إسم|طالب|طالبة|ولي|أمر|امر|أب|اب|أم|ام|أهل|اهل|جوال|هاتف|موبايل|رقم|واتس|واتساب|تلفون|صف|شعبة|شعبه|فصل|فوج|مرحلة|مرحله|مستوى|هوية|جلوس|تسلسل|أساسي|اساسي|ثانوي|علمي|أدبي|ادبي|صناعي|ريادي|شرعي|زراعي|مهني|توجيهي|أول|اول|أولى|اولى|ثاني|ثانية|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر|ثالثة|رابعة|خامسة|سادسة|سابعة|ثامنة|تاسعة|عاشرة|ثالثه|رابعه|خامسه|سادسه|سابعه|ثامنه|تاسعه|عاشره|حادي|عشر|الأمر)$|^(name|student|parent|guardian|father|mother|phone|mobile|whatsapp|tel|class|grade|stage|section|level|id|no\.?)$/i;

function maskCell(cell: string): string {
  const c = toLatinDigits(String(cell ?? '')).trim().slice(0, 60);
  const digits = c.replace(/\D/g, '');
  // A phone or ID number: keep only how it starts and how long it is.
  if (digits.length >= 5) return (c.startsWith('+') ? '+' : '') + digits.slice(0, 3) + '#'.repeat(digits.length - 3);
  return c
    .split(/(\s+|[/\\\-–().,،:+])/)
    .map((w) => {
      if (!w.trim() || /^(\s+|[/\\\-–().,،:+])$/.test(w)) return w;
      if (/^\d+$/.test(w)) return w.length <= 2 ? w : w.slice(0, 3) + '#'.repeat(w.length - 3);
      if (w.length === 1 || KEEP_WORD.test(w)) return w;
      return '•';
    })
    .join('');
}

/**
 * The first rows of the file for the AI to look at, with names hidden ("•" per
 * word) and long numbers cut to their first 3 digits ("059#######"). Headers,
 * grades and sections stay readable, and that is all the AI needs to tell the
 * columns apart. No student's name or phone number leaves the browser.
 */
export function sampleForAi(rows: string[][], count = 8): string[][] {
  return rows.slice(0, count).map((r) => r.slice(0, 15).map(maskCell));
}

/** Checks a column map that came back from the AI, so a bad answer can't break the screen. */
export function validColumnMap(raw: unknown, width: number): ColumnMap | null {
  const m = raw as { headerRow?: unknown; roles?: unknown } | null;
  if (!m || !Array.isArray(m.roles)) return null;
  const ok = new Set(COLUMN_ROLES.map((r) => r.role));
  const roles = Array.from({ length: width }, (_, i) => {
    const r = (m.roles as unknown[])[i];
    return typeof r === 'string' && ok.has(r as ColumnRole) ? (r as ColumnRole) : 'ignore';
  });
  if (!roles.includes('name')) return null;
  const headerRow = typeof m.headerRow === 'number' && m.headerRow >= -1 && m.headerRow <= 2 ? Math.floor(m.headerRow) : -1;
  return { headerRow, roles };
}

/** The different classes in the file, in the order they first appear, with how many students each has. */
export function classesIn(students: ImportedStudent[]): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const s of students) if (s.classLabel) m.set(s.classLabel, (m.get(s.classLabel) ?? 0) + 1);
  return [...m].map(([label, count]) => ({ label, count }));
}
