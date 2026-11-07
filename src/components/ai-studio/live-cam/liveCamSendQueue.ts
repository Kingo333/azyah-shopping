// Short upload queue for JoyAI (owner, 7 Nov 2026).
//
// The phone sends ~24 camera frames a second to JoyAI. When its upload is slower than
// that, frames used to pile up in the browser's send buffer until 2 MB were waiting
// (~30-50 frames, 1.5-3 s): every frame reached JoyAI late, so the try-on lagged by
// seconds. With this queue at most about `frames` frames wait: a frame is handed to the
// socket only while less than that is already waiting, and while it cannot be sent it
// waits here, where a newer frame replaces it (the older one is skipped). So the newest
// frame always goes next and stale ones never pile up.
//
// Frames already handed to the socket cannot be taken back, so the limit is applied
// before they are handed over. FluxRT keeps the old 2 MB rule (its worker already keeps
// only the newest frame). 0 frames = the old rule for JoyAI too.
//
// Pure (no DOM): the hook passes in the socket's bufferedAmount.

/** The old rule: skip a frame only once this much is waiting to be uploaded. */
export const LEGACY_SEND_QUEUE_BYTES = 2_000_000;
/** JoyAI default: about this many frames may wait (≈170 ms at 24 fps). */
export const JOYAI_SEND_QUEUE_FRAMES = 4;
export const MAX_SEND_QUEUE_FRAMES = 30;

/**
 * Frames allowed to wait for upload. 0 means the old 2 MB rule.
 * engine: from the worker's ready message (undefined for old workers).
 * override: ?livecam_sendq=<frames> / localStorage (null = default).
 */
export function sendQueueFrames(engine: string | undefined, override: number | null): number {
  if (engine !== 'joyai') return 0;
  if (override !== null) return override;
  return JOYAI_SEND_QUEUE_FRAMES;
}

/** "?livecam_sendq=" value -> frames (0-30), or null for anything else (default). */
export function parseSendQueueFrames(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const v = value.trim();
  if (!/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n <= MAX_SEND_QUEUE_FRAMES ? n : null;
}

export class SendQueue<T> {
  private waiting: { item: T; bytes: number } | null = null;
  private avgBytes: number | null = null;
  private dropped = 0;

  /** frames: see sendQueueFrames (0 = old 2 MB rule, nothing held here). */
  constructor(readonly frames: number) {}

  /** Frames skipped so far because a newer one replaced them, or the old rule refused them. */
  get droppedCount(): number {
    return this.dropped;
  }

  /** The frame waiting here, if any (for tests). */
  get pending(): T | null {
    return this.waiting?.item ?? null;
  }

  /** Bytes that may be waiting in the socket before another frame is handed over. */
  limitBytes(): number {
    if (this.frames <= 0) return LEGACY_SEND_QUEUE_BYTES;
    return Math.max(1, this.frames) * (this.avgBytes ?? 0);
  }

  private fits(buffered: number, bytes: number): boolean {
    if (this.frames <= 0) return buffered <= LEGACY_SEND_QUEUE_BYTES;
    // An empty socket always takes the frame, however large.
    return buffered <= 0 || buffered + bytes <= this.limitBytes();
  }

  /**
   * A new encoded frame. Returns it when it should be sent now, else null (it waits here,
   * replacing any older waiting frame; with the old rule it is skipped).
   */
  offer(item: T, bytes: number, buffered: number): T | null {
    this.avgBytes = this.avgBytes === null ? bytes : this.avgBytes * 0.8 + bytes * 0.2;
    if (this.waiting) {
      this.waiting = null;
      this.dropped += 1; // the newest frame wins
    }
    if (this.fits(buffered, bytes)) return item;
    if (this.frames <= 0) {
      this.dropped += 1;
      return null;
    }
    this.waiting = { item, bytes };
    return null;
  }

  /** The waiting frame, once the socket has room for it (call on every capture tick). */
  poll(buffered: number): T | null {
    if (!this.waiting || !this.fits(buffered, this.waiting.bytes)) return null;
    const { item } = this.waiting;
    this.waiting = null;
    return item;
  }

  clear(): void {
    this.waiting = null;
  }
}
