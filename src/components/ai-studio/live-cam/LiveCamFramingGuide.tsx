import React from 'react';
import { WAIT_COPY } from './liveCamWait';

/**
 * Framing guide: a see-through, dotted head-and-shoulders outline that shows where to
 * stand once the mirror is live (the opening moments, and whenever nobody is in view).
 * Tap anywhere on it to put it away. Drawn as one SVG so it scales with the stage.
 */
export const LiveCamFramingGuide: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <button
    type="button"
    onClick={onDismiss}
    aria-label="Framing guide: stand with your head and shoulders in view. Tap to hide."
    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-transparent animate-in fade-in duration-500"
  >
    <svg viewBox="0 0 200 260" className="h-[62%] max-h-[520px] w-auto opacity-80" aria-hidden>
      {/* head */}
      <ellipse cx="100" cy="78" rx="46" ry="56" fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth="2.5" strokeDasharray="6 7" strokeLinecap="round" />
      {/* neck + shoulders */}
      <path
        d="M78 128 C78 146, 66 152, 44 160 C18 170, 6 188, 4 232 L4 258 M196 258 L196 232 C194 188, 182 170, 156 160 C134 152, 122 146, 122 128"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeDasharray="6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="mt-3 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-medium text-white">{WAIT_COPY.guide}</span>
  </button>
);
