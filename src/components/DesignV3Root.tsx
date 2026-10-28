import { useEffect } from 'react';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { DESIGN_V3_CLASS } from '@/lib/designV3';

/** Puts the design-v3 class on <html> while design v3 is on. Renders nothing. */
export function DesignV3Root() {
  const on = useDesignV3();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(DESIGN_V3_CLASS, on);
    return () => root.classList.remove(DESIGN_V3_CLASS);
  }, [on]);
  return null;
}
