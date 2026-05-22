import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startCamera, stopCamera, type CameraResult } from '@/ar/core/CameraManager';
import type {
  LiveCamGarmentSelection,
  LiveCamSessionInfo,
  LiveCamStatus,
} from './liveCamTypes';

const TARGET_WIDTH = 576;
const TARGET_HEIGHT = 320;
const FPS_CAP = 12;
const STARTING_TIMEOUT_MS = 180_000;
const WS_FIRST_RETRY_MS = 3_000;
const WS_RETRY_INTERVAL_MS = 5_000;

const DEFAULT_TRYON_PROMPT =
  "Apply the clothing item from the reference image onto the person in the live camera frame. Preserve the person's face, body pose, background, skin tone, and lighting. Make the garment look naturally worn, fitted, and realistic.";

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
  redrawLastFrame: () => void;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return arrayBufferToBase64(buf);
}

function base64ToBlob(b64: string, mime = 'image/jpeg'): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
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
  const sessionIdRef = useRef<string | null>(null);
  const startTimeoutRef = useRef<number | null>(null);
  const latencyEmaRef = useRef<number | null>(null);
  const lastSendTsRef = useRef<number | null>(null);
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
    lastSendTsRef.current = null;
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

  const renderRemoteFrame = useCallback(async (b64: string) => {
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const blob = base64ToBlob(b64, 'image/jpeg');
      const bitmap = await createImageBitmap(blob);
      if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
      if (canvas.height !== bitmap.height) canvas.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      bitmap.close?.();
      const sentAt = lastSendTsRef.current;
      if (sentAt != null) {
        const rtt = performance.now() - sentAt;
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
    lastSendTsRef.current = null;

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

      // 3. Fetch reference image as bytes -> base64.
      const refResp = await fetch(garment.referenceImageUrl, { mode: 'cors' });
      if (!refResp.ok) throw new Error(`Reference image fetch failed (${refResp.status})`);
      const refBuf = await refResp.arrayBuffer();
      const refB64 = arrayBufferToBase64(refBuf);

      // 4. Open WS with cold-start retry-with-backoff (FluxRT pods need 60–180s to warm up).
      setStatus('warming');
      const deadline = Date.now() + STARTING_TIMEOUT_MS - 5_000;
      let ws: WebSocket | null = null;
      let attemptNum = 0;
      while (true) {
        if (abortRef.current) throw new Error('aborted');
        attemptNum++;
        const candidate = new WebSocket(data.ws_url);
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

      // 5. Build final prompt: strong base + optional garment hint appended.
      const hint = garment.promptHint?.trim();
      const finalPrompt = hint ? `${DEFAULT_TRYON_PROMPT} ${hint}` : DEFAULT_TRYON_PROMPT;

      // 6. Start frame loop helper — invoked only after worker emits 'ready'.
      let readyHandled = false;
      const startFrameLoop = () => {
        if (readyHandled) return;
        readyHandled = true;
        const wsNow = wsRef.current;
        if (!wsNow || wsNow.readyState !== WebSocket.OPEN) return;

        // Send reference image + prompt now that worker is ready.
        wsNow.send(JSON.stringify({ type: 'set_reference_image', image_b64: refB64 }));
        wsNow.send(JSON.stringify({ type: 'set_prompt', prompt: finalPrompt }));

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
        if (!capCtx) {
          setErrorMessage('Capture canvas context unavailable');
          setStatus('failed');
          cleanupLocal();
          return;
        }

        const intervalMs = Math.floor(1000 / FPS_CAP);
        frameTimerRef.current = window.setInterval(() => {
          const wsNow2 = wsRef.current;
          const v = localVideoRef.current;
          if (!wsNow2 || wsNow2.readyState !== WebSocket.OPEN || !v || v.readyState < 2) return;
          // Backpressure: skip if socket has too much buffered.
          if (wsNow2.bufferedAmount > 2_000_000) return;
          capCtx.drawImage(v, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
          cap.toBlob(
            async (blob) => {
              if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              if (wsRef.current.bufferedAmount > 2_000_000) return;
              try {
                const b64 = await blobToBase64(blob);
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                if (wsRef.current.bufferedAmount > 2_000_000) return;
                lastSendTsRef.current = performance.now();
                wsRef.current.send(JSON.stringify({ type: 'frame', frame_b64: b64 }));
              } catch {
                // skip frame
              }
            },
            'image/jpeg',
            0.7,
          );
        }, intervalMs);
      };

      // 7. Bind message handler — handle warming | ready | ack | error | frame.
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        let parsed: any;
        try { parsed = JSON.parse(ev.data); } catch { return; }
        const t = parsed?.type;
        if (t === 'ready') {
          startFrameLoop();
        } else if (t === 'frame' && typeof parsed.frame_b64 === 'string') {
          void renderRemoteFrame(parsed.frame_b64);
        } else if (t === 'error') {
          const msg = typeof parsed.message === 'string' ? parsed.message : 'Worker error';
          setErrorMessage(msg);
          setStatus('failed');
          cleanupLocal();
          void callEnd();
          sessionIdRef.current = null;
        } else if (t === 'warming' || t === 'ack') {
          // no-op; status remains 'warming' until 'ready'
        }
      });
      ws.addEventListener('close', () => {
        if (sessionIdRef.current) {
          setStatus((s) => (s === 'running' ? 'ended' : s));
        }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMessage(msg);
      setStatus('failed');
      cleanupLocal();
      await callEnd();
      sessionIdRef.current = null;
    }
  }, [garment, localVideoRef, cleanupLocal, callEnd, renderRemoteFrame]);

  // Auto-cleanup on unmount + on logout + on page unload + on tab hide.
  useEffect(() => {
    const endUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-cam-session-end`;
    const apikey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? '';

    const endViaKeepalive = (sid: string) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey,
        };
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.access_token) headers['Authorization'] = `Bearer ${data.session.access_token}`;
          fetch(endUrl, { method: 'POST', headers, body: JSON.stringify({ session_id: sid }), keepalive: true }).catch(() => undefined);
        });
      } catch { /* noop */ }
    };

    const endViaBeacon = (sid: string) => {
      try {
        if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
        const blob = new Blob([JSON.stringify({ session_id: sid, apikey })], { type: 'application/json' });
        navigator.sendBeacon(endUrl, blob);
      } catch { /* noop */ }
    };

    const onUnload = () => {
      const sid = sessionIdRef.current;
      cleanupLocal();
      if (sid) {
        endViaKeepalive(sid);
        endViaBeacon(sid);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && sessionIdRef.current) {
        void stop();
      }
    };

    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    document.addEventListener('visibilitychange', onVisibility);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void stop();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      authSub.subscription.unsubscribe();
      cleanupLocal();
      void callEnd();
      sessionIdRef.current = null;
    };
  }, [cleanupLocal, callEnd, stop]);

  return { status, errorMessage, latencyMs, session, start, stop };
}
