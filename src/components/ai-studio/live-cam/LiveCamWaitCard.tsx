import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import {
  WAIT_COPY,
  arrangingLine,
  waitEstimateMs,
  waitMode,
  waitProgress,
  waitSteps,
  type WaitAnchor,
} from './liveCamWait';

interface Props {
  anchor: WaitAnchor | null;
  startedAt: number | null;
  connectedAt: number | null;
  /** Whether "Keep shopping" is offered (the app-level host keeps the mirror starting off screen). */
  canKeepShopping: boolean;
  notifyState: 'off' | 'asked' | 'on' | 'blocked';
  onKeepShopping: () => void;
  onNotNow: () => void;
  onNotify: () => void;
}

/**
 * The card shown on the stage while the mirror gets ready. Shopper words only. Steps are
 * designed for feeling and anchored to the real moments (liveCamWait.ts): step 1 ticks at
 * once, "Last touches" starts by itself near the end, and when the worker is really ready
 * the remaining steps tick in a quick cascade before the live view fades in.
 */
export const LiveCamWaitCard: React.FC<Props> = ({
  anchor, startedAt, connectedAt, canKeepShopping, notifyState, onKeepShopping, onNotNow, onNotify,
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, []);

  const estimate = waitEstimateMs();
  const elapsed = startedAt ? now - startedAt : 0;
  const a: WaitAnchor = anchor ?? 'requested';
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
      ? arrangingLine(connectedAt ? now - connectedAt : 0)
      : steps[activeIdx]?.key === 'last_touches'
        ? WAIT_COPY.lastTouches
        : null;
  const minutes = Math.round(estimate / 60_000);

  // Design v3: a flat card (no shadow, no blur), radius 20, system font, 15/600 title, 13 body,
  // buttons 44px radius 14, motion 150–250 ms on opacity/transform only, reduced motion respected.
  return (
    <div className="max-h-full w-full max-w-[280px] overflow-y-auto rounded-[20px] bg-neutral-900 p-4 text-white">
      <p className="text-[15px] font-semibold">{mode === 'slow' && !ready ? WAIT_COPY.titleSlow : WAIT_COPY.title}</p>
      <p className="mt-1 text-[13px] leading-snug text-white/75">
        {ready ? 'Here you are.' : mode === 'slow' ? WAIT_COPY.lineSlow : WAIT_COPY.line(minutes)}
      </p>

      <ol className="mt-3 space-y-1.5" aria-label="Getting your mirror ready">
        {steps.map((s, i) => {
          const done = s.state === 'done' || (ready && i < cascade);
          const active = !done && (s.state === 'active' || (ready && i === cascade));
          return (
            <li key={s.key} className={`flex items-start gap-2.5 text-[13px] transition-opacity duration-200 ease-out motion-reduce:transition-none ${done ? 'text-white/85' : active ? 'text-white' : 'text-white/40'}`}>
              <span
                className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-emerald-400 text-black' : active ? 'border border-white/70' : 'border border-white/25'
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" /> : null}
              </span>
              <span className="min-w-0">
                <span className={active ? 'font-medium' : undefined}>{s.label}</span>
                {active && subLine && (
                  <span key={subLine} className="block text-[12px] text-white/60 animate-in fade-in duration-200 motion-reduce:animate-none">{subLine}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div
          className={`h-full w-full origin-left rounded-full bg-white motion-reduce:transition-none ${ready ? 'transition-transform duration-[250ms] ease-out' : 'transition-transform duration-[400ms] linear'}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {!ready && (
        <div className="mt-3 space-y-1.5">
          {mode === 'slow' && notifyState !== 'on' && (
            <button
              type="button"
              onClick={onNotify}
              disabled={notifyState === 'blocked'}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white px-3 text-[14px] font-semibold text-black active:opacity-80 disabled:opacity-50"
            >
              <Bell className="h-[18px] w-[18px]" />
              {notifyState === 'blocked' ? 'Notifications are off in Settings' : WAIT_COPY.notify}
            </button>
          )}
          {mode === 'slow' && notifyState === 'on' && (
            <p className="flex h-11 items-center justify-center gap-1.5 text-[13px] text-emerald-300"><Check className="h-[18px] w-[18px]" />{WAIT_COPY.notifyOn}</p>
          )}
          {canKeepShopping && (
            <button
              type="button"
              onClick={onKeepShopping}
              className={`h-11 w-full rounded-[14px] px-3 text-[14px] font-semibold active:opacity-80 ${mode === 'slow' ? 'bg-white/15 text-white' : 'bg-white text-black'}`}
            >
              {WAIT_COPY.keepShopping}
            </button>
          )}
          <button type="button" onClick={onNotNow} className="h-11 w-full rounded-[14px] text-[13px] font-medium text-white/70 active:opacity-80">
            {WAIT_COPY.notNow}
          </button>
        </div>
      )}
    </div>
  );
};
