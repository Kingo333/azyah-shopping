// Live Cam capture helpers (kiosk speed work, 2026-11-12).
//
// A 55-inch 4K Android standee sent ~0.9 NEW camera frames a second while the send timer ran at
// ~12/s (each frame repeated ~12x); the GPU worker was idle. These helpers make each stage visible
// and take work off the page's main thread:
// - CameraFrameClock counts the camera frames the page really gets (requestVideoFrameCallback),
//   so the send loop can skip ticks that would only repeat the last frame.
// - FrameEncoder crops + resizes with createImageBitmap and JPEG-encodes in a Web Worker
//   (OffscreenCanvas), falling back to a main-thread canvas. Same size, same quality.
//
// Why not canvas.toBlob (what the page used before): Chrome encodes toBlob JPEGs on the main
// thread only in idle time, and if no idle time comes it waits 1 s on desktop (4 s on Android)
// before forcing the encode (CanvasAsyncBlobCreator, kIdleTaskStartTimeoutDelayMs). A page that
// keeps missing its frame budget gets no idle time, so with one encode at a time it sends about
// one frame a second. That matches the 4K kiosk: ~0.97 new frames/s. Measured in Chromium 141 on
// a page busy 20 ms per frame: toBlob 1060 ms, toDataURL 2 ms, worker 21 ms. All three give
// byte-identical JPEGs. Workers encode at once, and toDataURL is synchronous, so neither waits.
// - PageLoadMonitor shows how loaded the page is (frames/s it gets, long main-thread tasks).

export type EncoderMode = 'worker' | 'main';

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface EncodedFrame {
  b64: string;
  /** Crop + resize to the send size (createImageBitmap, or drawImage on the main thread). */
  resizeMs: number;
  /** JPEG encode + base64. */
  encodeMs: number;
  mode: EncoderMode;
}

interface VideoFrameMetaLike {
  captureTime?: number;
  presentedFrames?: number;
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: VideoFrameMetaLike) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/** Counts the camera frames the page actually receives. Without requestVideoFrameCallback it is inert. */
export class CameraFrameClock {
  readonly supported: boolean;
  private id: number | null = null;
  private times: number[] = [];
  private version = 0;
  private lastAt: number | null = null;
  private lastCallback: number | null = null;

  constructor(private readonly video: VideoWithFrameCallback, private readonly now: () => number = () => performance.now()) {
    this.supported = typeof video.requestVideoFrameCallback === 'function';
  }

  start(): void {
    if (!this.supported || this.id !== null) return;
    const loop = (_t: number, meta: VideoFrameMetaLike) => {
      this.onFrame(meta);
      if (this.id !== null) this.id = this.video.requestVideoFrameCallback!(loop);
    };
    this.id = this.video.requestVideoFrameCallback!(loop);
  }

  stop(): void {
    if (this.id !== null) this.video.cancelVideoFrameCallback?.(this.id);
    this.id = null;
  }

  /** One new camera frame (public for tests). */
  onFrame(meta?: VideoFrameMetaLike): void {
    const t = this.now();
    this.version += 1;
    this.lastCallback = t;
    // captureTime: when the camera took the frame, on performance.now()'s clock (Chrome, camera streams).
    this.lastAt = typeof meta?.captureTime === 'number' && meta.captureTime > 0 && meta.captureTime <= t ? meta.captureTime : t;
    this.times.push(t);
    if (this.times.length > 600) this.times.splice(0, this.times.length - 600);
  }

  /** Changes with every new camera frame. */
  get frameVersion(): number {
    return this.version;
  }

  /** When the newest frame was captured (or, without a capture time, arrived). */
  get lastFrameAt(): number | null {
    return this.lastAt;
  }

  /** When the clock last ticked; null before the first frame. */
  get lastCallbackAt(): number | null {
    return this.lastCallback;
  }

  /** New camera frames per second over the last windowMs; null when unsupported. */
  fps(windowMs = 5000): number | null {
    if (!this.supported) return null;
    const t = this.now();
    const n = this.times.filter((x) => t - x <= windowMs).length;
    return Math.round((n / (windowMs / 1000)) * 10) / 10;
  }
}

/**
 * Skip this send tick? Only when the camera clock works and no new frame has arrived since the
 * last frame sent. A clock that has not ticked for staleMs is treated as broken (send as before).
 */
