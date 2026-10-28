import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { features } from '@/lib/features';
import { resolveDesignV3 } from '@/lib/designV3';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Whether this device uses design v3 (?design=v3 to opt in, ?design=v2 to leave). */
export function useDesignV3(): boolean {
  const { search } = useLocation();
  return useMemo(() => resolveDesignV3(search, safeLocalStorage(), features.design_v3), [search]);
}
