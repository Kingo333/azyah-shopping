import React, { useState, useRef } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoicePanelProps {
  text?: string;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'shimmer', name: 'Shimmer' }
];

export const VoicePanel: React.FC<VoicePanelProps> = ({ text }) => {
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateVoice = async () => {
    if (!text) {
      toast.error('No text available for voice generation');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('beauty-voice', {
        body: {
          text,
          voice_id: selectedVoice,
          want_mp3: true
        }
      });

      if (error) throw error;

      // Convert base64 to blob URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
        { type: data.mime }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Auto-play
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }

      toast.success('Voice generated successfully');
    } catch (error) {
      console.error('Voice generation error:', error);
      toast.error('Failed to generate voice');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `beauty-routine-${selectedVoice}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 border rounded-lg bg-background">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4" />
        <h3 className="font-medium">Voice Assistant</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Hear your beauty routine with AI voice generation
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Voice</label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map(voice => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateVoice} 
            disabled={!text || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Generating...' : 'Generate Voice'}
          </Button>
          
          {audioUrl && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={downloadAudio}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
};