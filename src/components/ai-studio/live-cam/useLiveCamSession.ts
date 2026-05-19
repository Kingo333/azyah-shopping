import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startCamera, stopCamera, type CameraResult } from '@/ar/core/CameraManager';
import type {
  LiveCamGarmentSelection,
  LiveCamSessionInfo,
  LiveCamStatus,
  LiveCamFrameMeta,
  LiveCamInitMessage,
  LiveCamRemoteFrameMeta,
} from './liveCamTypes';

const TARGET_WIDTH = 576;
const TARGET_HEIGHT = 320;
const FPS_CAP = 12;
const STARTING_TIMEOUT_MS = 180_000;
const WS_FIRST_RETRY_MS = 3_000;
const WS_RETRY_INTERVAL_MS = 5_000;

interface UseLiveCamSessionArgs {
  garment: LiveCamGarmentSelection | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
}

interface UseLiveCamSessionReturn {
  status: LiveCamStatus;
  errorMessage: string | null;
  latencyMs: number | null;
  session: LiveCamSessionInfo | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useLiveCamSession({
  garment,
  localVideoRef,
  remoteCanvasRef,
}: UseLiveCamSessionArgs): UseLiveCamSessionReturn {
  const [status, setStatus] = useState<LiveCamStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [session, setSession] = useState<LiveCamSessionInfo | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const seqRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeoutRef = useRef<number | null>(null);
  const latencyEmaRef = useRef<number | null>(null);
  const pendingMetaRef = useRef<LiveCamRemoteFrameMeta | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAbortRef = useRef<(() => void) | null>(null);
  const abortRef = useRef(false);

  const cleanupLocal = useCallback(() => {
    abortRef.current = true;
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (retryAbortRef.current) {
      try { retryAbortRef.current(); } catch { /* noop */ }
      retryAbortRef.current = null;
    }
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (startTimeoutRef.current !== null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* noop */ }
      wsRef.current = null;
    }
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    captureCanvasRef.current = null;
    seqRef.current = 0;
    pendingMetaRef.current = null;
  }, [localVideoRef]);

