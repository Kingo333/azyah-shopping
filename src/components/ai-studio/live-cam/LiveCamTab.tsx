import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Sparkles, Square } from 'lucide-react';
import { LiveCamCameraView } from './LiveCamCameraView';
import { LiveCamGarmentPicker } from './LiveCamGarmentPicker';
import { LiveCamSnapshotButton } from './LiveCamSnapshotButton';
import { useLiveCamSession } from './useLiveCamSession';
import { LIVE_CAM_TIER_CONFIG, isPremiumUiEnabled, isPremiumUnavailable } from './liveCamTier';
import type { LiveCamGarmentSelection, LiveCamStatus, LiveCamTier } from './liveCamTypes';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { formatElapsed, warmupProgress } from '@/lib/liveWarmup';
import { toast } from 'sonner';

const TIER_LABEL: Record<LiveCamTier, string> = { standard: 'Standard', premium: 'Premium HD' };

const supportsLiveCam = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.WebSocket && !!navigator.mediaDevices?.getUserMedia;
};

export const LiveCamTab: React.FC = () => {
  const [garment, setGarment] = useState<LiveCamGarmentSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tier, setTier] = useState<LiveCamTier>('standard');
  const showTierPicker = isPremiumUiEnabled();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const supported = supportsLiveCam();
  const v3 = useDesignV3();

  const {
    status, errorMessage, errorCode, notice, latencyMs, session, activeTier, start, stop, redrawLastFrame,
  } = useLiveCamSession({
    garment,
    tier: showTierPicker ? tier : 'standard',
    localVideoRef,
    remoteCanvasRef,
  });

  // Design v3: time the start-up for the loading card, and say when it's ready.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const loadingNow = status === 'starting' || status === 'warming';
  useEffect(() => {
    if (!loadingNow) {
      setStartedAt(null);
      return;
    }
    setStartedAt((t) => t ?? Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [loadingNow]);
  const prevStatus = useRef(status);
  useEffect(() => {
    if (v3 && status === 'running' && prevStatus.current !== 'running') {
      toast.success('Live try-on is on. Tap any item to try it on.');
    }
    prevStatus.current = status;
  }, [status, v3]);

  const handleToggleExpand = () => {
    setExpanded((v) => !v);
    // After layout flip, repaint cached frame so the new canvas size is filled immediately.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => redrawLastFrame());
    });
  };

  // Stop the session when this component unmounts (e.g., tab switch away).
  useEffect(() => {
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) {
    if (v3) {
      return (
        <div className="rounded-[20px] bg-card p-5 text-center">
          <p className="text-[15px] font-semibold text-ink">Live try-on needs a camera</p>
          <p className="mt-1 text-[13px] text-ink-2">This device can't stream from its camera. Try Picture or Video instead.</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3">
        Your device does not support live camera streaming. Try the Picture or Video tab instead.
      </div>
    );
  }

  const isRunning = status === 'running';
  const isStarting = status === 'starting' || status === 'warming';
  const isWarming = status === 'warming';
  const servedTier: LiveCamTier = session?.tierServed ?? activeTier;
  const fellBack = !!session && session.tier !== session.tierServed;
  const warmingLabel = LIVE_CAM_TIER_CONFIG[servedTier].warmupLabel;

  const startStandardInstead = () => {
    setTier('standard');
    void start('standard');
  };

  // Design v3: Live Cam is the selling point. One big stage, a strip of
  // clothes, one black Start button; a shutter and End while it runs.
  // Same session hook, refs and handlers as below; only the layout differs.
  if (v3) {
    return (
      <div className="space-y-4">
        <LiveCamCameraView
          variant="stage"
          localVideoRef={localVideoRef}
          remoteCanvasRef={remoteCanvasRef}
          isRunning={isRunning}
          status={status}
          expanded={expanded}
          onToggleExpand={handleToggleExpand}
          onCanvasResize={redrawLastFrame}
          topLeft={
            <>
              <StagePill status={status} />
              {(isRunning || isStarting) && showTierPicker && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">{TIER_LABEL[servedTier]}</span>
              )}
              {fellBack && (isRunning || isStarting) && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">Running on Standard</span>
              )}
              {isRunning && latencyMs !== null && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums">{latencyMs} ms</span>
              )}
            </>
          }
          loadingContent={
            <div className="w-full max-w-[260px] rounded-[20px] bg-neutral-900 p-5 text-center text-white">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-3 text-[15px] font-semibold">Turning on live try-on</p>
              <p className="mt-1 text-[13px] text-white/75">Usually about 30 seconds. The first start can take up to 3 minutes.</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${Math.round(warmupProgress(startedAt ? now - startedAt : 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-white/70 tabular-nums">{formatElapsed(startedAt ? now - startedAt : 0)}</p>
              <p className="mt-3 text-[12px] text-white/70">Pick what to try first below. Stay on this screen.</p>
            </div>
          }
          idleContent={
            garment ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <img src={garment.referenceImageUrl} alt="" className="h-32 w-24 rounded-xl bg-white object-cover" />
                <p className="max-w-[240px] text-[13px] text-white/80">
                  Turn on live try-on once (about 30 seconds). After that, switching outfits is instant.
                </p>
              </div>
            ) : (
              <p className="max-w-[240px] text-center text-[15px] text-white/80">
                Turn on live try-on once (about 30 seconds). After that, switching outfits is instant.
              </p>
            )
          }
          bottom={
            <div className="space-y-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-4 pt-10">
              {/* Changing the garment while running swaps it live (no reconnect). */}
              {/* A pick made while it starts is swapped in as soon as it's live. */}
              <LiveCamGarmentPicker value={garment} onChange={setGarment} layout="strip" autoSelectFirst />
              {isRunning ? (
                <div className="grid grid-cols-3 items-center">
                  <button
                    type="button"
                    onClick={() => void stop()}
                    className="justify-self-start rounded-full bg-white/15 px-4 py-2 text-[15px] font-semibold text-white"
                  >
                    End
                  </button>
                  <div className="justify-self-center">
                    <LiveCamSnapshotButton variant="round" sessionId={session?.sessionId ?? null} remoteCanvasRef={remoteCanvasRef} />
                  </div>
                  <span className="justify-self-end text-right text-[11px] leading-tight text-white/70">Snapshots<br />stay private</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={!garment || isStarting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-black disabled:bg-white/20 disabled:text-white/70"
                >
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {isStarting ? 'Turning on…' : garment ? 'Turn on live try-on' : 'Pick something to try on'}
                </button>
              )}
            </div>
          }
        />

        {showTierPicker && !isRunning && (
          <div role="radiogroup" aria-label="Live try-on quality" className="grid grid-cols-2 rounded-[10px] bg-fill p-0.5">
            {(['standard', 'premium'] as LiveCamTier[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tier === t}
                onClick={() => setTier(t)}
                disabled={isStarting}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-medium disabled:opacity-50 ${
                  tier === t ? 'bg-card text-ink' : 'text-ink-2'
                }`}
              >
                {TIER_LABEL[t]}
                {t === 'premium' && <span className="rounded-full bg-wait px-1.5 text-[10px] text-wait-foreground">Beta</span>}
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-[12px] text-ink-2">
          {isRunning
            ? 'Live try-on is on. It turns off when you end it or leave this screen.'
            : 'Live try-on uses a GPU that takes about 30 seconds to start. Once it’s on, outfits switch instantly.'}
        </p>

        {notice && <div className="rounded-[14px] bg-fill p-3 text-[13px] text-ink">{notice}</div>}

        {status === 'failed' && isPremiumUnavailable(errorCode) && (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-wait p-3 text-[13px] text-wait-foreground">
            <span>Premium HD is coming soon.</span>
            <button type="button" onClick={startStandardInstead} className="font-semibold">Start Standard instead</button>
          </div>
        )}

        {status === 'failed' && errorCode === 'premium_required' && (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-wait p-3 text-[13px] text-wait-foreground">
            <span>Premium HD is included with Azyah Premium.</span>
            <button type="button" onClick={() => navigate('/dashboard/upgrade')} className="font-semibold">Upgrade</button>
          </div>
        )}

        {status === 'failed' && errorMessage && !isPremiumUnavailable(errorCode) && errorCode !== 'premium_required' && (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-bad p-3 text-[13px] text-bad-foreground">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => void start()} className="shrink-0 font-semibold">Try again</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Changing the garment while running swaps it live (no reconnect). */}
      <LiveCamGarmentPicker
        value={garment}
        onChange={setGarment}
        disabled={isStarting}
      />

      {showTierPicker && (
        <div className="space-y-1">
          <div
            role="radiogroup"
            aria-label="Live try-on quality"
            className="grid grid-cols-2 gap-2"
          >
            {(['standard', 'premium'] as LiveCamTier[]).map((t) => {
              const selected = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTier(t)}
                  disabled={isRunning || isStarting}
                  className={`h-10 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t === 'premium' && <Sparkles className="h-4 w-4" />}
                  {TIER_LABEL[t]}
                  {t === 'premium' && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                        selected ? 'bg-white/20' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Beta
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <LiveCamCameraView
        localVideoRef={localVideoRef}
        remoteCanvasRef={remoteCanvasRef}
        isRunning={isRunning}
        status={status}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onCanvasResize={redrawLastFrame}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge status={status} />
          {(isRunning || isStarting) && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{TIER_LABEL[servedTier]}</span>
          )}
          {fellBack && (isRunning || isStarting) && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Running on Standard</span>
          )}
          {isRunning && latencyMs !== null && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{latencyMs} ms</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <LiveCamSnapshotButton sessionId={session?.sessionId ?? null} remoteCanvasRef={remoteCanvasRef} />
          )}
          {!isRunning ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={!garment || isStarting}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
            >
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isWarming ? warmingLabel : isStarting ? 'Spinning up GPU…' : 'Start Live Try-On'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stop()}
              className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm flex items-center gap-2 hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm p-3">{notice}</div>
      )}

      {status === 'failed' && isPremiumUnavailable(errorCode) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3 flex items-center justify-between gap-2">
          <span>Premium HD is coming soon.</span>
          <button
            type="button"
            onClick={startStandardInstead}
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-95"
          >
            Start Standard instead
          </button>
        </div>
      )}

      {status === 'failed' && errorCode === 'premium_required' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3 flex items-center justify-between gap-2">
          <span>Premium HD is included with Azyah Premium.</span>
          <button
            type="button"
            onClick={() => navigate('/dashboard/upgrade')}
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-95"
          >
            Upgrade
          </button>
        </div>
      )}

      {status === 'failed' && errorMessage && !isPremiumUnavailable(errorCode) && errorCode !== 'premium_required' && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3 flex items-center justify-between gap-2">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => void start()}
            className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-700',
    starting: 'bg-amber-100 text-amber-800',
    warming: 'bg-amber-100 text-amber-800',
    running: 'bg-emerald-100 text-emerald-800',
    ended: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] ${map[status] ?? map.idle}`}>
      {status}
    </span>
  );
};

/** Design v3 status pill on the stage. */
const StagePill: React.FC<{ status: LiveCamStatus }> = ({ status }) => {
  const label: Record<LiveCamStatus, string> = {
    idle: 'Ready',
    starting: 'Starting…',
    warming: 'Warming up…',
    running: 'Live',
    ended: 'Ended',
    failed: 'Stopped',
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white">
      {status === 'running' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
      {(status === 'starting' || status === 'warming') && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />}
      {label[status]}
    </span>
  );
};
