import React, { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { LiveCamStatus } from './liveCamTypes';

interface Props {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
  isRunning: boolean;
  status?: LiveCamStatus;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onCanvasResize?: () => void;
}

export const LiveCamCameraView: React.FC<Props> = ({
  localVideoRef,
  remoteCanvasRef,
  isRunning,
  status,
  expanded = false,
  onToggleExpand,
  onCanvasResize,
}) => {
  const isWarming = status === 'warming';
  const warmingCopy = 'Warming up GPU… this can take up to 3 minutes';

  // Repaint cached frame whenever the visible canvas's box changes size.
  useEffect(() => {
    const canvas = remoteCanvasRef.current;
    if (!canvas || !onCanvasResize) return;
    const ro = new ResizeObserver(() => onCanvasResize());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [remoteCanvasRef, onCanvasResize]);

  // Outer wrapper: grid in compact, single full-bleed block when expanded.
  // The video and canvas DOM nodes themselves are NEVER unmounted across
  // toggles — only their wrapper classes change.
  const outerClass = expanded
    ? 'relative w-full rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-auto sm:h-[calc(100vh-160px)] sm:max-h-[calc(100vh-160px)]'
    : 'relative grid grid-cols-2 gap-3';

  const localWrapClass = expanded
    ? 'absolute bottom-3 right-3 w-32 sm:w-40 aspect-[3/4] rounded-lg overflow-hidden bg-black ring-2 ring-white/30 shadow-lg z-10'
    : 'order-1 rounded-xl overflow-hidden bg-black aspect-[16/9] relative';

  const remoteWrapClass = expanded
    ? 'absolute inset-0 z-0 flex items-center justify-center bg-black'
    : 'order-2 rounded-xl overflow-hidden bg-black aspect-[16/9] relative flex items-center justify-center';

  // In both modes the canvas is a flex child sized by max-w/max-h-full so the
  // bitmap is preserved during reflows (no momentary 0-size or stretching).
  const canvasClass = 'max-w-full max-h-full w-auto h-auto object-contain';

  return (
    <div className={outerClass}>
      {/* Remote (AI) canvas — always mounted */}
      <div className={remoteWrapClass}>
        {expanded ? (
          <div className="w-full aspect-[16/9] bg-black">
            <canvas ref={remoteCanvasRef} className="w-full h-full object-contain" />
          </div>
        ) : (
          <canvas ref={remoteCanvasRef} className={canvasClass} />
        )}
        {!isRunning && !isWarming && (
          <span className="absolute text-white/70 text-xs z-20">Try-on preview</span>
        )}
        {isWarming && (
          <span className="absolute text-white/80 text-[11px] px-2 py-1 rounded-full bg-black/50 text-center max-w-[90%] z-20">
            {warmingCopy}
          </span>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full z-20">
          Try-on
        </span>
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Collapse try-on preview' : 'Expand try-on preview'}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Local video — always mounted */}
      <div className={localWrapClass}>
        <video
          ref={localVideoRef}
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
        <span
          className={`absolute ${
            expanded ? 'top-1 left-1 text-[9px] px-1.5' : 'top-2 left-2 text-[10px] px-2'
          } uppercase tracking-wide bg-black/50 text-white py-0.5 rounded-full`}
        >
          You
        </span>
      </div>
    </div>
  );
};
