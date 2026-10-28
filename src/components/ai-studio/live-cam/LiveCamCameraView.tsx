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
  /**
   * 'split' (default): today's two panes. 'stage' (design v3): the try-on fills
   * one big stage with your camera as a small inset.
   */
  variant?: 'split' | 'stage';
  /** Stage only: overlay in the top-left corner (status pills). */
  topLeft?: React.ReactNode;
  /** Stage only: shown in the middle while nothing is streaming. */
  idleContent?: React.ReactNode;
  /** Stage only: controls along the bottom (garment strip, start / shutter). */
  bottom?: React.ReactNode;
}

export const LiveCamCameraView: React.FC<Props> = ({
  localVideoRef,
  remoteCanvasRef,
  isRunning,
  status,
  expanded = false,
  onToggleExpand,
  onCanvasResize,
  variant = 'split',
  topLeft,
  idleContent,
  bottom,
}) => {
  const stage = variant === 'stage';
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
  const outerClass = stage
    ? expanded
      ? 'fixed inset-x-0 top-[var(--safe-top,0px)] bottom-[var(--safe-bottom,0px)] z-[60] bg-black shadow-[0_0_0_100vmax_#000]'
      : 'relative w-full rounded-[20px] overflow-hidden bg-black h-[calc(100dvh-250px)] min-h-[440px] max-h-[760px]'
    : expanded
      ? 'relative w-full rounded-xl overflow-hidden bg-black aspect-[9/16] sm:aspect-auto sm:h-[calc(100vh-160px)] sm:max-h-[calc(100vh-160px)]'
      : 'relative grid grid-cols-2 gap-3';

  const localWrapClass = stage
    ? 'absolute top-[60px] right-3 w-[24%] max-w-[130px] aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 ring-2 ring-white/40 z-10'
    : expanded
      ? 'absolute bottom-3 right-3 w-24 sm:w-32 md:w-40 aspect-[3/4] rounded-lg overflow-hidden bg-black ring-2 ring-white/30 shadow-lg z-10'
      : 'order-1 rounded-xl overflow-hidden bg-black aspect-[3/4] relative';

  const remoteWrapClass = stage || expanded
    ? 'absolute inset-0 z-0 flex items-center justify-center bg-black'
    : 'order-2 rounded-xl overflow-hidden bg-black aspect-[9/16] relative flex items-center justify-center';

  // Canvas sized by CSS (max-w/max-h-full) — bitmap stays at 288×512 with
  // contain-fit drawn manually inside renderRemoteFrame, so the frame is
  // always centered on black with no zoom/crop/stretch.
  const canvasClass = 'max-w-full max-h-full w-auto h-auto object-contain';

  return (
    <div className={outerClass}>
      {/* Remote (AI) canvas — always mounted */}
      <div className={remoteWrapClass}>
        <canvas ref={remoteCanvasRef} width={288} height={512} className={canvasClass} />
        {!isRunning && !isWarming && (stage ? (
          idleContent && <div className="absolute inset-x-0 top-0 bottom-44 z-20 flex items-center justify-center p-6">{idleContent}</div>
        ) : (
          <span className="absolute text-white/70 text-xs z-20">Try-on preview</span>
        ))}
        {isWarming && (
          <span className="absolute text-white/80 text-[11px] px-2 py-1 rounded-full bg-black/50 text-center max-w-[90%] z-20">
            {warmingCopy}
          </span>
        )}
        {stage && bottom && <div className="absolute inset-x-0 bottom-0 z-30">{bottom}</div>}
        {stage ? (
          topLeft && <div className="absolute top-3 left-3 right-16 z-20 flex flex-wrap items-center gap-1.5">{topLeft}</div>
        ) : (
          <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full z-20">
            Try-on
          </span>
        )}
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Collapse try-on preview' : 'Expand try-on preview'}
            className={`absolute ${stage ? 'top-3 right-3 h-9 w-9' : 'top-2 right-2 h-8 w-8'} rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20`}
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
            stage
              ? 'top-1.5 left-1.5 text-[10px] px-1.5 font-medium'
              : expanded ? 'top-1 left-1 text-[9px] px-1.5 uppercase tracking-wide' : 'top-2 left-2 text-[10px] px-2 uppercase tracking-wide'
          } bg-black/50 text-white py-0.5 rounded-full`}
        >
          You
        </span>
      </div>
    </div>
  );
};
