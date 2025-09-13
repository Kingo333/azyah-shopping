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
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 hover:scale-105 border-2 border-primary-foreground/20"
      aria-label="Start voice conversation with Azyah"
    >
      <Mic size={18} className="md:w-6 md:h-6" />
    </Button>
  );
}