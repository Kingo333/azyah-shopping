// The wait before the mirror is live, designed to feel short (owner, 6 Nov 2026).
//
// Shoppers never see GPU / engine / model words. They see an assistant preparing a mirror:
// a short list of steps, a bar that moves steadily and speeds up at the end, a posted time
// that is a little above the usual real one (so most waits end "early"), and something to
// do meanwhile. Only four moments are tied to reality (the anchors below); everything
// between them is paced to the posted estimate, so the story can never stall and can never
// say "ready" before the worker does.
//
// Pure functions: no React, no timers, so they are unit-tested directly.

/** Real moments in the start-up, in order. Everything else on the card is timed. */
export type WaitAnchor =
  | 'requested'  // the server created the session
  | 'connected'  // the GPU worker accepted the connection (it is up, still loading)
  | 'ready'      // the worker said ready
  | 'live';      // the first frame is on screen

const ANCHOR_ORDER: Record<WaitAnchor, number> = { requested: 0, connected: 1, ready: 2, live: 3 };

export function anchorAtLeast(anchor: WaitAnchor, min: WaitAnchor): boolean {
  return ANCHOR_ORDER[anchor] >= ANCHOR_ORDER[min];
}

/**
 * Posted estimate for a cold start. The real range is about 2-4 minutes (FluxRT) and
 * 3-6 (JoyAI); posting a little above the usual turns the usual ending into relief.
 * VITE_LIVE_CAM_WAIT_MINUTES overrides it (e.g. 4 while JoyAI is the engine).
 */
export const DEFAULT_WAIT_ESTIMATE_MIN = 3;

export function waitEstimateMs(flag: string | undefined = import.meta.env?.VITE_LIVE_CAM_WAIT_MINUTES): number {
  const n = Number((flag ?? '').trim());
  const minutes = Number.isFinite(n) && n >= 1 && n <= 15 ? n : DEFAULT_WAIT_ESTIMATE_MIN;
  return minutes * 60_000;
}

/** "Last touches" starts by itself at this share of the estimate, whatever the worker says. */
export const LAST_TOUCHES_AT = 0.8;
/** After the estimate plus this, the card changes to its slower, gentler tone. */
export const SLOW_MODE_GRACE_MS = 30_000;
/**
 * Front-loaded pacing (owner, 7 Nov 2026): the first two steps tick quickly, whatever the
 * worker is doing, so the wait feels like it is moving from the first second; the last
 * three take the time. Only "ready" (and the first frame) are tied to the worker.
 */
export const STEP1_DONE_MS = 800;
export const STEP2_DONE_MS = 3_500;
/** The bar's quick opening: this share of the bar in the first QUICK_PHASE_MS. */
export const QUICK_PHASE_MS = 10_000;
export const QUICK_PHASE_SHARE = 0.35;

export type WaitStepState = 'done' | 'active' | 'todo';
export interface WaitStep {
  key: 'reserved' | 'mirror_on' | 'arranging' | 'last_touches' | 'open';
  label: string;
  state: WaitStepState;
}

export const WAIT_STEP_LABELS: Record<WaitStep['key'], string> = {
  reserved: 'Your mirror is reserved',
  mirror_on: 'Turning on your mirror',
  arranging: 'Arranging your outfit',
  last_touches: 'Last touches',
  open: 'Stepping up to the mirror',
};

/** Rotating lines under "Arranging your outfit": what an assistant does with real clothes. */
export const ARRANGING_LINES = [
  'Steaming the fabric…',
  'Getting the fit right…',
  'Setting the lighting…',
  'Matching the colours…',
  'Pressing the seams…',
  'Checking the length…',
] as const;
export const ARRANGING_LINE_PERIOD_MS = 20_000;

