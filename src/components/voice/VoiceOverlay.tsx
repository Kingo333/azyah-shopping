import React, { useEffect, useRef } from 'react';
import { X, Info, Share2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAzyahVoice } from '@/hooks/useAzyahVoice';
import { useOrbRenderer } from './useOrbRenderer';

// Caption toggle icon component
function CaptionsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M9.6 14.8c-1.8 0-3-1.3-3-2.8s1.2-2.8 3-2.8c.8 0 1.5.2 2.1.7l-.7 1.2c-.4-.3-.8-.5-1.4-.5-.9 0-1.5.6-1.5 1.4s.6 1.4 1.5 1.4c.6 0 1-.2 1.4-.5l.7 1.2c-.6.5-1.3.7-2.1.7Zm6.8 0c-1.8 0-3-1.3-3-2.8s1.2-2.8 3-2.8c.8 0 1.5.2 2.1.7l-.7 1.2c-.4-.3-.8-.5-1.4-.5-.9 0-1.5.6-1.5 1.4s.6 1.4 1.5 1.4c.6 0 1-.2 1.4-.5l.7 1.2c-.6.5-1.3.7-2.1.7Z" fill="currentColor"/>
    </svg>
  );
}

interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function VoiceOverlay({ open, onClose }: VoiceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    audioRef,
    state,
    error,
    captions,
    captionsOn,
    toggleCaptions,
    currentLanguage,
    level,
    pttDown,
    pttUp,
    interrupt,
    connectOnce,
  } = useAzyahVoice();

  useOrbRenderer(canvasRef, level, state === 'speaking' || state === 'listening');

  useEffect(() => {
    if (!open) return;

    // Prevent scrolling when overlay is open
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    // Initialize connection when overlay opens
    connectOnce();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open, connectOnce]);

  if (!open) return null;

  const getHintText = () => {
    switch (state) {
      case 'connecting':
        return 'Connecting to Azyah...';
      case 'listening':
        return 'Listening... speak naturally';
      case 'thinking':
        return 'Azyah is thinking...';
      case 'speaking':
        return 'Azyah is speaking — tap to interrupt';
      default:
        return 'Loading...';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation with Azyah"
    >
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/10"
          aria-label="Information"
        >
          <Info size={20} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCaptions}
          className={`text-white/90 hover:text-white hover:bg-white/10 ${
            captionsOn ? 'text-blue-400' : ''
          }`}
          aria-label={`${captionsOn ? 'Hide' : 'Show'} captions`}
        >
          <CaptionsIcon />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/10"
          aria-label="Share"
        >
          <Share2 size={20} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/10"
          aria-label="Settings"
        >
          <Settings size={20} />
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-4 left-4 text-white/90 hover:text-white hover:bg-white/10"
        aria-label="Close voice interface"
      >
        <X size={20} />
      </Button>

      {/* No conversation stored message */}
      <div className="absolute bottom-[5vh] left-0 right-0 text-center px-6">
        <p className="text-white/60 text-xs">No conversation is stored</p>
      </div>

      {/* Main orb */}
      <canvas
        ref={canvasRef}
        className="w-[min(70vw,400px)] h-[min(70vw,400px)] aspect-square cursor-pointer"
        onMouseDown={pttDown}
        onMouseUp={pttUp}
        onMouseLeave={pttUp}
        onTouchStart={(e) => {
          e.preventDefault();
          pttDown();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          pttUp();
        }}
        role="button"
        tabIndex={0}
        aria-label="Voice input button"
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (state === 'speaking') {
              interrupt();
            } else {
              pttDown();
            }
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            pttUp();
          }
        }}
      />

      {/* Live captions */}
      {captionsOn && captions && (
        <div className="absolute bottom-[20vh] left-0 right-0 flex justify-center px-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 max-w-[min(90vw,600px)]">
            <p 
              className={`text-center text-white/90 text-base leading-relaxed ${
                currentLanguage === 'ar' ? 'text-right' : 'text-left'
              }`}
              dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            >
              {captions}
            </p>
          </div>
        </div>
      )}

      {/* Hint text */}
      <div className="absolute bottom-[10vh] left-0 right-0 text-center px-6">
        {state === 'idle' ? (
          <div className="text-white/80 text-sm tracking-wide">
            <p>Say Hello</p>
            <p className="text-xs mt-1">قل مرحبا</p>
          </div>
        ) : (
          <p className="text-white/80 text-sm tracking-wide">
            {getHintText()}
          </p>
        )}
      </div>

      {/* Audio element */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Interrupt button when speaking */}
      {state === 'speaking' && (
        <Button
          onClick={interrupt}
          variant="outline"
          size="sm"
          className="absolute bottom-[25vh] left-1/2 -translate-x-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Interrupt
        </Button>
      )}
    </div>
  );
}