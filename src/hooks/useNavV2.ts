import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { features } from '@/lib/features';
import { resolveNavV2 } from '@/lib/navV2';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Whether this device uses the new 4-tab shopper bar (?nav_v2=1 to opt in). */
export function useNavV2(): boolean {
  const { search } = useLocation();
  return useMemo(() => resolveNavV2(search, safeLocalStorage(), features.nav_v2), [search]);
}
