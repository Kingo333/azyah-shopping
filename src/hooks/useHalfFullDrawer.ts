import { useEffect, useState } from 'react';

// Globe drawers open half way; drag up (or tap View All) for the full drawer,
// drag down to go back or close. Uses vaul's snap points.
export const HALF = 0.55;
export const FULL = 1;
const SNAP_POINTS = [HALF, FULL];

export function useHalfFullDrawer(open: boolean) {
  const [snap, setSnap] = useState<number | string | null>(HALF);

  // Every time it opens, start half way.
  useEffect(() => {
    if (open) setSnap(HALF);
  }, [open]);

  return {
    /** Spread onto <Drawer>. The content itself should be full height (h-[95vh]). */
    drawerProps: {
      snapPoints: SNAP_POINTS,
      activeSnapPoint: snap,
      setActiveSnapPoint: setSnap,
      fadeFromIndex: 0,
    },
    isExpanded: snap === FULL,
    toggleExpanded: () => setSnap((s) => (s === FULL ? HALF : FULL)),
  };
}
