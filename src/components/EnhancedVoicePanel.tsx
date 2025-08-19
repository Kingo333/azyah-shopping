import React, { useState, useRef } from 'react';
import { Play, Pause, Download, Volume2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedVoicePanelProps {
  text?: string;
  onVoiceChange?: (voice: string) => void;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced tone' },
  { id: 'echo', name: 'Echo', description: 'Warm, friendly voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive, storytelling' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, confident tone' },
  { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, calming tone' }
];

const PREVIEW_TEXT = "Hi there! I'm your beauty assistant, ready to help you find the perfect makeup for your skin tone.";

export const EnhancedVoicePanel: React.FC<EnhancedVoicePanelProps> = ({ 
  text, 
  onVoiceChange 
}) => {
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateVoice = async (textToSpeak = text, voiceId = selectedVoice, isPreview = false) => {
    if (!textToSpeak) {
      toast.error('No text available for voice generation');
      return;
    }

    if (isPreview) {
      setPreviewingVoice(voiceId);
    } else {
      setIsLoading(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('beauty-voice', {
        body: {
          text: textToSpeak,
          voice_id: voiceId,
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
      
      if (!isPreview) {
        setAudioUrl(url);
      }

      // Play audio
      const audio = new Audio(url);
      audio.onended = () => {
        if (isPreview) {
          setPreviewingVoice(null);
        } else {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(url);
      };
      
      audio.play();
      
      if (!isPreview) {
        setIsPlaying(true);
        if (audioRef.current) {
          audioRef.current.src = url;
        }
      }

      toast.success(isPreview ? 'Voice preview played' : 'Voice generated successfully');
    } catch (error) {
      console.error('Voice generation error:', error);
      toast.error('Failed to generate voice');
    } finally {
      if (isPreview) {
        setPreviewingVoice(null);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoice(newVoice);
    onVoiceChange?.(newVoice);
  };

  const previewVoice = (voiceId: string) => {
    generateVoice(PREVIEW_TEXT, voiceId, true);
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
    <div className="p-4 border rounded-lg bg-gradient-to-br from-card to-card/80 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Voice Assistant</h3>
          <Badge variant="secondary" className="text-xs">Enhanced</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const content = document.getElementById('voice-content');
            if (content) {
              const isHidden = content.style.display === 'none';
              content.style.display = isHidden ? 'block' : 'none';
            }
          }}
          className="text-xs"
        >
          Toggle
        </Button>
      </div>
      
      <div id="voice-content" className="space-y-4"
        style={{ display: 'none' }}
      >
        <div>
          <label className="text-sm font-medium mb-2 block">Voice Selection</label>
          <Select value={selectedVoice} onValueChange={handleVoiceChange}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur border-border/50">
              {VOICES.map(voice => (
                <SelectItem key={voice.id} value={voice.id} className="py-2">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{voice.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice.id);
                      }}
                      disabled={previewingVoice === voice.id}
                      className="ml-2 h-6 px-2"
                    >
                      {previewingVoice === voice.id ? (
                        <div className="animate-pulse w-1 h-1 bg-primary rounded-full"></div>
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => generateVoice()} 
            disabled={!text || isLoading}
            size="sm"
            className="flex-1"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
          
          {audioUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAudio}
              >
                <Download className="h-3 w-3" />
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