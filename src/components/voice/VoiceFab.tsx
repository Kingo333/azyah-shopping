import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface VoiceFabProps {
  onOpen: () => void;
  className?: string;
}

export function VoiceFab({ onOpen, className = "" }: VoiceFabProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-secondary/30 to-accent/40 animate-pulse opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Main button */}
      <button
        onClick={onOpen}
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 hover:from-primary/90 hover:via-primary hover:to-primary/80 shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-md transition-all duration-500 active:scale-95 hover:scale-105 group flex items-center justify-center"
        aria-label="Start voice conversation with Azyah"
      >
        {/* Sparkle decorations */}
        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-white/80 animate-ping" />
        <Sparkles className="absolute -bottom-0.5 -left-1 w-2 h-2 text-white/60 animate-ping animation-delay-700" />
        
        {/* Mic icon */}
        <Mic className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
        
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
      </button>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs md:text-sm font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
          Ask Azyah
        </span>
      </div>
    </div>
  );
}