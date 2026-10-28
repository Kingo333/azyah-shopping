import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { features } from '@/lib/features';
import { keepsOriginalLook, resolveDesignV3 } from '@/lib/designV3';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether this screen uses design v3 (?design=v3 to opt in, ?design=v2 to leave).
 * The home pages keep their original look either way.
 */
export function useDesignV3(): boolean {
  const { search, pathname } = useLocation();
  // Resolve first so ?design= is still remembered when it's on a home page link.
  const on = useMemo(() => resolveDesignV3(search, safeLocalStorage(), features.design_v3), [search]);
  return on && !keepsOriginalLook(pathname);
}
