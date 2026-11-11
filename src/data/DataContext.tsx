import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setTeacherViewHeader, supabase } from '../lib/supabase';
import { createDemoStore } from './demoStore';
import { createSupabaseStore } from './supabaseStore';
import type { DataStore } from './types';
import type { Entity } from '../types';

// Gives every screen the data store for the organization that is active in the
// top bar. Switching organization gives a fresh store, so no data leaks across.

const DataContext = createContext<DataStore | null>(null);
const OrgContext = createContext<Entity | null>(null);

/** The organization chosen in the top bar. */
export function useActiveOrg(): Entity {
  const org = useContext(OrgContext);
  if (!org) throw new Error('useActiveOrg must be used inside <DataProvider>');
  return org;
}

/**
 * `teacherView`: a school owner opened «صفحتي كأستاذ», so the store only shows what
 * is assigned to them (the database narrows it). Switching gives a fresh store.
 */
export const DataProvider: React.FC<{ org: Entity; real: boolean; teacherView?: boolean; children: React.ReactNode }> = ({
  org,
  real,
  teacherView = false,
  children,
}) => {
  const orgId = org.id;
  const store = useMemo(() => {
    setTeacherViewHeader(teacherView);
    return real && supabase ? createSupabaseStore(supabase, orgId) : createDemoStore();
  }, [real, orgId, teacherView]);
  return (
    <OrgContext.Provider value={org}>
      <DataContext.Provider value={store}>{children}</DataContext.Provider>
    </OrgContext.Provider>
  );
};

export function useData(): DataStore {
  const store = useContext(DataContext);
  if (!store) throw new Error('useData must be used inside <DataProvider>');
  return store;
}

export interface Loaded<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Change the loaded value locally (e.g. after a save) without re-fetching. */
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/** Loads data from the store and reloads when the store or the deps change. */
export function useLoad<T>(load: (store: DataStore) => Promise<T>, deps: React.DependencyList = []): Loaded<T> {
  const store = useData();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadRef
      .current(store)
      .then((v) => alive && setData(v))
      .catch((e: unknown) => alive && setError(e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : 'تعذّر تحميل البيانات.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}

/** Arabic message for a failed save. */
export function errorMessage(e: unknown, fallback = 'تعذّر حفظ التغييرات.'): string {
  return e instanceof Error && /[؀-ۿ]/.test(e.message) ? e.message : fallback;
}
