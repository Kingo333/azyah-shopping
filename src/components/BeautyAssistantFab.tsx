import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeautyAssistantFabProps {
  onClick: () => void;
}

export function BeautyAssistantFab({ onClick }: BeautyAssistantFabProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Main button */}
      <Button
        onClick={onClick}
        className="relative w-12 h-12 !rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 hover:from-primary/90 hover:via-primary hover:to-primary/80 shadow-2xl hover:shadow-3xl border-2 border-white/30 backdrop-blur-md transition-all duration-500 active:scale-95 hover:scale-105 group p-0 overflow-hidden"
        style={{ borderRadius: '50%' }}
        aria-label="Beauty AI Assistant"
      >
        {/* Sparkle decorations */}
        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-white/80 animate-ping" />
        <Sparkles className="absolute -bottom-0.5 -left-1 w-2 h-2 text-white/60 animate-ping" style={{ animationDelay: '0.7s' }} />
        
        {/* Main icon */}
        <MessageCircle className="w-5 h-5 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
        
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
      </Button>
      
      {/* Label */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap max-w-[120px] sm:max-w-none">
        <span className="text-[10px] sm:text-xs font-medium text-white bg-black/20 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 rounded-full border border-white/20 block text-center">
          Beauty/Style AI
        </span>
      </div>
    </div>
  );
}