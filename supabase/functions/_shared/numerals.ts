// How numbers are written in a subject's textbook. This is curriculum data
// (subjects.numerals), set per subject by the platform admin, never by grade
// or subject names in code.
//
// - arabic: Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and Arabic symbols (س، ص). In the
//   Palestinian curriculum: every subject in grades 1–9, and mathematics up to
//   Tawjihi.
// - latin: Western digits (0123456789) and Latin symbols (x, m/s, H₂O). In the
//   Palestinian curriculum: English, and the sciences from grade 10/11 up.
//
// Plain TypeScript (no Deno APIs), so the same code runs anywhere.

export type Numerals = 'arabic' | 'latin';

export function asNumerals(v: unknown): Numerals {
  return v === 'latin' ? 'latin' : 'arabic';
}

const AR = '٠١٢٣٤٥٦٧٨٩';
const FA = '۰۱۲۳۴۵۶۷۸۹';
const VARS: Record<string, string> = { x: 'س', y: 'ص', z: 'ع', a: 'أ', b: 'ب', c: 'ج' };

/** One instruction for the model, in Arabic, matching the subject's textbook. */
export function numeralsInstruction(n: Numerals): string {
  return n === 'latin'
    ? 'الأرقام والرموز: اكتب كل الأرقام بالأرقام الإنجليزية (0 1 2 3 4 5 6 7 8 9) والرموز والوحدات والمعادلات بالحروف اللاتينية (مثل x وm/s وH2O)، كما في كتاب هذه المادة، مع بقاء الكلام بالعربية.'
    : 'الأرقام والرموز: اكتب كل الأرقام بالأرقام العربية (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩) لا الإنجليزية، والرموز والمتغيرات بالحروف العربية كما في كتاب هذه المادة (س، ص، ع، أ/ب، ق(س)، جا، جتا، لو)، ولا تستخدم x أو y أو a/b أبداً. الصيغ الكيميائية مثل H2O تبقى كما هي.';
}

/**
 * Writes the digits of a text the way the subject's book does. Arabic: a digit
 * touching a Latin letter stays as it is (H2O, CO2, x2, m/s2), and so do links.
 * Latin: Arabic-Indic and Persian digits become Western, ٫ becomes a point.
 */
export function applyNumerals(text: string, n: Numerals): string {
  if (!text) return text;
  if (n === 'latin') {
    return text
      .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
      .replace(/(?<=\d)٫(?=\d)/g, '.');
  }
  return text
    .split(/(https?:\/\/\S+)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : // Single lowercase Latin variables (x, y, a/b) become the Arabic ones the book uses.
          // A number inside a Latin word or formula (H2O, CO2, 5kg) is left alone.
          part
            .replace(/(?<![A-Za-z])f\(/g, 'ق(')
            .replace(/(?<![A-Za-z])g\(/g, 'هـ(')
            .replace(/(?<![A-Za-z])[xyzabc](?![A-Za-z])/g, (v) => VARS[v])
            .replace(/(?<![A-Za-z\d.])\d+(?:\.\d+)?(?![A-Za-z\d])/g, (run) =>
            run.replace(/\d/g, (d) => AR[Number(d)]).replace('.', '٫'),
          ),
    )
    .join('');
}
