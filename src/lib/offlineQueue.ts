// Papers waiting to be uploaded, kept on the device (IndexedDB) so nothing is
// lost when the internet drops. They are sent automatically once back online.
// Note: photos stay only on this device until uploaded; they are removed right after.

export interface QueuedPaper {
  id: string;
  /** Who sends it: the teacher's upload screen, or the student link page. */
  kind: 'teacher' | 'student';
  /** For teacher uploads: the exam id. For student links: the link code. */
  target: string;
  studentId?: string | null;
  studentCode?: string;
  pages: { base64: string; dataUrl: string; mediaType: 'image/jpeg' }[];
  createdAt: string;
}

const DB_NAME = 'daqa-offline';
const STORE = 'papers';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function queuePaper(paper: QueuedPaper): Promise<boolean> {
  try {
    await tx('readwrite', (s) => s.put(paper));
    return true;
  } catch {
    return false;
  }
}

export async function listQueued(kind: QueuedPaper['kind'], target?: string): Promise<QueuedPaper[]> {
  try {
    const all = await tx('readonly', (s) => s.getAll() as IDBRequest<QueuedPaper[]>);
    return all.filter((p) => p.kind === kind && (!target || p.target === target));
  } catch {
    return [];
  }
}

export async function removeQueued(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    // nothing to do
  }
}

/** True for errors that mean "no connection" rather than "the server said no". */
export function isOfflineError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|network|الاتصال بالإنترنت|load failed/i.test(msg);
}
