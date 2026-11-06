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

  return (
    <div className="max-h-full w-full max-w-[280px] overflow-y-auto rounded-[20px] bg-neutral-900/95 p-4 text-white shadow-xl">
      <p className="text-[16px] font-semibold">{mode === 'slow' && !ready ? WAIT_COPY.titleSlow : WAIT_COPY.title}</p>
      <p className="mt-1 text-[13px] leading-snug text-white/75">
        {ready ? 'Here you are.' : mode === 'slow' ? WAIT_COPY.lineSlow : WAIT_COPY.line(minutes)}
      </p>

      <ol className="mt-3 space-y-1.5" aria-label="Getting your mirror ready">
        {steps.map((s, i) => {
          const done = s.state === 'done' || (ready && i < cascade);
          const active = !done && (s.state === 'active' || (ready && i === cascade));
          return (
            <li key={s.key} className={`flex items-start gap-2.5 text-[13px] transition-opacity duration-300 ${done ? 'text-white/85' : active ? 'text-white' : 'text-white/40'}`}>
              <span
                className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-emerald-400 text-black' : active ? 'border border-white/70' : 'border border-white/25'
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0">
                <span className={active ? 'font-medium' : undefined}>{s.label}</span>
                {active && subLine && (
                  <span key={subLine} className="block text-[12px] text-white/60 animate-in fade-in duration-500">{subLine}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div
          className={`h-full rounded-full bg-white ${ready ? 'transition-[width] duration-700 ease-out' : 'transition-[width] duration-[400ms] linear'}`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {!ready && (
        <div className="mt-3 space-y-1.5">
          {mode === 'slow' && notifyState !== 'on' && (
            <button
              type="button"
              onClick={onNotify}
              disabled={notifyState === 'blocked'}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-semibold text-black disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {notifyState === 'blocked' ? 'Notifications are off in Settings' : WAIT_COPY.notify}
            </button>
          )}
          {mode === 'slow' && notifyState === 'on' && (
            <p className="flex items-center justify-center gap-1.5 text-[13px] text-emerald-300"><Check className="h-4 w-4" />{WAIT_COPY.notifyOn}</p>
          )}
          {canKeepShopping && (
            <button
              type="button"
              onClick={onKeepShopping}
              className={`h-10 w-full rounded-[12px] text-[14px] font-semibold ${mode === 'slow' ? 'bg-white/15 text-white' : 'bg-white text-black'}`}
            >
              {WAIT_COPY.keepShopping}
            </button>
          )}
          <button type="button" onClick={onNotNow} className="h-8 w-full rounded-[12px] text-[13px] font-medium text-white/70">
            {WAIT_COPY.notNow}
          </button>
        </div>
      )}
    </div>
  );
};
