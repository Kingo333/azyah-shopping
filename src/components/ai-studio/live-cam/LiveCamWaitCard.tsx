import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import {
  WAIT_COPY,
  arrangingLine,
  STEP2_DONE_MS,
  waitEstimateMs,
  waitMode,
  waitProgress,
  waitSteps,
  waitView,
  type WaitAnchor,
} from './liveCamWait';

interface Props {
  anchor: WaitAnchor | null;
  startedAt: number | null;
  notifyState: 'off' | 'asked' | 'on' | 'blocked';
  onNotify: () => void;
}

/**
 * The card on the stage while the mirror gets ready. Compact on purpose: it sits in the
 * space above the clothes strip (the stage measures that strip), and the actions
 * (Keep shopping, Cancel) live in the bottom bar with the strip, not in the card.
 *
 * Shopper words only. Pacing is front-loaded (liveCamWait.ts): two quick ticks in the first
 * seconds, then the long "Arranging your outfit", "Last touches" by itself near the end,
 * and a quick cascade of the remaining ticks when the worker is really ready.
 */
export const LiveCamWaitCard: React.FC<Props> = ({ anchor, startedAt, notifyState, onNotify }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const estimate = waitEstimateMs();
  const elapsed = startedAt ? now - startedAt : 0;
  const a: WaitAnchor = anchor ?? 'requested';
  // When "ready" first arrived, measured from Start (decides the warm fast path).
  const readyAfterRef = useRef<number | null>(null);
  if ((a === 'ready' || a === 'live') && readyAfterRef.current === null) readyAfterRef.current = elapsed;
  if (a !== 'ready' && a !== 'live') readyAfterRef.current = null;
  const view = waitView(elapsed, readyAfterRef.current);
  const steps = waitSteps(a, elapsed, estimate);
  const mode = waitMode(elapsed, estimate);
  const ready = a === 'ready' || a === 'live';

  // The cascade: once ready, reveal the remaining ticks one by one, 150 ms apart.
  const [cascade, setCascade] = useState(0);
  const cascadeTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) { setCascade(0); return; }
    let n = 0;
    const tick = () => {
      n += 1;
      setCascade(n);
      if (n < steps.length) cascadeTimer.current = window.setTimeout(tick, 150);
    };
    tick();
    return () => { if (cascadeTimer.current !== null) window.clearTimeout(cascadeTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const progress = ready ? 1 : waitProgress(a, elapsed, estimate);
  const activeIdx = steps.findIndex((s) => s.state === 'active');
  const subLine = ready
    ? null
    : steps[activeIdx]?.key === 'arranging'
      ? arrangingLine(Math.max(0, elapsed - STEP2_DONE_MS))
      : steps[activeIdx]?.key === 'last_touches'
        ? WAIT_COPY.lastTouches
        : null;
  const minutes = Math.round(estimate / 60_000);
  const slow = mode === 'slow' && !ready;

  // Warm worker (or the first moment of any start): a small line instead of the card.
  if (view === 'pill') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-neutral-900/90 px-4 py-2 text-[14px] font-medium text-white animate-in fade-in duration-200 motion-reduce:animate-none" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" aria-hidden />
        {WAIT_COPY.titleWarm}
      </div>
    );
  }

  // Design v3: flat card (no shadow, no blur), radius 20, 15/600 title, 13 body, motion
  // 150–250 ms on opacity/transform only, reduced motion respected.
  return (
    <div className="max-h-full w-full max-w-[300px] overflow-y-auto rounded-[20px] bg-neutral-900 px-4 py-3.5 text-white">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold">{slow ? WAIT_COPY.titleSlow : WAIT_COPY.title}</p>
        {!slow && !ready && <span className="shrink-0 text-[12px] tabular-nums text-white/60">{WAIT_COPY.about(minutes)}</span>}
      </div>
      {slow && <p className="mt-0.5 text-[12px] leading-snug text-white/70">{WAIT_COPY.lineSlow}</p>}

      <ol className="mt-2.5 space-y-1" aria-label="Getting your mirror ready">
        {steps.map((s, i) => {
          const done = s.state === 'done' || (ready && i < cascade);
          const active = !done && (s.state === 'active' || (ready && i === cascade));
          return (
            <li
              key={s.key}
              className={`flex items-start gap-2 text-[13px] leading-[18px] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                done ? 'text-white/70' : active ? 'text-white' : 'text-white/35'
              }`}
            >
              <span
                className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-emerald-400 text-black' : active ? 'border border-white/70' : 'border border-white/25'
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" /> : null}
              </span>
              <span className="min-w-0">
                <span className={active ? 'font-medium' : undefined}>{s.label}</span>
                {active && subLine && (
                  <span key={subLine} className="block text-[12px] leading-4 text-white/55 animate-in fade-in duration-200 motion-reduce:animate-none">{subLine}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div
          className={`h-full w-full origin-left rounded-full bg-white motion-reduce:transition-none ${ready ? 'transition-transform duration-[250ms] ease-out' : 'transition-transform duration-[250ms] linear'}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {slow && notifyState !== 'on' && (
        <button
          type="button"
          onClick={onNotify}
          disabled={notifyState === 'blocked'}
          className="mt-2 flex h-9 items-center gap-1.5 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {notifyState === 'blocked' ? 'Notifications are off in Settings' : WAIT_COPY.notify}
        </button>
      )}
      {slow && notifyState === 'on' && (
        <p className="mt-2 flex h-9 items-center gap-1.5 text-[13px] text-emerald-300"><Check className="h-4 w-4" />{WAIT_COPY.notifyOn}</p>
      )}
    </div>
  );
};
