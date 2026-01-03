import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Shirt } from 'lucide-react';

interface AiTryOnCardProps {
  onTryNow: () => void;
}

export function AiTryOnCard({ onTryNow }: AiTryOnCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/10 via-secondary/50 to-[hsl(var(--azyah-maroon))]/5 border border-[hsl(var(--azyah-maroon))]/20 p-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[hsl(var(--azyah-maroon))]/15 flex items-center justify-center border border-[hsl(var(--azyah-maroon))]/25">
          <Shirt className="h-6 w-6 text-[hsl(var(--azyah-maroon))]" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-sm text-foreground">AI Virtual Try-On</h3>
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            See how outfits look on you instantly
          </p>
        </div>
        
        {/* CTA Button */}
        <Button
          size="sm"
          onClick={onTryNow}
          className="flex-shrink-0 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white text-xs px-3 h-8"
        >
          Try Now
        </Button>
      </div>
      
      {/* Decorative element */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-[hsl(var(--azyah-maroon))]/5 blur-xl" />
    </div>
  );
}
