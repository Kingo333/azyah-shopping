import { describe, expect, it } from 'vitest';
import {
  ARRANGING_LINES,
  FRESH_SESSION_AFTER_MS,
  GUIDE_INTRO_MS,
  WAIT_COPY,
  WAIT_STEP_LABELS,
  arrangingLine,
  endOnHidden,
  needsFreshSession,
  needsFreshTokenAtReady,
  showFramingGuide,
  waitEstimateMs,
  waitMode,
  waitProgress,
  waitSteps,
  waitView,
  CARD_DELAY_MS,
  WARM_READY_MS,
} from '../liveCamWait';

const EST = 180_000;
const states = (anchor: Parameters<typeof waitSteps>[0], t: number) => waitSteps(anchor, t, EST).map((s) => s.state).join(' ');

describe('shopper words only', () => {
  it('never mentions the machinery', () => {
    const everything = [...Object.values(WAIT_STEP_LABELS), ...ARRANGING_LINES, ...Object.values(WAIT_COPY).map((v) => (typeof v === 'function' ? v(3) : v))].join(' ').toLowerCase();
    for (const banned of ['gpu', 'engine', 'model', 'server', 'pod', 'worker', 'load', 'warm']) {
      expect(everything, banned).not.toContain(banned);
    }
  });
  it('posts the estimate in minutes', () => {
    expect(WAIT_COPY.line(3)).toBe("We're getting your mirror ready. About 3 minutes.");
    expect(WAIT_COPY.about(3)).toBe('About 3 min');
    expect(WAIT_COPY.line(1)).toContain('1 minute.');
  });
});

describe('waitEstimateMs', () => {
  it('defaults to 3 minutes and takes an override of 1-15', () => {
    expect(waitEstimateMs(undefined)).toBe(180_000);
    expect(waitEstimateMs('4')).toBe(240_000);
    expect(waitEstimateMs('x')).toBe(180_000);
    expect(waitEstimateMs('40')).toBe(180_000);
  });
});

describe('waitSteps: two quick ticks, then the slow finish', () => {
  it('ticks the first two steps within seconds, whatever the worker is doing', () => {
    expect(states('requested', 0)).toBe('active todo todo todo todo');
    expect(states('requested', 1_000)).toBe('done active todo todo todo');
    expect(states('requested', 4_000)).toBe('done done active todo todo');
    expect(states('connected', 2_000)).toBe('done active todo todo todo'); // not hurried by the worker either
  });
  it('arranging takes the long middle; last touches starts by itself at 80% of the estimate', () => {
    expect(states('connected', 0.79 * EST)).toBe('done done active todo todo');
    expect(states('connected', 0.8 * EST)).toBe('done done done active todo');
    expect(states('requested', 3 * EST)).toBe('done done done active todo'); // still never "ready"
  });
  it('ready moves to the last step; live finishes everything (the cascade)', () => {
    expect(states('ready', 2_000)).toBe('done done done done active');
    expect(states('live', 2_000)).toBe('done done done done done');
  });
});

describe('waitProgress: quick opening, slower finish, never stalls, never done early', () => {
  it('opens fast: about a third in the first 10 s, more than half of that in the first 3 s', () => {
    expect(waitProgress('requested', 0, EST)).toBe(0);
    expect(waitProgress('requested', 3_000, EST)).toBeGreaterThan(0.17);
    expect(waitProgress('requested', 10_000, EST)).toBeCloseTo(0.35, 5);
  });
  it('then climbs more slowly to 85% at the estimate', () => {
    const quickRate = waitProgress('connected', 10_000, EST) / 10;          // per second
    const slowRate = (waitProgress('connected', EST, EST) - waitProgress('connected', 10_000, EST)) / ((EST - 10_000) / 1000);
    expect(slowRate).toBeLessThan(quickRate / 5);
    expect(waitProgress('connected', EST, EST)).toBeCloseTo(0.85, 5);
  });
  it('keeps creeping past the estimate but stays under 95% until ready', () => {
    const a = waitProgress('connected', 1.2 * EST, EST);
    const b = waitProgress('connected', 2 * EST, EST);
    expect(b).toBeGreaterThan(a);
    expect(waitProgress('connected', 20 * EST, EST)).toBeLessThanOrEqual(0.95);
  });
  it('is full at ready, however early', () => {
    expect(waitProgress('ready', 5_000, EST)).toBe(1);
  });
});