export function noNewCameraFrame(
  clock: Pick<CameraFrameClock, 'supported' | 'frameVersion' | 'lastCallbackAt'>,
  lastSentVersion: number,
  now: number,
  staleMs = 2000,
): boolean {
  if (!clock.supported || clock.lastCallbackAt === null) return false;
  if (now - clock.lastCallbackAt > staleMs) return false;
  return clock.frameVersion === lastSentVersion;
}

export function canEncodeOffThread(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof (OffscreenCanvas.prototype as { convertToBlob?: unknown }).convertToBlob === 'function' &&
    typeof createImageBitmap === 'function'
  );
}

function defaultWorker(): Worker {
  return new Worker(new URL('./liveCamEncode.worker.ts', import.meta.url), { type: 'module' });
}

const WORKER_TIMEOUT_MS = 2000;

/** Crop + resize + JPEG for one camera frame; the worker path when the browser has it. */
export class FrameEncoder {
  mode: EncoderMode = 'main';
  private worker: Worker | null = null;
  private nextId = 1;
  private waiting = new Map<number, { resolve: (v: { b64: string; ms: number } | null) => void; timer: ReturnType<typeof setTimeout> }>();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  /** Why the worker path was left, if it was. */
  fallbackReason: string | null = null;

  constructor(prefer: EncoderMode, makeWorker: () => Worker = defaultWorker, offThreadOk: boolean = canEncodeOffThread()) {
    if (prefer !== 'worker' || !offThreadOk) return;
    try {
      const w = makeWorker();
      w.onmessage = (e: MessageEvent) => this.onWorkerMessage(e.data);
      w.onerror = () => this.fallBack('worker error');
      this.worker = w;
      this.mode = 'worker';
    } catch (e) {
      this.fallbackReason = `worker unavailable: ${String(e)}`;
    }
  }

  async encode(src: CanvasImageSource, crop: CropRect, width: number, height: number, quality: number): Promise<EncodedFrame | null> {
    if (this.mode === 'worker' && this.worker) {
      const t0 = performance.now();
      let bitmap: ImageBitmap;
      try {
        // Crop and resize in one step; the worker draws it at exactly width x height either way
        // (browsers without the resize options hand over the crop at full size). 'low' = the
        // canvas path's default smoothing, so the model sees the same picture.
        bitmap = await createImageBitmap(
          src as ImageBitmapSource,
          Math.round(crop.sx), Math.round(crop.sy), Math.max(1, Math.round(crop.sw)), Math.max(1, Math.round(crop.sh)),
          { resizeWidth: width, resizeHeight: height, resizeQuality: 'low' },
        );
      } catch (e) {
        this.fallBack(`createImageBitmap failed: ${String(e)}`);
        return this.encodeMain(src, crop, width, height, quality);
      }
      const resizeMs = performance.now() - t0;
      const res = await this.post(bitmap, width, height, quality);
      if (res) return { b64: res.b64, resizeMs, encodeMs: res.ms, mode: 'worker' };
      this.fallBack('worker gave no frame');
      return null; // this frame is skipped; the next one goes the main-thread way
    }
    return this.encodeMain(src, crop, width, height, quality);
  }

