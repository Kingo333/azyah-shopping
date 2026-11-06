// Smooth playback for Live Cam frames (F1b). The GPU worker sends frames unevenly
// (FluxRT: bursts of interpolated frames; JoyAI: chunks of 4). Drawing each one the
// instant it arrives looks like judder. This jitter buffer holds a frame or two and
// presents them on a steady cadence derived from the measured arrival rate.
//
// Off by default: see resolvePlaybackMode(). Timing lives in pure functions that take
// a clock, so it is unit-testable; the hook drives present() from requestAnimationFrame.

export interface PlaybackOptions {
  /** Frames kept at most; older ones are dropped (each held frame ≈ one interval of delay). */
  maxBuffer: number;
  /** Clamp for the derived presentation rate. */
  minFps: number;
  maxFps: number;
  /** Weight of the newest inter-arrival interval in the running average. */
  emaAlpha: number;
  /** Fixed presentation rate (from the worker's playback_fps hint); overrides the estimate. */
  fixedFps?: number;
}

export const DEFAULT_PLAYBACK_OPTIONS: PlaybackOptions = {
  maxBuffer: 2,
  minFps: 8,
  maxFps: 60,
  emaAlpha: 0.2,
};

export interface PlaybackSnapshot {
  framesPresented: number;
  framesDropped: number;
  buffered: number;
  /** Current presentation interval in ms (null until the first frame). */
  intervalMs: number | null;
}

interface Buffered<T> {
  frame: T;
  arrivedAt: number;
}

/**
 * Jitter buffer + cadence. push() on arrival, next() from the display loop.
 * T is whatever the caller stores (a decoded bitmap); dropped frames are handed
 * back through onDrop so the caller can release them.
 */
export class PlaybackScheduler<T> {
  private readonly opts: PlaybackOptions;
  private buffer: Buffered<T>[] = [];
  private lastArrival: number | null = null;
  private emaIntervalMs: number | null = null;
  private lastPresentAt: number | null = null;
  private presented = 0;
  private dropped = 0;

  constructor(
    private readonly now: () => number,
    options: Partial<PlaybackOptions> = {},
    private readonly onDrop?: (frame: T) => void,
  ) {
    this.opts = { ...DEFAULT_PLAYBACK_OPTIONS, ...options };
  }

  /** A frame arrived. Returns how many older frames were dropped to make room. */
  push(frame: T): number {
    const t = this.now();
    if (this.lastArrival !== null) {
      const gap = t - this.lastArrival;
      // Gaps longer than a second are stalls (face gate, swap), not a rate signal.
      if (gap > 0 && gap <= 1000) {
        this.emaIntervalMs = this.emaIntervalMs === null
          ? gap
          : this.emaIntervalMs * (1 - this.opts.emaAlpha) + gap * this.opts.emaAlpha;
      }
    }
    this.lastArrival = t;
    this.buffer.push({ frame, arrivedAt: t });
    let droppedNow = 0;
    while (this.buffer.length > Math.max(1, this.opts.maxBuffer)) {
      const old = this.buffer.shift();
      if (old) {
        this.onDrop?.(old.frame);
        droppedNow += 1;
      }
    }
    this.dropped += droppedNow;
    return droppedNow;
  }

  /** Presentation interval: the fixed hint, else the clamped measured arrival rate. */
  intervalMs(): number {
    const { minFps, maxFps, fixedFps } = this.opts;
    const clamp = (fps: number) => Math.min(maxFps, Math.max(minFps, fps));
    if (fixedFps && Number.isFinite(fixedFps) && fixedFps > 0) return 1000 / clamp(fixedFps);
    if (this.emaIntervalMs === null) return 1000 / clamp(24);
    return 1000 / clamp(1000 / this.emaIntervalMs);
  }

  /** Milliseconds until the next frame is due (0 when due now, Infinity when empty). */
  dueIn(now: number = this.now()): number {
    if (this.buffer.length === 0) return Infinity;
    if (this.lastPresentAt === null) return 0;
    // Buffer full: catch up at once instead of letting delay grow.
    if (this.buffer.length >= Math.max(1, this.opts.maxBuffer)) return 0;
    return Math.max(0, this.lastPresentAt + this.intervalMs() - now);
  }

  /** The frame to present now, or null when none is due. Call once per display tick. */
  next(now: number = this.now()): T | null {
    if (this.dueIn(now) > 0) return null;
    const item = this.buffer.shift();
    if (!item) return null;
    this.lastPresentAt = now;
    this.presented += 1;
    return item.frame;
  }

  /** Drop everything (session end). Returns the frames so the caller can release them. */
  clear(): T[] {
    const out = this.buffer.map((b) => b.frame);
    this.buffer = [];
    this.lastArrival = null;
    this.lastPresentAt = null;
    return out;
  }

  snapshot(): PlaybackSnapshot {
    return {
      framesPresented: this.presented,
      framesDropped: this.dropped,
      buffered: this.buffer.length,
      intervalMs: this.lastArrival === null && !this.opts.fixedFps ? null : Math.round(this.intervalMs() * 10) / 10,
    };
  }
}

/**
 * Whether buffered playback is on. Precedence: URL/localStorage override, then the
 * worker's ready hint (playback_buffer), then off.
 */
export function resolvePlaybackMode(override: 'on' | 'off' | null, hint: boolean | undefined): boolean {
  if (override === 'on') return true;
  if (override === 'off') return false;
  return hint === true;
}
