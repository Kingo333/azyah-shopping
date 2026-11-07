// Capture-time playout for JoyAI (owner, 7 Nov 2026).
//
// JoyAI returns frames in bursts of 8 (one chunk every ~0.33 s) and echoes, for each one,
// the phone's own timestamp of the camera frame it came from (t_client_ms). Instead of
// playing whatever has arrived at a fixed 24 fps (which fast-forwards when frames are
// missing, then freezes), each frame is shown a fixed delay L after it was captured:
//
//     show(frame) = capture time + L
//
// so the motion keeps its real speed: a skipped camera frame is a held frame, never a
// fast-forward. L is the smallest delay that covers almost every frame: the 98th
// percentile of recent (arrival - capture) delays, plus 20 ms. When frames start arriving
// later, L rises at once (one hold, then smooth again); when they arrive sooner, L comes
// down gently (playback at most 25% faster while it does).
//
// Garment swaps, the session start and pauses (face check) make the next frames late by
// nature. Those frames still play, but their delays are kept out of the long-run
// estimate for 1.5 s, so one swap does not leave the whole session with extra lag.
//
// Chosen by simulating the whole loop (camera, upload queue, JoyAI chunks, download,
// playback) on five network profiles, against the fixed 24 fps buffer (target 8 / max 16).
// The fixed buffer is still available with ?livecam_playout=buffer.
//
// Pure: no DOM, the caller passes the clock (performance.now) and draws the frames.

export interface CaptureTimePlayoutOptions {
  /** Share of frames that should arrive in time for their slot. */
  quantile: number;
  /** Delay samples kept (240 ≈ 10 s at 24 fps). */
  window: number;
  /** Extra delay on top of the quantile. */
  marginMs: number;
  /** How fast L may come down, as a share of real time (0.25 = playback up to 25% faster). */
  maxSpeedup: number;
  /** Never play more than this far behind the camera. */
  maxDelayMs: number;
  /** After a disruption, delays are kept out of the long-run estimate this long. */
  settleMs: number;
  /** A gap this long between arriving frames counts as a disruption (pause, restart). */
  gapMs: number;
  /** While settling, L covers this share of the disruption frames' delays. */
  settleQuantile: number;
}

export const DEFAULT_PLAYOUT_OPTIONS: CaptureTimePlayoutOptions = {
  quantile: 0.98,
  window: 240,
  marginMs: 20,
  maxSpeedup: 0.25,
  maxDelayMs: 3000,
  settleMs: 1500,
  gapMs: 1000,
  settleQuantile: 0.85,
};

export interface PlayoutSnapshot {
  framesPresented: number;
  framesDropped: number;
  buffered: number;
  /** Current delay behind the camera (ms), null until the first frame. */
  delayMs: number | null;
}

function quantileOf(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

export class CaptureTimePlayout<T> {
  private readonly o: CaptureTimePlayoutOptions;
  private buf: { frame: T; c: number }[] = [];
  private delays: number[] = [];
  private settleDelays: number[] = [];
  private steadyQ: number | null = null;
  private L: number | null = null;
  private lastC = -Infinity;
  private lastTick: number | null = null;
  private lastArrival: number | null = null;
  private settleUntil = -Infinity;
  private awaitingFirst = true; // the session start is a disruption too
  private presented = 0;
  private dropped = 0;

  constructor(
    private readonly now: () => number,
    options: Partial<CaptureTimePlayoutOptions> = {},
    private readonly onDrop?: (frame: T) => void,
  ) {
    this.o = { ...DEFAULT_PLAYOUT_OPTIONS, ...options };
  }

  /** Current delay behind the camera (ms). */
  get delayMs(): number | null {
    return this.L === null ? null : Math.round(this.L);
  }

  /** A known disruption (garment swap): settle from the first frame that arrives after it. */
  transient(): void {
    this.awaitingFirst = true;
    this.settleUntil = Infinity;
    this.settleDelays = [];
  }

  private target(now: number): number | null {
    let t = this.steadyQ;
    if (now < this.settleUntil && this.settleDelays.length) {
      const s = quantileOf(this.settleDelays, this.o.settleQuantile);
      t = t === null ? s : Math.max(t, s);
    }
    return t === null ? null : Math.min(this.o.maxDelayMs, t + this.o.marginMs);
  }

  /**
   * A decoded frame arrived. captureMs: the phone's timestamp of its camera frame (the
   * worker's t_client_ms echo); without one the frame is shown as soon as possible.
   * Returns the number of frames dropped (an older frame than one already shown).
   */
  push(frame: T, captureMs?: number | null): number {
    const now = this.now();
    if (this.lastArrival !== null && now - this.lastArrival > this.o.gapMs) this.transient();
    this.lastArrival = now;
    if (this.awaitingFirst) {
      this.awaitingFirst = false;
      this.settleUntil = now + this.o.settleMs;
    }
    let c: number;
    if (typeof captureMs === 'number' && Number.isFinite(captureMs) && captureMs <= now) {
      c = captureMs;
      const d = now - c;
      if (now >= this.settleUntil) {
        this.delays.push(d);
        if (this.delays.length > this.o.window) this.delays.shift();
        this.steadyQ = quantileOf(this.delays, this.o.quantile);
      } else {
        this.settleDelays.push(d);
      }
    } else {
      c = Math.max(this.lastC + 0.001, now - (this.L ?? 0)); // no timestamp: due now
    }
    if (c <= this.lastC) {
      this.dropped += 1;
      this.onDrop?.(frame);
      return 1;
    }
    if (this.L === null) this.L = this.target(now);
    let i = this.buf.length;
    while (i > 0 && this.buf[i - 1].c > c) i -= 1;
    this.buf.splice(i, 0, { frame, c });
    return 0;
  }

  /** The frame to show now, or null. Call once per display tick (requestAnimationFrame). */
  next(now: number = this.now()): T | null {
    const target = this.target(now);
    if (this.L === null && target !== null) this.L = target;
    if (this.L === null || target === null) {
      // No delay estimate yet: show the newest frame as it comes.
      this.lastTick = now;
      return this.take(this.buf.length - 1);
    }
    if (target > this.L) {
      this.L = target; // frames are arriving later: wait for them now (one hold, then smooth)
    } else if (this.lastTick !== null) {
      this.L = Math.max(target, this.L - this.o.maxSpeedup * Math.max(0, now - this.lastTick));
    }
    this.lastTick = now;
    let idx = -1;
    for (let i = 0; i < this.buf.length; i += 1) {
      if (this.buf[i].c + this.L <= now) idx = i;
      else break;
    }
    return this.take(idx);
  }

  /** Show buf[idx], dropping the older frames that are also due. */
  private take(idx: number): T | null {
    if (idx < 0) return null;
    for (let i = 0; i < idx; i += 1) {
      this.dropped += 1;
      this.onDrop?.(this.buf[i].frame);
    }
    const item = this.buf[idx];
    this.buf.splice(0, idx + 1);
    this.lastC = item.c;
    this.presented += 1;
    return item.frame;
  }

  /** Drop everything (session end). Returns the frames so the caller can release them. */
  clear(): T[] {
    const out = this.buf.map((b) => b.frame);
    this.buf = [];
    return out;
  }

  snapshot(): PlayoutSnapshot {
    return { framesPresented: this.presented, framesDropped: this.dropped, buffered: this.buf.length, delayMs: this.delayMs };
  }
}
