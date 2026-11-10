import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Square, SwitchCamera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveCamWaitCard } from './LiveCamWaitCard';
import { LiveCamFramingGuide } from './LiveCamFramingGuide';
import { WAIT_COPY, showFramingGuide, waitEstimateMs, waitProgress } from './liveCamWait';
import { needsFaceGate } from './liveCamFaceGate';
import { liveCamDebug } from './liveCamFlags';
import { triggerHaptic } from '@/utils/haptics';
import { LiveCamCameraView } from './LiveCamCameraView';
import { LiveCamGarmentPicker } from './LiveCamGarmentPicker';
import { LiveCamSnapshotButton } from './LiveCamSnapshotButton';
import { useLiveCamSession } from './useLiveCamSession';
import { LIVE_CAM_CONFIG } from './liveCamTier';
import type { LiveCamGarmentSelection, LiveCamStatus } from './liveCamTypes';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { toast } from 'sonner';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

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
  /** How far the start-up is (0..1), or null when not starting; the Try on tab draws a ring. */
  onWaitProgress?: (progress: number | null) => void;
}

export const LiveCamTab: React.FC<LiveCamTabProps> = ({ hosted = false, onStatusChange, onWaitProgress }) => {
  const [garment, setGarment] = useState<LiveCamGarmentSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const supported = supportsLiveCam();
  const routeV3 = useDesignV3();
  const v3 = hosted || routeV3;
  const navigate = useNavigate();

  const {
    status, facing, flipCamera, errorMessage, notice, noticeKey, waitAnchor, waitTimes, latencyMs, session, start, stop, redrawLastFrame, readStats,
  } = useLiveCamSession({
    garment,
    localVideoRef,
    remoteCanvasRef,
  });

  // Guests (no account) get the sign-up popup instead of a session the server would refuse.
  // In sales mode the device is signed in to the demo account, so this just starts.
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();
  const startGated = () => requireAuth('use the live try-on', () => void start());
  const guestPrompt = <GuestActionPrompt open={showPrompt} onOpenChange={setShowPrompt} action={promptAction} />;

  // Diagnostics readout (?livecam_debug=1): camera size, upload fps, draw and encode time, timer lag (main-thread load), upload stalls,
  // frames skipped by the short JoyAI upload queue (drop), JoyAI's playback delay (play),
  // download fps and round trip, refreshed every second while live.
  const [debugOn] = useState(() => liveCamDebug());
  const [debugLine, setDebugLine] = useState<string | null>(null);
  useEffect(() => {
    if (!debugOn || status !== 'running') { setDebugLine(null); return; }
    const tick = () => {
      const s = readStats();
      setDebugLine(`cam ${s.camera ?? '–'} · ↑${s.sentFps} fps · draw ${s.drawMsP50 ?? '–'} ms · enc ${s.encodeMsP50 ?? '–'} ms · lag ${s.tickLagMsP50 ?? '–'} ms · skip ${s.encodeSkipped} · stall ${s.uploadBlocked} · drop ${s.sendQueueDropped} · ↓${s.receivedFps} fps · rtt ${s.rttMsP50 ?? '–'} ms · play ${s.playoutDelayMs ?? '–'} ms`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [debugOn, status, readStats]);

  // Framing guide: the opening moments once live, or whenever nobody is in view.
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [guideTick, setGuideTick] = useState(0);
  useEffect(() => {
    if (status !== 'running') { setGuideDismissed(false); return; }
    const id = window.setInterval(() => setGuideTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);
  const guideOn = showFramingGuide({
    running: status === 'running',
    faceItem: needsFaceGate(garment?.category, facing),
    sinceLiveMs: waitTimes?.liveAt ? Date.now() - waitTimes.liveAt : 0,
    dismissed: guideDismissed,
    noticeKey,
  });
  void guideTick;

  // "Let me know when it's ready": system notification if the app is in the background.
  const [notifyState, setNotifyState] = useState<'off' | 'asked' | 'on' | 'blocked'>(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'blocked' : 'off');
  const requestNotify = async () => {
    if (typeof Notification === 'undefined') { setNotifyState('blocked'); return; }
    setNotifyState('asked');
    try {
      const p = await Notification.requestPermission();
      setNotifyState(p === 'granted' ? 'on' : 'blocked');
    } catch { setNotifyState('blocked'); }
  };


  const prevStatus = useRef(status);
  useEffect(() => {
    onStatusChange?.(status);
    if (status === 'running' && prevStatus.current !== 'running') {
      // The ready moment: a tap on the wrist, and a word wherever they are.
      triggerHaptic('medium');
      if (!hosted && v3) toast.success(WAIT_COPY.readyHere);
      if (notifyState === 'on' && document.visibilityState === 'hidden') {
        try { new Notification('Azyah', { body: WAIT_COPY.ready, tag: 'azyah-live-ready' }); } catch { /* not supported here */ }
      }
    }
    prevStatus.current = status;
  }, [status, v3, hosted, onStatusChange, notifyState]);

  // The Try on tab's ring: how far the start-up is.
  useEffect(() => {
    if (!onWaitProgress) return;
    if (status !== 'starting' && status !== 'warming') { onWaitProgress(null); return; }
    const est = waitEstimateMs();
    const tick = () => onWaitProgress(waitProgress(waitAnchor ?? 'requested', waitTimes ? Date.now() - waitTimes.startedAt : 0, est));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, waitAnchor, waitTimes, onWaitProgress]);

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
        {guestPrompt}
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
              {debugLine && (
                <span className="basis-full rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white tabular-nums">{debugLine}</span>
              )}
            </>
          }
          loadingContent={
            <LiveCamWaitCard
              anchor={waitAnchor}
              startedAt={waitTimes?.startedAt ?? null}
              notifyState={notifyState}
              onNotify={() => void requestNotify()}
            />
          }
          overlay={guideOn ? <LiveCamFramingGuide onDismiss={() => setGuideDismissed(true)} /> : null}
          idleContent={
            garment ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <img src={garment.referenceImageUrl} alt="" className="h-32 w-24 rounded-xl bg-white object-cover" />
                <p className="max-w-[240px] text-[13px] text-white/80">{WAIT_COPY.idleHint}</p>
              </div>
            ) : (
              <p className="max-w-[240px] text-center text-[15px] text-white/80">{WAIT_COPY.idleHint}</p>
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
                // While it gets ready: browse on (the host keeps it starting) or cancel.
                <div className={hosted ? 'grid grid-cols-[1fr_auto] gap-2' : undefined}>
                  {hosted && (
                    <button
                      type="button"
                      onClick={() => navigate('/swipe')}
                      className="h-12 rounded-[14px] bg-white px-3 text-[15px] font-semibold text-black active:opacity-80"
                    >
                      {WAIT_COPY.keepShoppingShort}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void stop()}
                    className={`flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/15 px-4 text-[15px] font-semibold text-white active:opacity-80 ${hosted ? '' : 'w-full'}`}
                  >
                    <X className="h-[18px] w-[18px]" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startGated}
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
            : WAIT_COPY.idleHint}
        </p>

        {notice && <div className="rounded-[14px] bg-fill p-3 text-[13px] text-ink">{notice}</div>}

        {status === 'failed' && errorMessage && (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-bad p-3 text-[13px] text-bad-foreground">
            <span>{errorMessage}</span>
            <button type="button" onClick={startGated} className="shrink-0 font-semibold">Try again</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {guestPrompt}
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
              onClick={startGated}
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
            onClick={startGated}
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
    warming: 'Getting ready…',
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