export const WAIT_COPY = {
  about: (minutes: number) => `About ${minutes} min`,
  title: 'Preparing your mirror',
  titleSlow: 'Taking a little longer than usual',
  titleWarm: 'Opening your mirror…',
  line: (minutes: number) => `We're getting your mirror ready. About ${minutes} minute${minutes === 1 ? '' : 's'}.`,
  lineSlow: 'Your mirror is almost ready. The first one of the day takes a bit longer. A few more minutes.',
  lastTouches: 'Almost ready…',
  pickFirst: 'Choose what you’ll try first',
  keepShopping: 'Keep shopping, we’ll let you know',
  keepShoppingShort: 'Keep shopping',
  notNow: 'Not now',
  notify: 'Let me know when it’s ready',
  notifyOn: 'We’ll let you know',
  ready: 'Your mirror is ready. Every outfit is now instant.',
  readyHere: 'Your mirror is ready. Tap any item to try it on.',
  tooLong: 'We couldn’t get your mirror ready this time. Try again, it’s usually much quicker the second time.',
  failed: 'Couldn’t open your mirror. Try again.',
  idleHint: 'Turning on takes about 2–5 minutes the first time. After that, switching outfits is fast.',
  guide: 'Stand here, head and shoulders in view',
} as const;

/**
 * The five steps and their states at this moment.
 * elapsedMs: since Start. estimateMs: the posted estimate.
 */
export function waitSteps(anchor: WaitAnchor, elapsedMs: number, estimateMs: number): WaitStep[] {
  const t = Math.max(0, elapsedMs);
  const ready = anchorAtLeast(anchor, 'ready');
  const live = anchor === 'live';
  const lastTouchesDue = t >= LAST_TOUCHES_AT * estimateMs;

  let active: WaitStep['key'];
  if (live || ready) active = 'open';  // live: all done (the UI treats 'live' as finished)
  else if (t < STEP1_DONE_MS) active = 'reserved';
  else if (t < STEP2_DONE_MS) active = 'mirror_on';
  else active = lastTouchesDue ? 'last_touches' : 'arranging';

  const order: WaitStep['key'][] = ['reserved', 'mirror_on', 'arranging', 'last_touches', 'open'];
  const idx = order.indexOf(active);
  return order.map((key, i) => ({
    key,
    label: WAIT_STEP_LABELS[key],
    state: live ? 'done' : i < idx ? 'done' : i === idx ? 'active' : 'todo',
  }));
}

/**
 * Bar position 0..1, front-loaded to match the steps: a quick opening (35% in the first
 * 10 s, easing out), then a steady, slower climb to 85% at the estimate, then a creep that
 * never stops (to 95%), then 1 at ready. It never sits still and never says done early.
 */
export function waitProgress(anchor: WaitAnchor, elapsedMs: number, estimateMs: number): number {
  if (anchorAtLeast(anchor, 'ready')) return 1;
  const t = Math.max(0, elapsedMs);
  const est = Math.max(QUICK_PHASE_MS + 1, estimateMs);
  if (t <= QUICK_PHASE_MS) {
    const u = t / QUICK_PHASE_MS;
    return QUICK_PHASE_SHARE * (1 - (1 - u) ** 2);
  }
  if (t <= est) return QUICK_PHASE_SHARE + (0.85 - QUICK_PHASE_SHARE) * ((t - QUICK_PHASE_MS) / (est - QUICK_PHASE_MS));
  const extra = (t - est) / est;
  return Math.min(0.95, 0.85 + 0.1 * (1 - Math.exp(-extra / 1.5)));
}

/** Which rotating line to show while arranging; the first one for the first period. */
export function arrangingLine(sinceConnectedMs: number, periodMs = ARRANGING_LINE_PERIOD_MS): string {
  const i = Math.floor(Math.max(0, sinceConnectedMs) / periodMs) % ARRANGING_LINES.length;
  return ARRANGING_LINES[i];
}

