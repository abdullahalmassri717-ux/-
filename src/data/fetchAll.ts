// Supabase sends at most 1000 rows per request and silently drops the rest.
// A school with more than 1000 students (or a year of papers) would then see
// part of its data with no warning. fetchAll asks page by page until it has
// everything, up to `max` rows.
//
// The query MUST have a stable order that ends in a unique column (usually
// .order('id')), or rows can repeat or go missing between pages.

type Page<T> = { data: T[] | null; error: { message?: string; code?: string } | null };

export const SERVER_PAGE_SIZE = 1000;

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
  max = 50_000,
): Promise<{ data: T[]; error: Page<T>['error'] }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += SERVER_PAGE_SIZE) {
    const to = Math.min(from + SERVER_PAGE_SIZE, max) - 1;
    const { data, error } = await page(from, to);
    if (error) return { data: rows, error };
    const got = data ?? [];
    rows.push(...got);
    if (got.length < to - from + 1) break;
  }
  return { data: rows, error: null };
}
