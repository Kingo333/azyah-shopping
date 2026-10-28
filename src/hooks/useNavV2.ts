import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { features } from '@/lib/features';
import { resolveNavV2 } from '@/lib/navV2';
import { useDesignV3 } from '@/hooks/useDesignV3';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Whether this device uses the new shopper bar (?nav_v2=1 to opt in; always on with design v3). */
export function useNavV2(): boolean {
  const { search } = useLocation();
  const designV3 = useDesignV3();
  const navV2 = useMemo(() => resolveNavV2(search, safeLocalStorage(), features.nav_v2), [search]);
  return designV3 || navV2;
}
