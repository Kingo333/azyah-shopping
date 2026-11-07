import { describe, expect, it } from 'vitest';
import {
  JOYAI_SEND_QUEUE_FRAMES,
  LEGACY_SEND_QUEUE_BYTES,
  SendQueue,
  parseSendQueueFrames,
  sendQueueFrames,
} from '../liveCamSendQueue';
import { liveCamSendQueueOverride } from '../liveCamFlags';
import { LiveCamFrameStats } from '../liveCamStats';
import { LIVE_CAM_CONFIG, applyEngineHints } from '../liveCamTier';

const KB = 1000;
const FRAME = 60 * KB; // a 480x840 JoyAI frame as base64, roughly

describe('sendQueueFrames: JoyAI gets the short queue, FluxRT keeps the old rule', () => {
  it('defaults to 4 frames for JoyAI only', () => {
    expect(JOYAI_SEND_QUEUE_FRAMES).toBe(4);
    expect(sendQueueFrames('joyai', null)).toBe(4);
    expect(sendQueueFrames('fluxrt', null)).toBe(0);
    expect(sendQueueFrames(undefined, null)).toBe(0); // old workers say no engine
  });
  it('the override tunes JoyAI (0 = old 2 MB rule) and never touches FluxRT', () => {
    expect(sendQueueFrames('joyai', 8)).toBe(8);
    expect(sendQueueFrames('joyai', 0)).toBe(0);
    expect(sendQueueFrames('fluxrt', 8)).toBe(0);
  });
  it('the ready message records the engine in the config', () => {
    expect(applyEngineHints(LIVE_CAM_CONFIG, { engine: 'joyai', input_width: 480, input_height: 840 }).engine).toBe('joyai');
    expect(applyEngineHints(LIVE_CAM_CONFIG, { engine: 'fluxrt' }).engine).toBe('fluxrt');
    expect(applyEngineHints(LIVE_CAM_CONFIG, {}).engine).toBeUndefined();
  });
});

describe('?livecam_sendq override', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it('reads 0-30 frames from the URL and remembers it on the device', () => {
    const s = store();
    expect(liveCamSendQueueOverride('?livecam_sendq=6', s)).toBe(6);
    expect(liveCamSendQueueOverride('', s)).toBe(6);
    expect(liveCamSendQueueOverride('?livecam_sendq=0', s)).toBe(0);
    expect(liveCamSendQueueOverride('', s)).toBe(0);
  });
  it('anything else means the default, which also clears a remembered value', () => {
    const s = store();
    liveCamSendQueueOverride('?livecam_sendq=2', s);
    expect(liveCamSendQueueOverride('?livecam_sendq=default', s)).toBeNull();
    expect(liveCamSendQueueOverride('', s)).toBeNull();
    for (const v of ['31', '-1', '2.5', 'x', '']) expect(parseSendQueueFrames(v)).toBeNull();
    expect(parseSendQueueFrames(' 12 ')).toBe(12);
    expect(liveCamSendQueueOverride(undefined, undefined)).toBeNull();
  });
});

describe('SendQueue (JoyAI, 4 frames): the newest frame goes next, stale ones never pile up', () => {
  it('sends straight away while the upload keeps up', () => {
    const q = new SendQueue<number>(4);
    expect(q.offer(1, FRAME, 0)).toBe(1);
    expect(q.offer(2, FRAME, 2 * FRAME)).toBe(2);   // 3 frames waiting in the socket: room for a 4th
    expect(q.droppedCount).toBe(0);
  });
  it('holds a frame once about 4 are waiting, and a newer one replaces it', () => {
    const q = new SendQueue<number>(4);
    q.offer(1, FRAME, 0);
    expect(q.offer(2, FRAME, 4 * FRAME)).toBeNull();  // full: frame 2 waits here
    expect(q.pending).toBe(2);
    expect(q.offer(3, FRAME, 4 * FRAME)).toBeNull();  // frame 3 replaces it (the older one is skipped)
    expect(q.pending).toBe(3);
    expect(q.droppedCount).toBe(1);
    expect(q.poll(4 * FRAME)).toBeNull();             // still no room
    expect(q.poll(2 * FRAME)).toBe(3);                // room: the newest waiting frame goes
    expect(q.pending).toBeNull();
  });
  it('a slow upload never builds more than ~4 frames of delay, whatever the camera does', () => {
    const q = new SendQueue<number>(4);
    let buffered = 0;
    let sent = 0;
    for (let i = 0; i < 240; i += 1) {         // 10 s of camera at 24 fps
      buffered = Math.max(0, buffered - FRAME / 2); // the uplink only manages 12 fps
      const held = q.poll(buffered);
      if (held !== null) { buffered += FRAME; sent += 1; }
      const now = q.offer(i, FRAME, buffered);
      if (now !== null) { buffered += FRAME; sent += 1; }
      expect(buffered).toBeLessThanOrEqual(4 * FRAME + FRAME);
    }
    expect(sent).toBeGreaterThan(100);          // about half the frames still go
    expect(q.droppedCount).toBeGreaterThan(80); // the rest are skipped instead of queued
  });
  it('an empty socket always takes the frame, even a large one', () => {
    const q = new SendQueue<number>(1);
    q.offer(1, FRAME, 0);
    expect(q.offer(2, 10 * FRAME, 0)).toBe(2);
  });
  it('limit follows the real frame size', () => {
    const q = new SendQueue<number>(4);
    q.offer(1, 50 * KB, 0);
    expect(q.limitBytes()).toBe(200 * KB);
    q.clear();
    expect(q.pending).toBeNull();
  });
});

describe('SendQueue with 0 frames: the old rule (FluxRT, or ?livecam_sendq=0)', () => {
  it('sends until 2 MB is waiting, then skips; nothing is ever held', () => {
    const q = new SendQueue<number>(0);
    expect(q.limitBytes()).toBe(LEGACY_SEND_QUEUE_BYTES);
    expect(q.offer(1, FRAME, 1_900_000)).toBe(1);
    expect(q.offer(2, FRAME, 2_000_001)).toBeNull();
    expect(q.pending).toBeNull();
    expect(q.poll(0)).toBeNull();
  });
});

describe('stats: queue drops on the debug line, and the round trip counts the wait', () => {
  it('counts drops and starts the clock when the frame was ready, not when it left', () => {
    let t = 1000;
    const s = new LiveCamFrameStats(() => t);
    s.reset();
    s.onSendQueueDropped(2);
    s.onSendQueueDropped(0);
    const { seq } = s.nextFrame(900);   // frame ready at 900, waited in the queue until 1000
    t = 1500;
    expect(s.onFrame(seq, undefined)).toBe(600);
    expect(s.snapshot().sendQueueDropped).toBe(2);
    s.reset();
    expect(s.snapshot().sendQueueDropped).toBe(0);
  });
});