/**
 * Warm worker fast path (owner, 7 Nov): when the GPU is already warm the mirror is ready in
 * a few seconds, and a five-step card would only slow it down visually. So the card shows
 * only after CARD_DELAY_MS, and when "ready" arrives within WARM_READY_MS of Start the steps
 * and the cascade are skipped: just a small "Opening your mirror…" line until it is live.
 */
export const CARD_DELAY_MS = 4_000; // a warm start needs ~1-3 s (session, garment photo, connect)
export const WARM_READY_MS = 8_000;

export type WaitView = 'pill' | 'card';

/** readyAfterMs: time from Start to "ready", or null while not ready yet. */
export function waitView(elapsedMs: number, readyAfterMs: number | null): WaitView {
  if (readyAfterMs !== null) return readyAfterMs < WARM_READY_MS ? 'pill' : 'card';
  return elapsedMs < CARD_DELAY_MS ? 'pill' : 'card';
}

/** 'warm' (no card: it is about to be live), 'normal', or 'slow' (past the estimate). */
export type WaitMode = 'normal' | 'slow';

export function waitMode(elapsedMs: number, estimateMs: number): WaitMode {
  return elapsedMs > estimateMs + SLOW_MODE_GRACE_MS ? 'slow' : 'normal';
}

/**
 * The session token is valid for 5 minutes from Start. The worker accepts the connection
 * within seconds of its container being up, so the token only matters when the container
 * itself is slow (a first pull of a new image). Past this, the app quietly asks for a fresh
 * session before the next connection attempt. No Worker change needed.
 */
export const FRESH_SESSION_AFTER_MS = 4 * 60_000;

export function needsFreshSession(sinceTokenMs: number, connected: boolean): boolean {
  return !connected && sinceTokenMs >= FRESH_SESSION_AFTER_MS;
}

/**
 * Full try-on time after a long start-up. The worker gives every session its try-on time
 * (5 minutes) from "ready", but never past the session token's expiry plus that time, and
 * the token is minted at Start. So a warm-up longer than about 5 minutes eats into the
 * try-on. The worker says when the session will end (`session_deadline`, epoch seconds, in
 * its ready message); if that leaves less than this, the app quietly swaps to a fresh
 * session before the mirror opens. The worker is already warm, so the swap takes a second
 * or two and happens under "Last touches", never as a new wait.
 */
export const FULL_TRY_ON_MIN_MS = 4.5 * 60_000;

export function needsFreshTokenAtReady(sessionDeadlineS: unknown, nowMs: number, alreadySwapped: boolean): boolean {
  // Once per start: if the worker's own cap is set shorter, a second swap would not help.
  if (alreadySwapped) return false;
  if (typeof sessionDeadlineS !== 'number' || !Number.isFinite(sessionDeadlineS)) return false;
  return sessionDeadlineS * 1000 - nowMs < FULL_TRY_ON_MIN_MS;
}

/**
 * What to do when the app is hidden (phone locked, another app in front).
 * While live the camera is on, so the session ends (privacy, as before). While it is still
 * starting the camera is off, so the start-up continues and the app reconnects on return.
 */
export function endOnHidden(status: 'idle' | 'starting' | 'warming' | 'running' | 'ended' | 'failed'): boolean {
  return status === 'running';
}

/**
 * The framing guide (dotted head-and-shoulders outline) shows only once the mirror is live:
 * for the first moments, or whenever the worker says nobody / no face is in view. Never for
 * items that do not need a face (shoes, bags: the camera points elsewhere), and never once
 * the shopper has tapped it away during the opening moments.
 */
export const GUIDE_INTRO_MS = 8_000;

export function showFramingGuide(args: {
  running: boolean;
  faceItem: boolean;
  sinceLiveMs: number;
  dismissed: boolean;
  noticeKey: string | null;
}): boolean {
  if (!args.running || !args.faceItem) return false;
  if (args.noticeKey === 'waiting_face' || args.noticeKey === 'no_person') return true;
  return !args.dismissed && args.sinceLiveMs < GUIDE_INTRO_MS;
}
