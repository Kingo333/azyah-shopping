import { useCallback, useEffect, useRef } from 'react';

/**
 * Handlers that call onLongPress after the element is held for `ms` without moving away.
 * Used for hidden controls (the sales-mode entry on the sign-up popup).
 */
export function useLongPress(onLongPress: () => void, ms = 2000) {
  const timer = useRef<number | null>(null);
  const cb = useRef(onLongPress);
  cb.current = onLongPress;

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      cb.current();
    }, ms);
  }, [cancel, ms]);

  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // A long touch would otherwise open the browser's copy menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { userSelect: 'none' as const, WebkitUserSelect: 'none' as const, WebkitTouchCallout: 'none' as const },
  };
}
