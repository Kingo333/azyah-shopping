import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LiveCamTab } from '@/components/ai-studio/live-cam/LiveCamTab';
import type { LiveCamStatus } from '@/components/ai-studio/live-cam/liveCamTypes';
import { keepMounted } from '@/lib/liveCamHost';

/**
 * Design v3: one Live Cam for the whole app, so it keeps starting up (and
 * stays on) while people browse. It's rendered once into a stable container;
 * the Live screen's <LiveCamSlot /> moves that container into place, and when
 * the screen goes away it's parked out of sight instead of unmounted. The
 * Try on tab shows a dot while it's on, and a message says when it's ready.
 * Same session hook and backend as before; it still ends when you tap End,
 * close or hide the app (the hook's own rules).
 */

interface HostApi {
  attach: (slot: HTMLElement) => void;
  detach: (slot: HTMLElement) => void;
}

interface HostStatus {
  status: LiveCamStatus;
  /** Bumped when someone asks to see the Live screen (pill or toast). */
  openRequest: number;
  /** True once per request: the Try on screen uses it to switch to Live. */
  takeOpenRequest: () => boolean;
}

const HostApiContext = createContext<HostApi | null>(null);
const HostStatusContext = createContext<HostStatus>({ status: 'idle', openRequest: 0, takeOpenRequest: () => false });

export const useLiveCamHostStatus = () => useContext(HostStatusContext);

export function LiveCamHostProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [onScreen, setOnScreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<LiveCamStatus>('idle');
  const [openRequest, setOpenRequest] = useState(0);
  const onScreenRef = useRef(false);

  // The stable container the Live Cam is rendered into, and where it waits off screen.
  const container = useMemo(() => document.createElement('div'), []);
  const parking = useMemo(() => {
    const el = document.createElement('div');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    return el;
  }, []);
  useLayoutEffect(() => {
    document.body.appendChild(parking);
    parking.appendChild(container);
    return () => parking.remove();
  }, [container, parking]);

  const attach = useCallback((slot: HTMLElement) => {
    slot.appendChild(container);
    onScreenRef.current = true;
    setOnScreen(true);
    setMounted(true);
    // Moving a video element pauses it; carry on playing.
    container.querySelectorAll('video').forEach((v) => { void v.play().catch(() => undefined); });
  }, [container]);

  const detach = useCallback((slot: HTMLElement) => {
    if (container.parentElement === slot) parking.appendChild(container);
    onScreenRef.current = false;
    setOnScreen(false);
  }, [container, parking]);

  // Unmount (which ends any session) once it's neither on screen nor starting/running.
  useEffect(() => {
    if (mounted && !keepMounted(onScreen, status)) {
      setMounted(false);
      setStatus('idle');
    }
  }, [mounted, onScreen, status]);

  const handledRequest = useRef(0);
  const openRequestRef = useRef(0);
  openRequestRef.current = openRequest;
  const takeOpenRequest = useCallback(() => {
    if (openRequestRef.current <= handledRequest.current) return false;
    handledRequest.current = openRequestRef.current;
    return true;
  }, []);

  const openLive = useCallback(() => {
    setOpenRequest((n) => n + 1);
    navigate('/try-on');
  }, [navigate]);

  // Say when it's ready, wherever you are.
  const prev = useRef<LiveCamStatus>('idle');
  useEffect(() => {
    if (status === 'running' && prev.current !== 'running') {
      if (onScreenRef.current) {
        toast.success('Live try-on is ready. Tap any item to try it on.');
      } else {
        toast.success('Live try-on is ready. Any item now loads instantly.', {
          action: { label: 'Open', onClick: openLive },
          duration: 8000,
        });
      }
    }
    prev.current = status;
  }, [status, openLive]);

  const api = useMemo<HostApi>(() => ({ attach, detach }), [attach, detach]);
  const statusValue = useMemo<HostStatus>(() => ({ status, openRequest, takeOpenRequest }), [status, openRequest, takeOpenRequest]);

  return (
    <HostApiContext.Provider value={api}>
      <HostStatusContext.Provider value={statusValue}>
        {children}
        {mounted && createPortal(<LiveCamTab hosted onStatusChange={setStatus} />, container)}
      </HostStatusContext.Provider>
    </HostApiContext.Provider>
  );
}

/** Where the Live screen shows the app's Live Cam. Falls back to a plain one outside the host. */
export function LiveCamSlot() {
  const api = useContext(HostApiContext);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!api || !el) return;
    api.attach(el);
    return () => api.detach(el);
  }, [api]);
  if (!api) return <LiveCamTab />;
  return <div ref={ref} />;
}