  dispose(): void {
    for (const [, w] of this.waiting) {
      clearTimeout(w.timer);
      w.resolve(null);
    }
    this.waiting.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  private post(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<{ b64: string; ms: number } | null> {
    const worker = this.worker;
    if (!worker) {
      bitmap.close?.();
      return Promise.resolve(null);
    }
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        resolve(null);
      }, WORKER_TIMEOUT_MS);
      this.waiting.set(id, { resolve, timer });
      try {
        worker.postMessage({ id, bitmap, width, height, quality }, [bitmap]);
      } catch {
        clearTimeout(timer);
        this.waiting.delete(id);
        bitmap.close?.();
        resolve(null);
      }
    });
  }

  private onWorkerMessage(data: { id?: number; b64?: string; ms?: number; error?: string }): void {
    const w = typeof data?.id === 'number' ? this.waiting.get(data.id) : undefined;
    if (!w) return;
    clearTimeout(w.timer);
    this.waiting.delete(data.id as number);
    if (typeof data.b64 === 'string' && data.b64) w.resolve({ b64: data.b64, ms: typeof data.ms === 'number' ? data.ms : 0 });
    else w.resolve(null);
  }

  private fallBack(reason: string): void {
    if (this.mode === 'main') return;
    this.fallbackReason = reason;
    this.mode = 'main';
    console.warn(`[live-cam] encoder: main thread from now on (${reason})`);
    this.dispose();
  }

  /**
   * Main-thread path: draw into a small canvas, then toDataURL JPEG. toDataURL encodes at once
   * (a few ms at 288x512); canvas.toBlob would wait for idle time, up to 1 s (see the top).
   */
  private encodeMain(src: CanvasImageSource, crop: CropRect, width: number, height: number, quality: number): Promise<EncodedFrame | null> {
    if (!this.canvas) this.canvas = document.createElement('canvas');
    const canvas = this.canvas;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = this.ctx ?? (this.ctx = canvas.getContext('2d'));
    if (!ctx) return Promise.resolve(null);
    const t0 = performance.now();
    try {
      ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
    } catch {
      return Promise.resolve(null);
    }
    const resizeMs = performance.now() - t0;
    try {
      const url = canvas.toDataURL('image/jpeg', quality);
      const comma = url.indexOf(',');
      if (!url.startsWith('data:image/jpeg') || comma < 0) return Promise.resolve(null);
      const b64 = url.slice(comma + 1);
      return Promise.resolve({ b64, resizeMs, encodeMs: performance.now() - t0 - resizeMs, mode: 'main' });
    } catch {
      return Promise.resolve(null);
    }
  }
}

interface PerformanceObserverLike {
  observe(options: { type: string; buffered?: boolean }): void;
  disconnect(): void;
}

/**
 * How loaded the page is, for the stage readout: display frames the page gets per second
 * (below the screen's rate = the page misses frames) and main-thread long-task time per second
 * (Long Tasks API; null where the browser has none).
 */
export class PageLoadMonitor {
  private raf: number | null = null;
  private frames: number[] = [];
  private longTasks: Array<{ at: number; ms: number }> = [];
  private observer: PerformanceObserverLike | null = null;
  private longTasksSupported = false;

  constructor(private readonly now: () => number = () => performance.now()) {}

  start(): void {
    if (this.raf === null && typeof requestAnimationFrame === 'function') {
      const loop = () => {
        this.onFrame();
        if (this.raf !== null) this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    if (this.observer) return;
    try {
      const PO = (globalThis as { PerformanceObserver?: { new (cb: (list: { getEntries(): Array<{ duration: number }> }) => void): PerformanceObserverLike; supportedEntryTypes?: readonly string[] } }).PerformanceObserver;
      if (PO && PO.supportedEntryTypes?.includes('longtask')) {
        const obs = new PO((list) => {
          for (const e of list.getEntries()) this.onLongTask(e.duration);
        });
        obs.observe({ type: 'longtask', buffered: false });
        this.observer = obs;
        this.longTasksSupported = true;
      }
    } catch {
      this.observer = null;
    }
  }

  stop(): void {
    if (this.raf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
    this.raf = null;
    try {
      this.observer?.disconnect();
    } catch {
      /* already gone */
    }
    this.observer = null;
  }

  /** One display frame (public for tests). */
  onFrame(): void {
    const t = this.now();
    this.frames.push(t);
    if (this.frames.length > 600) this.frames.splice(0, this.frames.length - 600);
  }

  /** One long main-thread task (public for tests). */
  onLongTask(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.longTasksSupported = true;
    this.longTasks.push({ at: this.now(), ms });
    if (this.longTasks.length > 600) this.longTasks.splice(0, this.longTasks.length - 600);
  }

  /** Display frames per second over the last windowMs; null before any frame. */
  fps(windowMs = 5000): number | null {
    if (this.frames.length === 0) return null;
    const t = this.now();
    const n = this.frames.filter((x) => t - x <= windowMs).length;
    return Math.round((n / (windowMs / 1000)) * 10) / 10;
  }

  /** Long-task milliseconds per second over the last windowMs; null where unsupported. */
  longTaskMsPerS(windowMs = 5000): number | null {
    if (!this.longTasksSupported) return null;
    const t = this.now();
    const total = this.longTasks.filter((x) => t - x.at <= windowMs).reduce((a, x) => a + x.ms, 0);
    return Math.round(total / (windowMs / 1000));
  }
}