describe('arrangingLine', () => {
  it('rotates every period and wraps', () => {
    expect(arrangingLine(0)).toBe(ARRANGING_LINES[0]);
    expect(arrangingLine(19_999)).toBe(ARRANGING_LINES[0]);
    expect(arrangingLine(20_000)).toBe(ARRANGING_LINES[1]);
    expect(arrangingLine(20_000 * ARRANGING_LINES.length)).toBe(ARRANGING_LINES[0]);
  });
});

describe('waitMode', () => {
  it('turns gentle 30 s after the estimate', () => {
    expect(waitMode(EST, EST)).toBe('normal');
    expect(waitMode(EST + 29_000, EST)).toBe('normal');
    expect(waitMode(EST + 31_000, EST)).toBe('slow');
  });
});

describe('needsFreshSession: the 5-minute token never bites', () => {
  it('asks for a new session after 4 minutes without a connection', () => {
    expect(needsFreshSession(FRESH_SESSION_AFTER_MS - 1, false)).toBe(false);
    expect(needsFreshSession(FRESH_SESSION_AFTER_MS, false)).toBe(true);
  });
  it('never once connected (the worker holds the session)', () => {
    expect(needsFreshSession(10 * 60_000, true)).toBe(false);
  });
});

describe('needsFreshTokenAtReady: a long start-up keeps the full try-on time', () => {
  const now = 1_800_000_000_000;
  it('keeps the session when ready leaves the full 5 minutes', () => {
    expect(needsFreshTokenAtReady(now / 1000 + 300, now, false)).toBe(false);
  });
  it('swaps when the token ceiling would cut the try-on short (e.g. a 7-minute warm-up)', () => {
    expect(needsFreshTokenAtReady(now / 1000 + 180, now, false)).toBe(true);
    expect(needsFreshTokenAtReady(now / 1000, now, false)).toBe(true);
  });
  it('swaps at most once per start, and never without a deadline', () => {
    expect(needsFreshTokenAtReady(now / 1000 + 60, now, true)).toBe(false);
    expect(needsFreshTokenAtReady(undefined, now, false)).toBe(false);
    expect(needsFreshTokenAtReady('soon', now, false)).toBe(false);
  });
});

describe('endOnHidden', () => {
  it('ends only while live (camera on); a start-up survives a locked phone', () => {
    expect(endOnHidden('running')).toBe(true);
    for (const s of ['starting', 'warming', 'idle', 'ended', 'failed'] as const) expect(endOnHidden(s)).toBe(false);
  });
});

describe('showFramingGuide', () => {
  const base = { running: true, faceItem: true, sinceLiveMs: 0, dismissed: false, noticeKey: null };
  it('shows for the opening moments once live, then goes', () => {
    expect(showFramingGuide(base)).toBe(true);
    expect(showFramingGuide({ ...base, sinceLiveMs: GUIDE_INTRO_MS })).toBe(false);
  });
  it('never before live, never for shoes or bags, and not after a tap', () => {
    expect(showFramingGuide({ ...base, running: false })).toBe(false);
    expect(showFramingGuide({ ...base, faceItem: false })).toBe(false);
    expect(showFramingGuide({ ...base, dismissed: true })).toBe(false);
  });
  it('comes back whenever nobody is in view', () => {
    expect(showFramingGuide({ ...base, sinceLiveMs: 60_000, dismissed: true, noticeKey: 'no_person' })).toBe(true);
    expect(showFramingGuide({ ...base, sinceLiveMs: 60_000, noticeKey: 'waiting_face' })).toBe(true);
    expect(showFramingGuide({ ...base, faceItem: false, noticeKey: 'no_person' })).toBe(false);
  });
});

describe('waitView: a warm worker goes straight in', () => {
  it('shows only the small line for the first moment of any start', () => {
    expect(waitView(0, null)).toBe('pill');
    expect(waitView(CARD_DELAY_MS - 1, null)).toBe('pill');
    expect(waitView(CARD_DELAY_MS, null)).toBe('card');
  });
  it('skips the steps and the cascade when ready arrives quickly (warm worker)', () => {
    expect(waitView(900, 900)).toBe('pill');
    expect(waitView(7_000, WARM_READY_MS - 1)).toBe('pill');
  });
  it('keeps the card and the cascade for a real cold start', () => {
    expect(waitView(120_000, 120_000)).toBe('card');
    expect(waitView(WARM_READY_MS, WARM_READY_MS)).toBe('card');
  });
});
