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
      className="fixed bottom-4 left-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
      aria-label="Start voice conversation with Azyah"
    >
      <Mic size={22} />
    </Button>
  );
}