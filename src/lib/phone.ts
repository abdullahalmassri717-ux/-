// Phone numbers are stored in international form (E.164), e.g. +970599123456.
// Teachers usually type the local form (0599123456), so we convert it using the
// default country code from settings.

const DEFAULT_COUNTRY_CODE = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970').replace(/\D/g, '');

/** Converts what the user typed into +<country><number>, or null if it can't be a valid number. */
export function toInternationalPhone(input: string): string | null {
  // Accept Arabic-Indic digits too (٠١٢٣٤٥٦٧٨٩ and ۰۱۲۳۴۵۶۷۸۹).
  const latin = input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const trimmed = latin.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (digits.length <= 9) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  // E.164 allows at most 15 digits; a real mobile number has at least 10 with its country code.
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}
