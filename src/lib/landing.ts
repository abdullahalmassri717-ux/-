// The landing page text is data the platform admin edits (E6). It is stored in
// platform_settings.landing; without a backend it stays in this browser.
import { useEffect, useState } from 'react';
import { DEFAULT_LANDING_CONFIG, getLandingPageConfig, saveLandingPageConfig } from '../mockData';
import type { LandingPageConfig } from '../types';
import { supabase } from './supabase';
import { getPublicSetting, savePlatformSetting } from './settings';

export function mergeLanding(saved: Partial<LandingPageConfig> | null | undefined): LandingPageConfig {
  const d = DEFAULT_LANDING_CONFIG;
  const s = saved ?? {};
  return {
    ...d,
    ...s,
    hero: { ...d.hero, ...(s.hero ?? {}) },
    whoIsItFor: { ...d.whoIsItFor, ...(s.whoIsItFor ?? {}) },
    curricula: { ...d.curricula, ...(s.curricula ?? {}) },
    howItWorks: { ...d.howItWorks, ...(s.howItWorks ?? {}) },
    features: { ...d.features, ...(s.features ?? {}) },
    faqs: { ...d.faqs, ...(s.faqs ?? {}) },
    ctaBanner: { ...d.ctaBanner, ...(s.ctaBanner ?? {}) },
    footer: { ...d.footer, ...(s.footer ?? {}) },
    sectionVisibility: { ...d.sectionVisibility, ...(s.sectionVisibility ?? {}) },
  };
}

export async function loadLandingConfig(): Promise<LandingPageConfig> {
  if (!supabase) return getLandingPageConfig();
  return mergeLanding(await getPublicSetting<Partial<LandingPageConfig>>('landing'));
}

export async function storeLandingConfig(config: LandingPageConfig): Promise<void> {
  if (!supabase) return saveLandingPageConfig(config);
  await savePlatformSetting('landing', config, true);
  window.dispatchEvent(new Event('dequa_landing_config_updated'));
}

export function useLandingConfig(): LandingPageConfig {
  const [config, setConfig] = useState<LandingPageConfig>(supabase ? DEFAULT_LANDING_CONFIG : getLandingPageConfig());
  useEffect(() => {
    let alive = true;
    const refresh = () => loadLandingConfig().then((c) => alive && setConfig(c));
    refresh();
    window.addEventListener('dequa_landing_config_updated', refresh);
    return () => {
      alive = false;
      window.removeEventListener('dequa_landing_config_updated', refresh);
    };
  }, []);
  return config;
}
