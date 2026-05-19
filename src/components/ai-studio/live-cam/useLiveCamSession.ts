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
const STARTING_TIMEOUT_MS = 90_000;

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

  const cleanupLocal = useCallback(() => {
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

      // 4. Open WS.
      const ws = new WebSocket(data.ws_url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => { ws.removeEventListener('error', onError); resolve(); };
        const onError = () => { ws.removeEventListener('open', onOpen); reject(new Error('WebSocket failed to open')); };
        ws.addEventListener('open', onOpen, { once: true });
        ws.addEventListener('error', onError, { once: true });
      });

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
