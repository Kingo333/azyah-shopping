import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startCamera, stopCamera, type CameraResult } from '@/ar/core/CameraManager';
import { buildTryOnInstruction, buildTryOnPrompt, inferSleeveLength } from './buildTryOnPrompt';
import { LiveCamFrameStats } from './liveCamStats';
import { prepareGarmentImage } from './liveCamGarmentImage';
import { isLiveCamLegacy } from './liveCamFlags';
import { LIVE_CAM_TIER_CONFIG, applyEngineHints, coverCropRect, outputCanvasSize, readFunctionError, type LiveCamTierConfig } from './liveCamTier';
import type {
  LiveCamGarmentSelection,
  LiveCamSessionInfo,
  LiveCamStatus,
  LiveCamTier,
} from './liveCamTypes';

// Messages for the optional `status` frames a GPU worker may send.
const STATUS_NOTICES: Record<string, string> = {
  waiting_face: 'Face the camera to start the try-on.',
  no_person: 'No one in frame. Step into view.',
  session_reset: 'Refreshing the try-on…',
  queued: 'Waiting for a free Premium GPU…',
};
const WS_FIRST_RETRY_MS = 3_000;
const WS_RETRY_INTERVAL_MS = 5_000;

// djb2 hash → 8-char hex. Cheap, deterministic, safe to log.
function hashPrompt(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

type SetPromptReason =
  | 'initial_start'
  | 'duplicate_skipped'
  | 'garment_changed'
  | 'manual_override_changed'
  | 'analysis_refresh'
  | 'unknown';





interface UseLiveCamSessionArgs {
  garment: LiveCamGarmentSelection | null;
  /** Tier to request when start() is called without an override. Defaults to standard. */
  tier?: LiveCamTier;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
}

interface UseLiveCamSessionReturn {
  status: LiveCamStatus;
  errorMessage: string | null;
  /** Machine-readable error code from the server, e.g. premium_required. */
  errorCode: string | null;
  /** Short live hint from the GPU worker (e.g. "No one in frame"). */
  notice: string | null;
  latencyMs: number | null;
  session: LiveCamSessionInfo | null;
  /** Tier the current/last start used (after any override). */
  activeTier: LiveCamTier;
  start: (tierOverride?: LiveCamTier) => Promise<void>;
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
  tier = 'standard',
  localVideoRef,
  remoteCanvasRef,
}: UseLiveCamSessionArgs): UseLiveCamSessionReturn {
  const [status, setStatus] = useState<LiveCamStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<LiveCamTier>(tier);
  // Settings for the tier actually being served; read inside frame callbacks.
  const cfgRef = useRef<LiveCamTierConfig>(LIVE_CAM_TIER_CONFIG.standard);
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
  // Per-frame timing (JoyAI echoes frame numbers); read by benchmarks via window.__azyahLiveCam.
  const statsRef = useRef(new LiveCamFrameStats());
  const lastFrameB64Ref = useRef<string | null>(null);
  const lastFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAbortRef = useRef<(() => void) | null>(null);
  const abortRef = useRef(false);
  const lastPromptHashRef = useRef<string | null>(null);
  // Mid-session garment swap (no reconnect). Set while a session is running.
  const swapGarmentRef = useRef<((next: LiveCamGarmentSelection) => Promise<void>) | null>(null);
  const activeGarmentIdRef = useRef<string | null>(null);
  const setPromptCountRef = useRef<number>(0);


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
    lastFrameB64Ref.current = null;
    lastFrameCanvasRef.current = null;
    lastPromptHashRef.current = null;
    setPromptCountRef.current = 0;
    swapGarmentRef.current = null;
    activeGarmentIdRef.current = null;
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

  useEffect(() => {
    const w = window as unknown as { __azyahLiveCam?: { stats: () => unknown } };
    w.__azyahLiveCam = { stats: () => statsRef.current.snapshot() };
    return () => {
      delete w.__azyahLiveCam;
    };
  }, []);

  const renderRemoteFrame = useCallback(async (b64: string, seq?: unknown, serverMs?: unknown) => {
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const blob = base64ToBlob(b64, 'image/jpeg');
      const bitmap = await createImageBitmap(blob);

      // Cache pixels to an offscreen canvas for instant sync redraw on resize/expand.
      let cache = lastFrameCanvasRef.current;
      if (!cache) {
        cache = document.createElement('canvas');
        lastFrameCanvasRef.current = cache;
      }
      if (cache.width !== bitmap.width) cache.width = bitmap.width;
      if (cache.height !== bitmap.height) cache.height = bitmap.height;
      const cacheCtx = cache.getContext('2d');
      if (cacheCtx) cacheCtx.drawImage(bitmap, 0, 0);

      // Pin the visible canvas to the worker's output size (2x capture with FluxRT's
      // upscaler) so the extra detail isn't scaled away; do not mutate per frame.
      const out = outputCanvasSize(cfgRef.current);
      if (canvas.width !== out.width) canvas.width = out.width;
      if (canvas.height !== out.height) canvas.height = out.height;

      // Contain-fit on a black backdrop — full frame visible, centered, never cropped.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
      const dw = bitmap.width * scale;
      const dh = bitmap.height * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.drawImage(bitmap, dx, dy, dw, dh);
      bitmap.close?.();
      lastFrameB64Ref.current = b64;
      // Matched round trip when the worker echoes the frame number (JoyAI);
      // otherwise time since the last frame sent (FluxRT).
      const matched = statsRef.current.onFrame(seq, serverMs);
      const sentAt = lastSendTsRef.current;
      if (matched !== null || sentAt != null) {
        const rtt = matched ?? performance.now() - (sentAt as number);
        const ema = latencyEmaRef.current;
        const next = ema === null ? rtt : ema * 0.8 + rtt * 0.2;
        latencyEmaRef.current = next;
        setLatencyMs(Math.round(next));
      }
    } catch {
      // bad frame, skip
    }
  }, [remoteCanvasRef]);

  // Sync redraw of the cached frame into the visible canvas. Safe to call on
  // every resize / expand-toggle without async decode jank or black flashes.
  const redrawLastFrame = useCallback(() => {
    const cache = lastFrameCanvasRef.current;
    const canvas = remoteCanvasRef.current;
    if (!cache || !canvas || cache.width === 0 || cache.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const out = outputCanvasSize(cfgRef.current);
    if (canvas.width !== out.width) canvas.width = out.width;
    if (canvas.height !== out.height) canvas.height = out.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / cache.width, canvas.height / cache.height);
    const dw = cache.width * scale;
    const dh = cache.height * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.drawImage(cache, dx, dy, dw, dh);
  }, [remoteCanvasRef]);

  const start = useCallback(async (tierOverride?: LiveCamTier) => {
    const requestedTier: LiveCamTier = tierOverride ?? tier;
    setActiveTier(requestedTier);
    setErrorCode(null);
    setNotice(null);
    // Until the server says otherwise, use the requested tier's settings.
    cfgRef.current = LIVE_CAM_TIER_CONFIG[requestedTier];
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
    statsRef.current.reset();

    const warmupTimeoutMs = LIVE_CAM_TIER_CONFIG[requestedTier].warmupTimeoutMs;
    startTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage('GPU took too long to start. Please retry.');
      setStatus('failed');
      cleanupLocal();
    }, warmupTimeoutMs);

    try {
      // 1. Provision the pod via edge function.
      const { data, error } = await supabase.functions.invoke<{
        session_id: string; ws_url: string; pod_id: string | null;
        tier?: LiveCamTier; tier_served?: LiveCamTier;
      }>('live-cam-session-start', {
        body: { garment_id: garment.id, garment_source: garment.source, tier: requestedTier },
      });
      if (error || !data?.ws_url || !data?.session_id) {
        const details = error ? await readFunctionError(error) : { code: null, message: null };
        if (details.code) setErrorCode(details.code);
        throw new Error(details.message || 'Failed to start session');
      }
      const tierServed: LiveCamTier = data.tier_served === 'premium' ? 'premium' : 'standard';
      cfgRef.current = LIVE_CAM_TIER_CONFIG[tierServed];
      sessionIdRef.current = data.session_id;
      setSession({
        sessionId: data.session_id,
        podId: data.pod_id,
        wsUrl: data.ws_url,
        tier: requestedTier,
        tierServed,
      });

      // 2. Acquire camera.
      const video = localVideoRef.current;
      if (!video) throw new Error('Video element missing');
      const cam: CameraResult = await startCamera(video);
      streamRef.current = cam.stream;

      // 3. Fetch reference image as bytes -> base64.
      const refResp = await fetch(garment.referenceImageUrl, { mode: 'cors' });
      if (!refResp.ok) throw new Error(`Reference image fetch failed (${refResp.status})`);
      // White background, max 1024 px (see liveCamGarmentImage.ts).
      const legacy = isLiveCamLegacy();
      if (legacy) console.log('[live-cam] legacy mode: no Gemini details, no photo clean-up');
      const refBlob = await refResp.blob();
      const refB64 = await blobToBase64(legacy ? refBlob : await prepareGarmentImage(refBlob));

      // 4. Open WS with cold-start retry-with-backoff (FluxRT pods need 60–180s to warm up).
      setStatus('warming');
      const deadline = Date.now() + warmupTimeoutMs - 5_000;
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

      // 5. Build category-aware prompt from existing item metadata.
      const name = garment.label?.trim();
      const description = garment.description?.trim();
      const hint = garment.promptHint?.trim();
      const finalPrompt = buildTryOnPrompt({
        category: garment.category,
        name,
        description,
        promptHint: hint,
      });
      // Short edit instruction for JoyAI (Premium HD); FluxRT ignores it.
      const finalInstruction = buildTryOnInstruction({
        category: garment.category,
        name,
        description,
        promptHint: hint,
      }, { useHintDetails: !legacy });

      const sleeveInference = inferSleeveLength({
        category: garment.category,
        name,
        description,
        promptHint: hint,
      });
      console.log(`[live-cam] item id=${garment.id} category=${garment.category ?? ''} source=${garment.source}`);
      console.log(`[live-cam] sleeve inference=${sleeveInference}`);
      console.log(`[live-cam] name exists=${!!name} description exists=${!!description} promptHint exists=${!!hint}`);
      const refExists = typeof refB64 === 'string' && refB64.length > 0;
      console.log(`[live-cam] reference image exists=${refExists}`);


      // 6. Ack resolver registry — keyed by step name.
      type Pending = { resolve: () => void; reject: (e: Error) => void; timer: number };
      const pending = new Map<string, Pending>();

      const matchAckKey = (parsed: any): string | null => {
        const t = parsed?.type;
        if (t === 'ack') {
          if (typeof parsed.name === 'string' && pending.has(parsed.name)) return parsed.name;
          if (typeof parsed.for === 'string' && pending.has(parsed.for)) return parsed.for;
          return null;
        }
        if (typeof t === 'string') {
          if (t.endsWith('_ack')) {
            const k = t.slice(0, -4);
            if (pending.has(k)) return k;
          }
          if (pending.has(t)) return t;
        }
        return null;
      };

      const waitForAck = (key: string, timeoutMs = 30_000) =>
        new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            pending.delete(key);
            console.log(`[live-cam] ${key} ack=false`);
            reject(new Error(`Worker did not acknowledge ${key}`));
          }, timeoutMs);
          pending.set(key, { resolve, reject, timer });
        });

      const rejectAllPending = (reason: string) => {
        for (const [, p] of pending) {
          window.clearTimeout(p.timer);
          p.reject(new Error(reason));
        }
        pending.clear();
      };

      // 7. Start frame loop helper — invoked only after both acks received.
      let handshakeStarted = false;
      let frameLoopStarted = false;
      const startFrameLoop = () => {
        if (frameLoopStarted) return;
        frameLoopStarted = true;

        if (startTimeoutRef.current !== null) {
          window.clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = null;
        }
        setStatus('running');

        const { captureWidth, captureHeight, fpsCap, jpegQuality } = cfgRef.current;
        const cap = document.createElement('canvas');
        cap.width = captureWidth;
        cap.height = captureHeight;
        captureCanvasRef.current = cap;
        const capCtx = cap.getContext('2d');
        if (!capCtx) {
          setErrorMessage('Capture canvas context unavailable');
          setStatus('failed');
          cleanupLocal();
          return;
        }

        const intervalMs = Math.floor(1000 / fpsCap);
        frameTimerRef.current = window.setInterval(() => {
          const wsNow2 = wsRef.current;
          const v = localVideoRef.current;
          if (!wsNow2 || wsNow2.readyState !== WebSocket.OPEN || !v || v.readyState < 2) return;
          if (wsNow2.bufferedAmount > 2_000_000) return;
          // Center-crop to the capture aspect instead of stretching the camera frame.
          const { sx, sy, sw, sh } = coverCropRect(v.videoWidth, v.videoHeight, captureWidth, captureHeight);
          capCtx.drawImage(v, sx, sy, sw, sh, 0, 0, captureWidth, captureHeight);
          cap.toBlob(
            async (blob) => {
              if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              if (wsRef.current.bufferedAmount > 2_000_000) return;
              try {
                const b64 = await blobToBase64(blob);
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                if (wsRef.current.bufferedAmount > 2_000_000) return;
                lastSendTsRef.current = performance.now();
                const { seq, tClientMs } = statsRef.current.nextFrame();
                wsRef.current.send(JSON.stringify({ type: 'frame', frame_b64: b64, seq, t_client_ms: tClientMs }));
              } catch {
                // skip frame
              }
            },
            'image/jpeg',
            jpegQuality,
          );
        }, intervalMs);
      };

      const runHandshake = async () => {
        if (handshakeStarted) return;
        handshakeStarted = true;
        const wsNow = wsRef.current;
        if (!wsNow || wsNow.readyState !== WebSocket.OPEN) return;

        if (!refExists) {
          setErrorMessage('Reference image missing');
          setStatus('failed');
          cleanupLocal();
          void callEnd();
          sessionIdRef.current = null;
          return;
        }

        try {
          // Step A: set_reference_image — register resolver before sending.
          const ackRef = waitForAck('set_reference_image');
          wsNow.send(JSON.stringify({ type: 'set_reference_image', image_b64: refB64 }));
          await ackRef;
          console.log('[live-cam] set_reference_image ack=true');

          // Step B: set_prompt — dedupe by hash so we never re-send within a session.
          console.log(`[live-cam] final prompt length=${finalPrompt.length}`);
          console.debug('[livecam] final prompt', finalPrompt);
          const promptHash = hashPrompt(finalPrompt);
          const sid = sessionIdRef.current ?? '';
          const baseLog = {
            ts: new Date().toISOString(),
            sessionId: sid,
            garmentId: garment?.id ?? '',
            len: finalPrompt.length,
            hash: promptHash,
          };

          if (lastPromptHashRef.current === promptHash) {
            console.log('[live-cam] set_prompt sent', {
              ...baseLog,
              count: setPromptCountRef.current,
              reason: 'duplicate_skipped' as SetPromptReason,
            });
          } else {
            const ackPrompt = waitForAck('set_prompt');
            const wsNow2 = wsRef.current;
            if (!wsNow2 || wsNow2.readyState !== WebSocket.OPEN) {
              throw new Error('WebSocket closed before prompt could be sent');
            }
            wsNow2.send(JSON.stringify({ type: 'set_prompt', prompt: finalPrompt, instruction: finalInstruction }));
            await ackPrompt;
            lastPromptHashRef.current = promptHash;
            setPromptCountRef.current += 1;
            const reason: SetPromptReason =
              setPromptCountRef.current === 1 ? 'initial_start' : 'unknown';
            console.log('[live-cam] set_prompt sent', {
              ...baseLog,
              count: setPromptCountRef.current,
              reason,
            });
          }


          activeGarmentIdRef.current = garment.id;
          startFrameLoop();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setErrorMessage(msg);
          setStatus('failed');
          cleanupLocal();
          void callEnd();
          sessionIdRef.current = null;
        }
      };

      // Swap the garment on the open socket: new reference image + prompt,
      // acknowledged like the initial handshake. No reconnect, no new GPU.
      swapGarmentRef.current = async (next: LiveCamGarmentSelection) => {
        const wsSwap = wsRef.current;
        if (!wsSwap || wsSwap.readyState !== WebSocket.OPEN) throw new Error('Session is not running');
        const resp = await fetch(next.referenceImageUrl, { mode: 'cors' });
        if (!resp.ok) throw new Error(`Reference image fetch failed (${resp.status})`);
        const nextBlob = await resp.blob();
        const nextRef = await blobToBase64(isLiveCamLegacy() ? nextBlob : await prepareGarmentImage(nextBlob));
        const meta = {
          category: next.category,
          name: next.label?.trim(),
          description: next.description?.trim(),
          promptHint: next.promptHint?.trim(),
        };
        const ackRef = waitForAck('set_reference_image');
        statsRef.current.markSwap();
        wsSwap.send(JSON.stringify({ type: 'set_reference_image', image_b64: nextRef }));
        await ackRef;
        const nextPrompt = buildTryOnPrompt(meta);
        const ackPrompt = waitForAck('set_prompt');
        wsSwap.send(JSON.stringify({ type: 'set_prompt', prompt: nextPrompt, instruction: buildTryOnInstruction(meta, { useHintDetails: !isLiveCamLegacy() }) }));
        await ackPrompt;
        lastPromptHashRef.current = hashPrompt(nextPrompt);
        activeGarmentIdRef.current = next.id;
        console.log(`[live-cam] garment swapped id=${next.id} category=${next.category ?? ''}`);
      };

      // 8. Bind message handler — handle warming | ready | ack | error | frame.
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        let parsed: any;
        try { parsed = JSON.parse(ev.data); } catch { return; }
        const t = parsed?.type;

        const ackKey = matchAckKey(parsed);
        if (ackKey) {
          const p = pending.get(ackKey);
          if (p) {
            window.clearTimeout(p.timer);
            pending.delete(ackKey);
            p.resolve();
          }
          return;
        }

        if (t === 'ready') {
          // The worker (JoyAI, or FluxRT 32206e8+) says which frame size, fps and JPEG quality it wants.
          const before = cfgRef.current;
          cfgRef.current = applyEngineHints(before, parsed);
          if (cfgRef.current !== before) {
            const c = cfgRef.current;
            const o = outputCanvasSize(c);
            console.log(`[live-cam] engine=${String(parsed.engine)} capture=${c.captureWidth}x${c.captureHeight} output=${o.width}x${o.height} fps=${c.fpsCap} q=${c.jpegQuality}`);
          }
          void runHandshake();
        } else if (t === 'frame' && typeof parsed.frame_b64 === 'string') {
          setNotice((n) => (n === null ? n : null));
          void renderRemoteFrame(parsed.frame_b64, parsed.seq, parsed.server_ms);
        } else if (t === 'status' && typeof parsed.status === 'string') {
          if (parsed.status === 'session_limit') {
            // GPU worker ended the session at the time cap; the socket closes next.
            setErrorMessage(null);
            setNotice('Session ended: 5-minute limit reached. Start again to continue.');
            setStatus('ended');
            cleanupLocal();
            void callEnd();
            sessionIdRef.current = null;
          } else {
            setNotice(STATUS_NOTICES[parsed.status] ?? null);
          }
        } else if (t === 'error') {
          const msg = typeof parsed.message === 'string' ? parsed.message : 'Worker error';
          rejectAllPending(msg);
          setErrorMessage(msg);
          setStatus('failed');
          cleanupLocal();
          void callEnd();
          sessionIdRef.current = null;
        }
      });
      ws.addEventListener('error', () => {
        rejectAllPending('WebSocket error');
      });
      ws.addEventListener('close', () => {
        rejectAllPending('WebSocket closed');
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
  }, [garment, tier, localVideoRef, cleanupLocal, callEnd, renderRemoteFrame]);

  // Picking a different garment while running swaps it in place.
  useEffect(() => {
    if (status !== 'running' || !garment) return;
    const active = activeGarmentIdRef.current;
    const swap = swapGarmentRef.current;
    if (!swap || active === null || active === garment.id) return;
    let cancelled = false;
    setNotice('Switching garment…');
    swap(garment)
      .then(() => { if (!cancelled) setNotice(null); })
      .catch((e: unknown) => {
        if (!cancelled) setNotice(`Could not switch garment: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => { cancelled = true; };
  }, [garment, status]);

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

  return {
    status,
    errorMessage,
    errorCode,
    notice,
    latencyMs,
    session,
    activeTier,
    start,
    stop,
    redrawLastFrame,
  };
}
