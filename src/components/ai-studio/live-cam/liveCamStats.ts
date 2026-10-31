// Per-frame timing for Live Cam. The app numbers each camera frame and keeps its
// send time; JoyAI's adapter echoes the number with the matching output frame,
// so round-trip latency is measured on this device's clock only.
// FluxRT does not echo numbers; then only counters are kept.

const KEEP_SENT = 512;
const KEEP_SAMPLES = 600;

export interface LiveCamStatsSnapshot {
  framesSent: number;
  framesReceived: number;
  matchedFrames: number;
  sentFps: number;
  receivedFps: number;
  rttMsP50: number | null;
  rttMsP95: number | null;
  serverMsP50: number | null;
  serverMsP95: number | null;
  firstFrameMs: number | null;
  lastSwapGapMs: number | null;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[idx]);
}

function pushBounded(list: number[], v: number, max: number): void {
  list.push(v);
  if (list.length > max) list.splice(0, list.length - max);
}

export class LiveCamFrameStats {
  private seq = 0;
  private sent = new Map<number, number>();
  private rtt: number[] = [];
  private server: number[] = [];
  private sentTimes: number[] = [];
  private recvTimes: number[] = [];
  private framesSent = 0;
  private framesReceived = 0;
  private matched = 0;
  private startedAt: number | null = null;
  private firstFrameMs: number | null = null;
  private swapAt: number | null = null;
  private lastSwapGapMs: number | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  reset(): void {
    this.seq = 0;
    this.sent.clear();
    this.rtt = [];
    this.server = [];
    this.sentTimes = [];
    this.recvTimes = [];
    this.framesSent = 0;
    this.framesReceived = 0;
    this.matched = 0;
    this.startedAt = this.now();
    this.firstFrameMs = null;
    this.swapAt = null;
    this.lastSwapGapMs = null;
  }

  /** Number and timestamp for the next camera frame. */
  nextFrame(): { seq: number; tClientMs: number } {
    this.seq += 1;
    const t = this.now();
    this.sent.set(this.seq, t);
    if (this.sent.size > KEEP_SENT) {
      const oldest = this.sent.keys().next().value;
      if (oldest !== undefined) this.sent.delete(oldest);
    }
    this.framesSent += 1;
    pushBounded(this.sentTimes, t, KEEP_SAMPLES);
    return { seq: this.seq, tClientMs: Math.round(t * 10) / 10 };
  }

  markSwap(): void {
    this.swapAt = this.now();
  }

  /** Record an output frame. Returns the matched round-trip time, if known. */
  onFrame(seq: unknown, serverMs: unknown): number | null {
    const t = this.now();
    this.framesReceived += 1;
    pushBounded(this.recvTimes, t, KEEP_SAMPLES);
    if (this.firstFrameMs === null && this.startedAt !== null) this.firstFrameMs = Math.round(t - this.startedAt);
    if (this.swapAt !== null) {
      this.lastSwapGapMs = Math.round(t - this.swapAt);
      this.swapAt = null;
    }
    if (typeof serverMs === 'number' && Number.isFinite(serverMs)) pushBounded(this.server, serverMs, KEEP_SAMPLES);
    if (typeof seq !== 'number') return null;
    const sentAt = this.sent.get(seq);
    if (sentAt === undefined) return null;
    this.sent.delete(seq);
    const rtt = t - sentAt;
    this.matched += 1;
    pushBounded(this.rtt, rtt, KEEP_SAMPLES);
    return rtt;
  }

  private fps(times: number[]): number {
    const t = this.now();
    const recent = times.filter((x) => t - x <= 5000);
    return Math.round((recent.length / 5) * 10) / 10;
  }

  snapshot(): LiveCamStatsSnapshot {
    return {
      framesSent: this.framesSent,
      framesReceived: this.framesReceived,
      matchedFrames: this.matched,
      sentFps: this.fps(this.sentTimes),
      receivedFps: this.fps(this.recvTimes),
      rttMsP50: percentile(this.rtt, 50),
      rttMsP95: percentile(this.rtt, 95),
      serverMsP50: percentile(this.server, 50),
      serverMsP95: percentile(this.server, 95),
      firstFrameMs: this.firstFrameMs,
      lastSwapGapMs: this.lastSwapGapMs,
    };
  }
}
