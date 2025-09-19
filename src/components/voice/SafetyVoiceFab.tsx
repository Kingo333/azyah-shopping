import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

interface SafetyVoiceFabProps {
  onOpen: () => void;
  className?: string;
}

export function SafetyVoiceFab({ onOpen, className = "" }: SafetyVoiceFabProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated glow effect - safety themed */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/40 via-orange-500/30 to-yellow-500/40 animate-pulse opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Main button */}
      <button
        onClick={onOpen}
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-red-600 via-red-600/90 to-red-600/70 hover:from-red-500/90 hover:via-red-600 hover:to-red-600/80 shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-md transition-all duration-500 active:scale-95 hover:scale-105 group flex items-center justify-center"
        aria-label="Start safety consultation with Azyah Safety AI"
      >
        {/* Safety decorations */}
        <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400/80 animate-ping" />
        <AlertTriangle className="absolute -bottom-0.5 -left-1 w-2 h-2 text-orange-400/60 animate-ping animation-delay-700" />
        
        {/* Shield icon */}
        <Shield className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
        
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
      </button>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs md:text-sm font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
          Safety AI
        </span>
      </div>
    </div>
  );
}