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
      className="fixed bottom-6 right-6 z-50 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 touch-manipulation"
      aria-label="Start voice conversation with Azyah"
    >
      <Mic size={22} />
    </Button>
  );
}