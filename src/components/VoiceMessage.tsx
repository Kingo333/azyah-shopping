import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceMessageProps {
  audioUrl?: string;
  transcription?: string;
  isUser?: boolean;
  className?: string;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  transcription,
  isUser = false,
  className
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl || !isAudioReady) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleAudioLoad = () => {
    if (audioRef.current) {
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.oncanplaythrough = () => setIsAudioReady(true);
      audioRef.current.onerror = () => setIsAudioReady(false);
    }
  };

  // Only show the component when audio is ready or if there's transcription
  if (!isAudioReady && !transcription) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg max-w-xs",
      isUser 
        ? "bg-primary text-primary-foreground ml-auto" 
        : "bg-muted text-muted-foreground",
      className
    )}>
      {audioUrl && isAudioReady && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 flex-shrink-0",
              isUser ? "hover:bg-primary-foreground/20" : "hover:bg-background/20"
            )}
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedData={handleAudioLoad}
            preload="metadata"
          />
        </>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <Volume2 className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs font-medium">
            {isUser ? "Voice message" : "Azyah's response"}
          </span>
        </div>
        
        {transcription && (
          <div>
            <button
              className="text-xs opacity-70 hover:opacity-100 underline"
              onClick={() => setShowTranscription(!showTranscription)}
            >
              {showTranscription ? "Hide" : "Show"} text
            </button>
            
            {showTranscription && (
              <p className="text-xs mt-1 break-words">{transcription}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};