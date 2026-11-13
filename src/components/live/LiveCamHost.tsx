import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LiveCamTab } from '@/components/ai-studio/live-cam/LiveCamTab';
import type { LiveCamStatus } from '@/components/ai-studio/live-cam/liveCamTypes';
import { keepMounted } from '@/lib/liveCamHost';
import { WAIT_COPY } from '@/components/ai-studio/live-cam/liveCamWait';
import { liveCamDebug, liveCamEndpoint, liveCamRtcAllBrowsers, liveCamRtcUncropped, liveCamRtcView, liveCamTransport } from '@/components/ai-studio/live-cam/liveCamFlags';

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
  /** How far the start-up is (0..1) while it starts; null otherwise. The Try on tab draws a ring. */
  waitProgress: number | null;
  /** Bumped when someone asks to see the Live screen (pill or toast). */
  openRequest: number;
  /** True once per request: the Try on screen uses it to switch to Live. */
  takeOpenRequest: () => boolean;
}

const HostApiContext = createContext<HostApi | null>(null);
const HostStatusContext = createContext<HostStatus>({ status: 'idle', waitProgress: null, openRequest: 0, takeOpenRequest: () => false });

export const useLiveCamHostStatus = () => useContext(HostStatusContext);

export function LiveCamHostProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [onScreen, setOnScreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<LiveCamStatus>('idle');
  const [waitProgress, setWaitProgress] = useState<number | null>(null);
  const [openRequest, setOpenRequest] = useState(0);
  const onScreenRef = useRef(false);

  // Test switches given in the address (?livecam_transport=webrtc, ?livecam_endpoint=test, ?livecam_debug=1)
  // are remembered on this device as soon as the site opens, so they survive moving around the site.
  useEffect(() => {
    try {
      liveCamTransport();
      liveCamEndpoint();
      liveCamDebug();
      liveCamRtcView();
      liveCamRtcUncropped();
      liveCamRtcAllBrowsers();
    } catch { /* private mode: they still work while in the address */ }
  }, []);

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
        toast.success(WAIT_COPY.readyHere);
      } else {
        toast.success(WAIT_COPY.ready, {
          action: { label: 'Open', onClick: openLive },
          duration: 8000,
        });
      }
    }
    prev.current = status;
  }, [status, openLive]);

  const api = useMemo<HostApi>(() => ({ attach, detach }), [attach, detach]);
  const statusValue = useMemo<HostStatus>(() => ({ status, waitProgress, openRequest, takeOpenRequest }), [status, waitProgress, openRequest, takeOpenRequest]);

  return (
    <HostApiContext.Provider value={api}>
      <HostStatusContext.Provider value={statusValue}>
        {children}
        {mounted && createPortal(<LiveCamTab hosted onStatusChange={setStatus} onWaitProgress={setWaitProgress} />, container)}
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
