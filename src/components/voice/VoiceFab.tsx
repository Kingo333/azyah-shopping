import React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceFabProps {
  onOpen: () => void;
}

export function VoiceFab({ onOpen }: VoiceFabProps) {
  return (
    <Button
      onClick={onOpen}
      size="lg"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 hover:scale-105 border-2 border-white/20"
      aria-label="Start voice conversation with Azyah"
    >
      <Mic className="!w-5 !h-5 md:!w-6 md:!h-6 text-white" strokeWidth={2.5} />
    </Button>
  );
}