  const callEnd = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await supabase.functions.invoke('live-cam-session-end', { body: { session_id: sid } });
    } catch {
      // best-effort
    }
  }, []);

  const stop = useCallback(async () => {
    cleanupLocal();
    await callEnd();
    sessionIdRef.current = null;
    setSession(null);
    setStatus((s) => (s === 'failed' ? s : 'ended'));
  }, [callEnd, cleanupLocal]);

  const renderRemoteFrame = useCallback(async (buf: ArrayBuffer, meta: LiveCamRemoteFrameMeta | null) => {
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const blob = new Blob([buf], { type: meta?.mime || 'image/jpeg' });
      const bitmap = await createImageBitmap(blob);
      const w = meta?.width ?? bitmap.width;
      const h = meta?.height ?? bitmap.height;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      if (meta?.ts) {
        const rtt = performance.now() - meta.ts;
        const ema = latencyEmaRef.current;
        const next = ema === null ? rtt : ema * 0.8 + rtt * 0.2;
        latencyEmaRef.current = next;
        setLatencyMs(Math.round(next));
      }
    } catch {
      // bad frame, skip
    }
  }, [remoteCanvasRef]);

  const start = useCallback(async () => {
    if (!garment) {
      setErrorMessage('Select a garment first.');
      setStatus('failed');
      return;
    }
    if (typeof window === 'undefined' || !window.WebSocket || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('This device does not support live camera streaming.');
      setStatus('failed');
      return;
    }

    abortRef.current = false;
    setStatus('starting');
    setErrorMessage(null);
    setLatencyMs(null);
    latencyEmaRef.current = null;

    startTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage('GPU pod took too long to start. Please retry.');
      setStatus('failed');
      cleanupLocal();
    }, STARTING_TIMEOUT_MS);

    try {
      // 1. Provision the pod via edge function.
      const { data, error } = await supabase.functions.invoke<{
        session_id: string; ws_url: string; pod_id: string | null;
      }>('live-cam-session-start', {
        body: { garment_id: garment.id, garment_source: garment.source },
      });
      if (error || !data?.ws_url || !data?.session_id) {
        throw new Error(error?.message || 'Failed to start session');
      }
      sessionIdRef.current = data.session_id;
      setSession({ sessionId: data.session_id, podId: data.pod_id, wsUrl: data.ws_url });

      // 2. Acquire camera.
      const video = localVideoRef.current;
      if (!video) throw new Error('Video element missing');
      const cam: CameraResult = await startCamera(video);
      streamRef.current = cam.stream;

      // 3. Fetch reference image as bytes.
      const refResp = await fetch(garment.referenceImageUrl, { mode: 'cors' });
      if (!refResp.ok) throw new Error(`Reference image fetch failed (${refResp.status})`);
      const refMime = refResp.headers.get('Content-Type') || 'image/jpeg';
      const refBuf = await refResp.arrayBuffer();

      // 4. Open WS with cold-start retry-with-backoff (FluxRT pods need 60–180s to warm up).
      setStatus('warming');
      const deadline = Date.now() + STARTING_TIMEOUT_MS - 5_000; // leave room for handshake
      let ws: WebSocket | null = null;
      let attemptNum = 0;
      while (true) {
        if (abortRef.current) throw new Error('aborted');
        attemptNum++;
        const candidate = new WebSocket(data.ws_url);
        candidate.binaryType = 'arraybuffer';
        const opened = await new Promise<boolean>((resolve) => {
          const onOpen = () => { cleanup(); resolve(true); };
          const onFail = () => { cleanup(); resolve(false); };
          const cleanup = () => {
            candidate.removeEventListener('open', onOpen);
            candidate.removeEventListener('error', onFail);
            candidate.removeEventListener('close', onFail);
          };
          candidate.addEventListener('open', onOpen, { once: true });
          candidate.addEventListener('error', onFail, { once: true });
          candidate.addEventListener('close', onFail, { once: true });
        });
        if (abortRef.current) {
          try { candidate.close(); } catch { /* noop */ }
          throw new Error('aborted');
        }
        if (opened) {
          ws = candidate;
          break;
        }
        try { candidate.close(); } catch { /* noop */ }
        if (Date.now() >= deadline) {
          throw new Error('GPU pod did not accept connections in time. Please retry.');
        }
        const waitMs = attemptNum === 1 ? WS_FIRST_RETRY_MS : WS_RETRY_INTERVAL_MS;
        await new Promise<void>((resolve) => {
          retryAbortRef.current = () => {
            if (retryTimerRef.current !== null) {
              window.clearTimeout(retryTimerRef.current);
              retryTimerRef.current = null;
            }
            retryAbortRef.current = null;
            resolve();
          };
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            retryAbortRef.current = null;
            resolve();
          }, waitMs);
        });
        if (abortRef.current) throw new Error('aborted');
      }
      wsRef.current = ws;

      // 5. Init handshake.
      const init: LiveCamInitMessage = {
        type: 'init',
        config: {
          resolution: [TARGET_WIDTH, TARGET_HEIGHT],
          use_reference_image: true,
          fps_cap: FPS_CAP,
        },
      };
      ws.send(JSON.stringify(init));

      // 6. Reference image: JSON meta + binary frame.
      ws.send(JSON.stringify({ type: 'reference', mime: refMime, prompt_hint: garment.promptHint ?? null }));
      ws.send(refBuf);

      // 7. Bind message handler (paired JSON meta + binary).
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const parsed = JSON.parse(ev.data) as LiveCamRemoteFrameMeta & { type: string };
            if (parsed?.type === 'frame') {
              pendingMetaRef.current = parsed;
            }
          } catch {
            // ignore non-JSON text frames
          }
        } else if (ev.data instanceof ArrayBuffer) {
          const meta = pendingMetaRef.current;
          pendingMetaRef.current = null;
          void renderRemoteFrame(ev.data, meta);
        }
      });
      ws.addEventListener('close', () => {
        if (sessionIdRef.current) {
          setStatus((s) => (s === 'running' ? 'ended' : s));
        }
      });

      // 8. Start frame loop.
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      setStatus('running');

      const cap = document.createElement('canvas');
      cap.width = TARGET_WIDTH;
      cap.height = TARGET_HEIGHT;
      captureCanvasRef.current = cap;
      const capCtx = cap.getContext('2d');
      if (!capCtx) throw new Error('Capture canvas context unavailable');

      const intervalMs = Math.floor(1000 / FPS_CAP);
      frameTimerRef.current = window.setInterval(() => {
        const wsNow = wsRef.current;
        const v = localVideoRef.current;
        if (!wsNow || wsNow.readyState !== WebSocket.OPEN || !v || v.readyState < 2) return;
        capCtx.drawImage(v, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        cap.toBlob(
          (blob) => {
            if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            const meta: LiveCamFrameMeta = {
              type: 'frame',
              ts: performance.now(),
              seq: ++seqRef.current,
              width: TARGET_WIDTH,
              height: TARGET_HEIGHT,
              mime: 'image/jpeg',
            };
            wsRef.current.send(JSON.stringify(meta));
            blob.arrayBuffer().then((buf) => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(buf);
              }
            });
          },
          'image/jpeg',
          0.7,
        );
      }, intervalMs);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMessage(msg);
      setStatus('failed');
      cleanupLocal();
      await callEnd();
      sessionIdRef.current = null;
    }
  }, [garment, localVideoRef, cleanupLocal, callEnd, renderRemoteFrame]);

  // Auto-cleanup on unmount + on logout + on page unload.
  useEffect(() => {
    const onUnload = () => {
      cleanupLocal();
      const sid = sessionIdRef.current;
      if (sid) {
        // Fire-and-forget via fetch keepalive — supabase.functions.invoke is not keepalive-safe.
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-cam-session-end`;
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          };
          supabase.auth.getSession().then(({ data }) => {
            if (data.session?.access_token) headers['Authorization'] = `Bearer ${data.session.access_token}`;
            fetch(url, { method: 'POST', headers, body: JSON.stringify({ session_id: sid }), keepalive: true }).catch(() => undefined);
          });
        } catch { /* noop */ }
      }
    };
    window.addEventListener('beforeunload', onUnload);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void stop();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      authSub.subscription.unsubscribe();
      cleanupLocal();
      // Best-effort end on unmount.
      void callEnd();
      sessionIdRef.current = null;
    };
  }, [cleanupLocal, callEnd, stop]);

  return { status, errorMessage, latencyMs, session, start, stop };
}
