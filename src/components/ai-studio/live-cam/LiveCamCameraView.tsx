import React from 'react';

interface Props {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteCanvasRef: React.RefObject<HTMLCanvasElement>;
  isRunning: boolean;
}

export const LiveCamCameraView: React.FC<Props> = ({ localVideoRef, remoteCanvasRef, isRunning }) => {
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
        {!isRunning && (
          <span className="absolute text-white/70 text-xs">Try-on preview</span>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-full">
          Try-on
        </span>
      </div>
    </div>
  );
};
