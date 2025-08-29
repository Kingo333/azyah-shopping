import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, VolumeX, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TextToVoiceConverterProps {
  text: string;
  className?: string;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Balanced and clear' },
  { id: 'echo', name: 'Echo', description: 'Warm and friendly' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Bright and engaging' },
  { id: 'shimmer', name: 'Shimmer', description: 'Gentle and soothing' }
];

export function TextToVoiceConverter({ text, className }: TextToVoiceConverterProps) {
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateVoice = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('beauty-voice', {
        body: {
          text: text.trim(),
          voice_id: selectedVoice,
          want_mp3: true,
          save_to_storage: false
        }
      });

      if (error) {
        console.error('Voice generation error:', error);
        return;
      }

      if (data?.audio_content) {
        // Convert base64 to blob and create URL
        const audioData = atob(data.audio_content);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Auto-play the generated audio
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Voice generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'azyah-response.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!audioUrl ? (
        <>
          {!showVoiceSelector ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceSelector(true)}
              disabled={isGenerating}
              className="h-7 px-2 text-xs hover:bg-primary/10"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
              {isGenerating ? 'Generating...' : 'Voice'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="w-24 h-7 text-xs bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id} className="text-xs">
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateVoice}
                disabled={isGenerating}
                className="h-7 px-2 text-xs hover:bg-primary/10"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
                Generate
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="h-7 px-2 text-xs hover:bg-primary/10"
          >
            {isPlaying ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadAudio}
            className="h-7 px-2 text-xs hover:bg-primary/10"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}