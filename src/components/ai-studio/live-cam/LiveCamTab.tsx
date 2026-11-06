import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Square, SwitchCamera, X } from 'lucide-react';
import { LiveCamCameraView } from './LiveCamCameraView';
import { LiveCamGarmentPicker } from './LiveCamGarmentPicker';
import { LiveCamSnapshotButton } from './LiveCamSnapshotButton';
import { useLiveCamSession } from './useLiveCamSession';
import { LIVE_CAM_CONFIG } from './liveCamTier';
import type { LiveCamGarmentSelection, LiveCamStatus } from './liveCamTypes';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { formatElapsed, warmupProgress } from '@/lib/liveWarmup';
import { toast } from 'sonner';

const supportsLiveCam = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.WebSocket && !!navigator.mediaDevices?.getUserMedia;
};

interface LiveCamTabProps {
  /**
   * Set by the app-level Live Cam host (design v3), which keeps this mounted
   * while it starts or runs so people can leave the screen. Always uses the
   * v3 layout so the camera and canvas never remount, and reports status up.
   */
  hosted?: boolean;
  onStatusChange?: (status: LiveCamStatus) => void;
}

export const LiveCamTab: React.FC<LiveCamTabProps> = ({ hosted = false, onStatusChange }) => {
  const [garment, setGarment] = useState<LiveCamGarmentSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const supported = supportsLiveCam();
  const routeV3 = useDesignV3();
  const v3 = hosted || routeV3;

  const {
    status, facing, flipCamera, errorMessage, notice, latencyMs, session, start, stop, redrawLastFrame,
  } = useLiveCamSession({
    garment,
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
    onStatusChange?.(status);
    // The host says when it's ready (also when you're elsewhere); otherwise say it here.
    if (!hosted && v3 && status === 'running' && prevStatus.current !== 'running') {
      toast.success('Live try-on is on. Tap any item to try it on.');
    }
    prevStatus.current = status;
  }, [status, v3, hosted, onStatusChange]);

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
  const warmingLabel = LIVE_CAM_CONFIG.warmupLabel;

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
              <FlipCameraButton facing={facing} onFlip={flipCamera} variant="stage" />
              {isRunning && latencyMs !== null && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums">{latencyMs} ms</span>
              )}
            </>
          }
          loadingContent={
            <div className="w-full max-w-[260px] rounded-[20px] bg-neutral-900 p-5 text-center text-white">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-3 text-[15px] font-semibold">Turning on live try-on</p>
              <p className="mt-1 text-[13px] text-white/75">The first start takes about 2–5 minutes while the GPU wakes up. After that, switching outfits is fast.</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${Math.round(warmupProgress(startedAt ? now - startedAt : 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-white/70 tabular-nums">{formatElapsed(startedAt ? now - startedAt : 0)}</p>
              <p className="mt-3 text-[12px] text-white/70">
                {hosted
                  ? 'Pick what to try first below, or keep browsing. We’ll tell you when it’s ready.'
                  : 'Pick what to try first below. Stay on this screen.'}
              </p>
            </div>
          }
          idleContent={
            garment ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <img src={garment.referenceImageUrl} alt="" className="h-32 w-24 rounded-xl bg-white object-cover" />
                <p className="max-w-[240px] text-[13px] text-white/80">
                  Turning on takes about 2–5 minutes the first time. After that, switching outfits is fast.
                </p>
              </div>
            ) : (
              <p className="max-w-[240px] text-center text-[15px] text-white/80">
                Turning on takes about 2–5 minutes the first time. After that, switching outfits is fast.
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
              ) : isStarting ? (
                <button
                  type="button"
                  onClick={() => void stop()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white/15 text-[15px] font-semibold text-white"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={!garment}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[15px] font-semibold text-black disabled:bg-white/20 disabled:text-white/70"
                >
                  <Play className="h-4 w-4" />
                  {garment ? 'Turn on live try-on' : 'Pick something to try on'}
                </button>
              )}
            </div>
          }
        />

        <p className="text-center text-[12px] text-ink-2">
          {isRunning
            ? hosted
              ? 'Live try-on is on. It stays on while you browse, until you end it or close the app.'
              : 'Live try-on is on. It turns off when you end it or leave this screen.'
            : 'The first start takes about 2–5 minutes while the GPU wakes up. Once it’s on, outfits switch quickly.'}
        </p>

        {notice && <div className="rounded-[14px] bg-fill p-3 text-[13px] text-ink">{notice}</div>}

        {status === 'failed' && errorMessage && (
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
          {isRunning && latencyMs !== null && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{latencyMs} ms</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FlipCameraButton facing={facing} onFlip={flipCamera} variant="classic" />
          {isRunning && (
            <LiveCamSnapshotButton sessionId={session?.sessionId ?? null} remoteCanvasRef={remoteCanvasRef} />
          )}
          {isStarting ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isWarming ? warmingLabel : 'Spinning up GPU…'}
              </span>
              <button
                type="button"
                onClick={() => void stop()}
                className="h-10 px-4 rounded-lg border border-gray-200 bg-background text-sm flex items-center gap-2 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          ) : !isRunning ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={!garment}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
            >
              <Play className="h-4 w-4" />
              Start Live Try-On
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

      {status === 'failed' && errorMessage && (
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

/** Front <-> back camera. Works before Start (sets the choice) and while live. */
function FlipCameraButton({
  facing,
  onFlip,
  variant,
}: {
  facing: 'user' | 'environment';
  onFlip: () => Promise<void> | void;
  variant: 'stage' | 'classic';
}) {
  const label = facing === 'user' ? 'Switch to back camera' : 'Switch to front camera';
  const className =
    variant === 'stage'
      ? 'flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white'
      : 'h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 flex items-center gap-1.5 hover:bg-gray-50';
  return (
    <button type="button" onClick={() => void onFlip()} aria-label={label} title={label} className={className}>
      <SwitchCamera className={variant === 'stage' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {facing === 'user' ? 'Front' : 'Back'}
    </button>
  );
}
