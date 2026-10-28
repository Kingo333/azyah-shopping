// Design v3 (neutral redesign). The feature flag controls the default;
// ?design=v3 opts in (remembered), while ?design=v2 overrides this page view.

export const DESIGN_V3_STORAGE_KEY = 'azyah:design_v3';
export const DESIGN_V3_CLASS = 'design-v3';

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function resolveDesignV3(search: string, storage: FlagStorage | null, defaultOn: boolean): boolean {
  const param = new URLSearchParams(search).get('design');
  if (param === 'v3' || param === 'v2') {
    try {
      if (param === 'v3') storage?.setItem(DESIGN_V3_STORAGE_KEY, '1');
      else storage?.removeItem(DESIGN_V3_STORAGE_KEY);
    } catch {
      // Storage blocked (private mode): the choice still applies to this page view.
    }
    return param === 'v3';
  }
  try {
    if (storage?.getItem(DESIGN_V3_STORAGE_KEY) === '1') return true;
  } catch {
    // ignore
  }
  return defaultOn;
}

// The home pages people arrive on keep their original look (owner decision
// 2026-10-28): the landing page and the intro slides, not the v3 welcome.
const ORIGINAL_LOOK_PATHS = new Set(['/', '/landing', '/onboarding/intro']);

export function keepsOriginalLook(pathname: string): boolean {
  return ORIGINAL_LOOK_PATHS.has(pathname);
}
