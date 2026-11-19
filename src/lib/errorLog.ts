// Sends unexpected errors that happen on a user's phone or computer to the
// database (table app_errors), so the platform admin sees them in
// «جودة وتكلفة التصحيح» instead of them being lost. Only the error text and the
// page (without student/report codes) are sent; never names or answers.
import { supabase } from './supabase';

const seen = new Set<string>();
let sentThisPage = 0;

function ignorable(message: string): boolean {
  return (
    !message ||
    message === 'Script error.' || // from another site (e.g. a browser extension)
    /ResizeObserver loop/i.test(message) ||
    /Failed to fetch dynamically imported module|Importing a module script failed/i.test(message) || // handled by reload
    /^(Load failed|Failed to fetch|NetworkError)/i.test(message) // no internet: not a bug
  );
}

export function reportError(error: unknown, extra?: string): void {
  if (!supabase) return;
  const message = (error instanceof Error ? error.message : String(error ?? '')).slice(0, 300);
  if (ignorable(message) || seen.has(message) || sentThisPage >= 10) return;
  seen.add(message);
  sentThisPage += 1;
  const stack = error instanceof Error ? error.stack ?? '' : '';
  void supabase
    .rpc('log_app_error', {
      p_message: message,
      p_detail: [extra, stack].filter(Boolean).join('\n').slice(0, 1500) || null,
      p_page: window.location.pathname,
      p_version: (import.meta.env.VITE_BUILD_ID as string | undefined) ?? null,
    })
    .then(
      () => {},
      () => {},
    );
}

export function listenForErrors(): void {
  window.addEventListener('error', (e) => {
    if (e.filename && !e.filename.startsWith(window.location.origin)) return;
    reportError(e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandled promise'));
}
