// The landing page content is data the platform admin edits (E6). It is stored in
// platform_settings.landing (public read; only staff with the «landing» permission
// can write it, enforced by the database). Without a backend it stays in this browser.
import { useEffect, useState } from 'react';
import type { LandingPageConfig } from '../types';
import { supabase } from './supabase';
import { getPublicSetting, savePlatformSetting } from './settings';
import { DEFAULT_LANDING_CONFIG, mergeLanding } from './landingConfig';

export { mergeLanding, DEFAULT_LANDING_CONFIG } from './landingConfig';

const LOCAL_KEY = 'dequa_landing_page_config_v1';
const EVENT = 'dequa_landing_config_updated';

function loadLocal(): LandingPageConfig {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_KEY) : null;
    return mergeLanding(saved ? JSON.parse(saved) : null);
  } catch {
    return mergeLanding(null);
  }
}

export async function loadLandingConfig(): Promise<LandingPageConfig> {
  if (!supabase) return loadLocal();
  return mergeLanding(await getPublicSetting<unknown>('landing'));
}

export async function storeLandingConfig(config: LandingPageConfig): Promise<void> {
  if (!supabase) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
  } else {
    await savePlatformSetting('landing', config, true);
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLandingConfig(): LandingPageConfig {
  const [config, setConfig] = useState<LandingPageConfig>(supabase ? DEFAULT_LANDING_CONFIG : loadLocal());
  useEffect(() => {
    let alive = true;
    const refresh = () => loadLandingConfig().then((c) => alive && setConfig(c));
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, refresh);
    };
  }, []);
  return config;
}
