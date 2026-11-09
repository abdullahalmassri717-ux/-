// Reads a student list the way teachers really keep it in Excel: any column
// order, with or without a header row, sometimes with extra columns such as
// stage, grade or section. We find the name and phone columns by their header
// or, when there is none, by what the cells look like.

export interface ImportedStudent {
  name: string;
  parentPhone: string;
  studentPhone: string;
  /** Stage / grade / section values joined, e.g. "المرحلة الرابعة – الصف 7". Empty when the file has none. */
  classLabel: string;
}

const toLatinDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const looksLikePhone = (cell: string) => {
  const c = toLatinDigits(cell).trim();
  return /^[+\d][\d\s\-()]*$/.test(c) && c.replace(/\D/g, '').length >= 9 && c.replace(/\D/g, '').length <= 15;
};

const NAME_HEAD = /اسم|الإسم|name/i;
const PARENT_HEAD = /ولي|الأب|الاب|الأم|الام|الأهل|الاهل|parent|guardian|father|mother/i;
const PHONE_HEAD = /جوال|هاتف|موبايل|رقم|واتس|تلفون|phone|mobile|whats|tel/i;
const CLASS_HEAD = /صف|مرحلة|المرحله|شعبة|شعبه|فصل|الفوج|class|grade|stage|section/i;

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
  // Headers have no numbers; data rows usually have a phone or a grade number.
  if (cells.some((c) => /\d|[٠-٩]/.test(c))) return false;
  return cells.some((c) => c.length <= 30 && (NAME_HEAD.test(c) || PHONE_HEAD.test(c) || PARENT_HEAD.test(c) || CLASS_HEAD_ALONE.test(c.trim())));
}

export function parseStudentTable(rows: string[][]): ImportedStudent[] {
  if (!rows.length) return [];
  const width = Math.max(...rows.map((r) => r.length));
  const headerIdx = rows.slice(0, 3).findIndex(isHeaderRow);
  const header = headerIdx >= 0 ? rows[headerIdx] : [];
  const body = rows.slice(headerIdx + 1).filter((r) => r.some((c) => c));
  const cols = Array.from({ length: width }, (_, i) => i);
  const filled = (i: number) => body.map((r) => r[i] ?? '').filter((c) => c);
  const phoneShare = (i: number) => {
    const v = filled(i);
    return v.length ? v.filter(looksLikePhone).length / v.length : 0;
  };
  const head = (i: number) => header[i] ?? '';

  // Phone columns are found by what is in them; the header only says whose phone it is.
  const phoneCols = cols.filter((i) => phoneShare(i) >= 0.6);
  const textCols = cols.filter((i) => !phoneCols.includes(i) && filled(i).length);

  // Name column: a header that says "name", else the text column whose values are most varied
  // (every student has a different name, while stage and grade repeat).
  let nameCol = textCols.find((i) => NAME_HEAD.test(head(i)) && !PARENT_HEAD.test(head(i)) && !CLASS_HEAD.test(head(i)));
  if (nameCol === undefined) {
    const score = (i: number) => {
      const v = filled(i);
      const distinct = new Set(v).size;
      const words = v.reduce((n, c) => n + c.split(/\s+/).length, 0) / Math.max(v.length, 1);
      return distinct * 10 + words;
    };
    nameCol = textCols.filter((i) => !CLASS_HEAD.test(head(i))).sort((a, b) => score(b) - score(a))[0] ?? textCols[0];
  }
  if (nameCol === undefined) return [];

  const parentCol = phoneCols.find((i) => PARENT_HEAD.test(head(i))) ?? phoneCols.find((i) => !/طالب|student/i.test(head(i))) ?? phoneCols[0];
  const studentCol = phoneCols.find((i) => i !== parentCol);
  const classCols = textCols.filter((i) => i !== nameCol);

  return body
    .map((r) => ({
      name: (r[nameCol!] ?? '').replace(/\s+/g, ' ').trim(),
      parentPhone: parentCol === undefined ? '' : toLatinDigits(r[parentCol] ?? '').trim(),
      studentPhone: studentCol === undefined ? '' : toLatinDigits(r[studentCol] ?? '').trim(),
      classLabel: classCols.map((i) => (r[i] ?? '').trim()).filter(Boolean).join(' – '),
    }))
    .filter((s) => s.name && !looksLikePhone(s.name) && !(NAME_HEAD.test(s.name) && s.name.length <= 15));
}

/** The different classes in the file, in the order they first appear, with how many students each has. */
export function classesIn(students: ImportedStudent[]): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const s of students) if (s.classLabel) m.set(s.classLabel, (m.get(s.classLabel) ?? 0) + 1);
  return [...m].map(([label, count]) => ({ label, count }));
}
