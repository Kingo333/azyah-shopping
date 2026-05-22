import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Square } from 'lucide-react';
import { LiveCamCameraView } from './LiveCamCameraView';
import { LiveCamGarmentPicker } from './LiveCamGarmentPicker';
import { LiveCamSnapshotButton } from './LiveCamSnapshotButton';
import { useLiveCamSession } from './useLiveCamSession';
import type { LiveCamGarmentSelection } from './liveCamTypes';

const supportsLiveCam = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.WebSocket && !!navigator.mediaDevices?.getUserMedia;
};

export const LiveCamTab: React.FC = () => {
  const [garment, setGarment] = useState<LiveCamGarmentSelection | null>(null);
  const [expanded, setExpanded] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const supported = supportsLiveCam();

  const { status, errorMessage, latencyMs, session, start, stop, redrawLastFrame } = useLiveCamSession({
    garment,
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

  return (
    <div className="space-y-4">
      <LiveCamGarmentPicker
        value={garment}
        onChange={setGarment}
        disabled={isRunning || isStarting}
      />

      <LiveCamCameraView
        localVideoRef={localVideoRef}
        remoteCanvasRef={remoteCanvasRef}
        isRunning={isRunning}
        status={status}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge status={status} />
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
              {isWarming ? 'Warming up GPU… up to 3 min' : isStarting ? 'Spinning up GPU…' : 'Start Live Try-On'}
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
