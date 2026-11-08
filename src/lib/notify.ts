// In-app notifications that replace the browser's alert() popups.
// Any component can call notify('...') and the <Toaster /> in App shows it.

export type NotifyKind = 'info' | 'success' | 'warning';

export interface NotifyDetail {
  id: number;
  message: string;
  kind: NotifyKind;
}

const EVENT_NAME = 'daqa:notify';
let counter = 0;

export function notify(message: unknown, kind: NotifyKind = 'info'): void {
  const detail: NotifyDetail = { id: ++counter, message: String(message), kind };
  window.dispatchEvent(new CustomEvent<NotifyDetail>(EVENT_NAME, { detail }));
}

export function onNotify(handler: (detail: NotifyDetail) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<NotifyDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
