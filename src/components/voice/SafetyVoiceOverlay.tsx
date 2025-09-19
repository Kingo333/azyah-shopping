import React, { useEffect, useRef } from 'react';
import { X, Download, Shield, AlertTriangle, Settings, Share, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAzyahSafetyVoice } from '@/hooks/useAzyahSafetyVoice';
import { useOrbRenderer } from '@/components/voice/useOrbRenderer';

const CaptionsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 10h.01M17 10h.01M7 14h3M14 14h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface SafetyVoiceOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SafetyVoiceOverlay({ open, onClose }: SafetyVoiceOverlayProps) {
  const {
    state,
    isConnected,
    isConnecting,
    error,
    showCaptions,
    currentCaption,
    progressStep,
    totalSteps,
    reportData,
    reportUrl,
    connectOnce,
    disconnect,
    toggleCaptions,
    pttDown,
    pttUp,
    interrupt,
  } = useAzyahSafetyVoice();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInteracting = useRef(false);

  // Initialize orb renderer for visual feedback
  useOrbRenderer(canvasRef, 0.5); // Basic orb with moderate intensity

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (isConnected) {
        disconnect();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isConnected, disconnect]);

  const handleCanvasInteraction = (isActive: boolean) => {
    isInteracting.current = isActive;
    if (isActive) {
      pttDown();
    } else {
      pttUp();
    }
  };

  const getStateHint = () => {
    switch (state) {
      case 'disconnected':
        return 'Touch and hold to start safety consultation';
      case 'connecting':
        return 'Connecting to Safety AI...';
      case 'introduction':
        return 'Listening for your safety needs...';
      case 'decision':
        return 'Choose: Safety checklist or incident report?';
      case 'checklist_mode':
        return 'Describing your situation for safety checklist...';
      case 'checklist_interaction':
        return 'Interacting with safety checklist - say "complete", "next", or "reset"';
      case 'reporting':
        return `Incident reporting: Question ${progressStep} of ${totalSteps}`;
      case 'complete':
        return 'Safety report completed - download ready';
      default:
        return 'Touch and hold to speak with Safety AI';
    }
  };

  const getProgressPercentage = () => {
    if (state === 'reporting' && totalSteps > 0) {
      return (progressStep / totalSteps) * 100;
    }
    return state === 'complete' ? 100 : 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <Info className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCaptions}
          className={`text-white/80 hover:text-white hover:bg-white/10 ${
            showCaptions ? 'bg-white/20' : ''
          }`}
        >
          <CaptionsIcon />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <Share className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 left-4 text-white/80 hover:text-white hover:bg-white/10"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Safety AI header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-full bg-red-600/20 border border-red-500/30">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Safety AI</h1>
            <p className="text-white/60 text-sm">HSE Assistant</p>
          </div>
        </div>

        {/* Progress bar for incident reporting */}
        {state === 'reporting' && (
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center justify-between text-sm text-white/60 mb-2">
              <span>Incident Report Progress</span>
              <span>{progressStep}/{totalSteps}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Interactive orb */}
        <div className="relative mb-8">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="touch-none select-none cursor-pointer"
            onMouseDown={() => handleCanvasInteraction(true)}
            onMouseUp={() => handleCanvasInteraction(false)}
            onMouseLeave={() => handleCanvasInteraction(false)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleCanvasInteraction(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleCanvasInteraction(false);
            }}
            onKeyDown={(e) => {
              if (e.code === 'Space') {
                e.preventDefault();
                handleCanvasInteraction(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.code === 'Space') {
                e.preventDefault();
                handleCanvasInteraction(false);
              }
            }}
            tabIndex={0}
          />
          
          {/* Safety icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AlertTriangle className="w-12 h-12 text-red-400/60" />
          </div>
        </div>

        {/* State hint */}
        <p className="text-center text-white/80 text-lg mb-4 max-w-md">
          {getStateHint()}
        </p>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4 max-w-md">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Live captions */}
        {showCaptions && currentCaption && (
          <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-white text-center">{currentCaption}</p>
            </div>
          </div>
        )}

        {/* Download button for completed reports */}
        {state === 'complete' && reportUrl && (
          <Button
            onClick={() => window.open(reportUrl, '_blank')}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <Download className="w-4 h-4" />
            Download HSE Report
          </Button>
        )}

        {/* Interrupt button when AI is speaking */}
        {isConnected && state !== 'disconnected' && state !== 'connecting' && (
          <Button
            variant="outline"
            onClick={interrupt}
            className="mt-4 border-white/20 text-white/80 hover:bg-white/10"
          >
            Interrupt
          </Button>
        )}
      </div>

      {/* Audio element for playback */}
      <audio autoPlay className="hidden" />
    </div>
  );
}