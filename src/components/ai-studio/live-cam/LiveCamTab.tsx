import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Sparkles, Square } from 'lucide-react';
import { LiveCamCameraView } from './LiveCamCameraView';
import { LiveCamGarmentPicker } from './LiveCamGarmentPicker';
import { LiveCamSnapshotButton } from './LiveCamSnapshotButton';
import { useLiveCamSession } from './useLiveCamSession';
import { LIVE_CAM_TIER_CONFIG, isPremiumUiEnabled, isPremiumUnavailable } from './liveCamTier';
import type { LiveCamGarmentSelection, LiveCamTier } from './liveCamTypes';

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

  const {
    status, errorMessage, errorCode, notice, latencyMs, session, activeTier, start, stop, redrawLastFrame,
  } = useLiveCamSession({
    garment,
    tier: showTierPicker ? tier : 'standard',
    localVideoRef,
    remoteCanvasRef,
  });

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

  return (
    <div className="space-y-4">
      <LiveCamGarmentPicker
        value={garment}
        onChange={setGarment}
        disabled={isRunning || isStarting}
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
