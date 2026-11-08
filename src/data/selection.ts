import { useEffect, useState } from 'react';

// Remembers which exam / paper / group / student the teacher opened, so the
// next screen knows what to show (and a page reload keeps it).

export type SelectionKey = 'exam' | 'submission' | 'group' | 'student';

const PREFIX = 'daqa.selected.';
const listeners = new Set<() => void>();

export function getSelected(key: SelectionKey): string | null {
  try {
    return sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function setSelected(key: SelectionKey, id: string | null) {
  try {
    if (id) sessionStorage.setItem(PREFIX + key, id);
    else sessionStorage.removeItem(PREFIX + key);
  } catch {
    // Private mode: selection just won't survive a reload.
  }
  listeners.forEach((l) => l());
}

export function useSelected(key: SelectionKey): [string | null, (id: string | null) => void] {
  const [value, setValue] = useState(() => getSelected(key));
  useEffect(() => {
    const l = () => setValue(getSelected(key));
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [key]);
  return [value, (id) => setSelected(key, id)];
}
