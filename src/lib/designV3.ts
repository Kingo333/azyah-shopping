// Design v3 (neutral redesign). Off for everyone by default; a device opts in
// with ?design=v3 (remembered) and leaves with ?design=v2.

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
