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
  /** Phone-side JPEG encode + base64 time per camera frame; shows when the phone limits the send rate. */
  encodeMsP50: number | null;
  encodeMsP95: number | null;
  /** Time to copy (crop + scale) one camera frame into the small capture canvas. */
  drawMsP50: number | null;
  /** How late the capture timer fires: high means the device's main thread is overloaded. */
  tickLagMsP50: number | null;
  /** Camera picture size actually delivered, e.g. "960x540". */
  camera: string | null;
  /** Capture ticks skipped because the previous frame was still encoding. */
  encodeSkipped: number;
  /** Capture ticks skipped because the upload was backed up (over 2 MB waiting): the network limits the send rate. */
  uploadBlocked: number;
  /** Frames skipped by the short upload queue (JoyAI): a newer frame replaced them before they could be sent. */
  sendQueueDropped: number;
  /** Buffered playback (F1b): frames drawn on cadence, and frames dropped to keep the buffer short. */
  framesPresented: number;
  presentedFps: number;
  playbackDropped: number;
  // Per-stage timing (kiosk speed work, 2026-11-12): camera -> resize -> encode -> send -> network
  // -> worker -> decode -> wait -> paint. "draw" above is the crop + resize step.
  /** New camera frames the page receives per second (requestVideoFrameCallback); null if unknown. */
  cameraFps: number | null;
  /** How old the camera frame was when it was picked up for sending. */
  cameraAgeMsP50: number | null;
  /** Send ticks skipped because the camera had no new frame (instead of re-sending the same picture). */
  staleSkipped: number;
  /** Where the JPEG is made: 'worker' (off the main thread) or 'main'. */
  encoder: string | null;
  /** Bytes still waiting in the upload when a frame was sent (KB, median). */
  upBacklogKbP50: number | null;
  /** Network round trip to the worker (ping -> pong), without the model. */
  netRttMsP50: number | null;
  /** Decoding one output JPEG. */
  decodeMsP50: number | null;
  /** Time a decoded output waits in the playback buffer before it is drawn (0 without the buffer). */
  waitMsP50: number | null;
  /** Drawing one output frame on screen. */
  paintMsP50: number | null;
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
  private encode: number[] = [];
  private encodeSkipped = 0;
  private draw: number[] = [];
  private tickLag: number[] = [];
  private camera: string | null = null;
  private uploadBlocked = 0;
  private sendQueueDropped = 0;
  private presented = 0;
  private presentedTimes: number[] = [];
  private playbackDropped = 0;
  private cameraFps: number | null = null;
  private cameraAge: number[] = [];
  private staleSkipped = 0;
  private encoder: string | null = null;
  private upBacklog: number[] = [];
  private netRtt: number[] = [];
  private decode: number[] = [];
  private wait: number[] = [];
  private paint: number[] = [];

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
    this.encode = [];
    this.encodeSkipped = 0;
    this.draw = [];
    this.tickLag = [];
    this.uploadBlocked = 0;
    this.sendQueueDropped = 0;
    this.presented = 0;
    this.presentedTimes = [];
    this.playbackDropped = 0;
    this.cameraFps = null;
    this.cameraAge = [];
    this.staleSkipped = 0;
    this.encoder = null;
    this.upBacklog = [];
    this.netRtt = [];
    this.decode = [];
    this.wait = [];
    this.paint = [];
  }

  setCameraFps(fps: number | null): void {
    this.cameraFps = typeof fps === 'number' && Number.isFinite(fps) ? fps : null;
  }

  onCameraAge(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.cameraAge, ms, KEEP_SAMPLES);
  }

  onStaleSkipped(): void {
    this.staleSkipped += 1;
  }

  setEncoder(mode: string | null): void {
    this.encoder = mode;
  }

  onUpBacklog(bytes: number): void {
    if (Number.isFinite(bytes) && bytes >= 0) pushBounded(this.upBacklog, bytes / 1024, KEEP_SAMPLES);
  }

  onNetRtt(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.netRtt, ms, KEEP_SAMPLES);
  }

  onDecode(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.decode, ms, KEEP_SAMPLES);
  }

  onWait(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.wait, ms, KEEP_SAMPLES);
  }

  onPaint(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.paint, ms, KEEP_SAMPLES);
  }

  /** A frame was drawn by the playback buffer. */
  onPresented(): void {
    this.presented += 1;
    pushBounded(this.presentedTimes, this.now(), KEEP_SAMPLES);
  }

  onPlaybackDropped(n = 1): void {
    this.playbackDropped += n;
  }

  onEncoded(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.encode, ms, KEEP_SAMPLES);
  }

  onDraw(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) pushBounded(this.draw, ms, KEEP_SAMPLES);
  }

  onTickLag(ms: number): void {
    if (Number.isFinite(ms)) pushBounded(this.tickLag, Math.max(0, ms), KEEP_SAMPLES);
  }

  setCamera(width: number, height: number): void {
    this.camera = width > 0 && height > 0 ? `${width}x${height}` : null;
  }

  onEncodeSkipped(): void {
    this.encodeSkipped += 1;
  }

  onUploadBlocked(): void {
    this.uploadBlocked += 1;
  }

  onSendQueueDropped(n = 1): void {
    if (n > 0) this.sendQueueDropped += n;
  }

  /**
   * Number and timestamp for the next camera frame. capturedAt: when the frame was ready to
   * send (a frame that waited in the upload queue still counts its wait in the round trip).
   */
  nextFrame(capturedAt?: number): { seq: number; tClientMs: number } {
    this.seq += 1;
    const t = typeof capturedAt === 'number' && Number.isFinite(capturedAt) ? capturedAt : this.now();
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
      encodeMsP50: percentile(this.encode, 50),
      encodeMsP95: percentile(this.encode, 95),
      drawMsP50: percentile(this.draw, 50),
      tickLagMsP50: percentile(this.tickLag, 50),
      camera: this.camera,
      encodeSkipped: this.encodeSkipped,
      uploadBlocked: this.uploadBlocked,
      sendQueueDropped: this.sendQueueDropped,
      framesPresented: this.presented,
      presentedFps: this.fps(this.presentedTimes),
      playbackDropped: this.playbackDropped,
      cameraFps: this.cameraFps,
      cameraAgeMsP50: percentile(this.cameraAge, 50),
      staleSkipped: this.staleSkipped,
      encoder: this.encoder,
      upBacklogKbP50: percentile(this.upBacklog, 50),
      netRttMsP50: percentile(this.netRtt, 50),
      decodeMsP50: percentile(this.decode, 50),
      waitMsP50: percentile(this.wait, 50),
      paintMsP50: percentile(this.paint, 50),
    };
  }
}

/** One line per stage, in pipeline order, for the debug overlay and the console. */
export function formatStageLine(s: LiveCamStatsSnapshot): string {
  const ms = (v: number | null) => (v === null ? '–' : `${v} ms`);
  return [
    `cam ${s.cameraFps === null ? '–' : `${s.cameraFps}/s`} ${s.camera ?? ''} age ${ms(s.cameraAgeMsP50)}`.replace(/\s+/g, ' '),
    `resize ${ms(s.drawMsP50)}`,
    `enc ${ms(s.encodeMsP50)}${s.encoder ? ` (${s.encoder})` : ''}`,
    `↑${s.sentFps}/s backlog ${s.upBacklogKbP50 === null ? '–' : `${s.upBacklogKbP50} KB`}`,
    `net ${ms(s.netRttMsP50)}`,
    `↓${s.receivedFps}/s`,
    `dec ${ms(s.decodeMsP50)}`,
    `wait ${ms(s.waitMsP50)}`,
    `paint ${ms(s.paintMsP50)}`,
    `same-frame skips ${s.staleSkipped}`,
  ].join(' · ');
}
