import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { LiveCamStatus } from './liveCamTypes';

interface Props {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
  isRunning: boolean;
  status?: LiveCamStatus;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export const LiveCamCameraView: React.FC<Props> = ({
  localVideoRef,
  remoteCanvasRef,
  isRunning,
  status,
  expanded = false,
  onToggleExpand,
}) => {
  const isWarming = status === 'warming';
  const warmingCopy = 'Warming up GPU… this can take up to 3 minutes';
  if (expanded) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black h-[70vh] flex items-center justify-center">
        <canvas ref={remoteCanvasRef} className="w-full h-full object-contain" />
        {!isRunning && !isWarming && (
          <span className="absolute text-white/70 text-xs">Try-on preview</span>
        )}
        {isWarming && (
          <span className="absolute text-white/80 text-xs px-3 py-1 rounded-full bg-black/50">{warmingCopy}</span>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full">
          Try-on
        </span>

        {/* PiP local cam */}
        <div className="absolute bottom-3 right-3 w-32 sm:w-40 aspect-[3/4] rounded-lg overflow-hidden bg-black ring-2 ring-white/30 shadow-lg">
          <video
            ref={localVideoRef}
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
          <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wide bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            You
          </span>
        </div>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Collapse try-on preview"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl overflow-hidden bg-black aspect-[16/9] relative">
        <video
          ref={localVideoRef}
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full">
          You
        </span>
      </div>
      <div className="rounded-xl overflow-hidden bg-black aspect-[16/9] relative flex items-center justify-center">
        <canvas ref={remoteCanvasRef} className="w-full h-full object-contain" />
        {!isRunning && !isWarming && (
          <span className="absolute text-white/70 text-xs">Try-on preview</span>
        )}
        {isWarming && (
          <span className="absolute text-white/80 text-[11px] px-2 py-1 rounded-full bg-black/50 text-center max-w-[90%]">
            {warmingCopy}
          </span>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full">
          Try-on
        </span>
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Expand try-on preview"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
