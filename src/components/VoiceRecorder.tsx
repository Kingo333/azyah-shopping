import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscription, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));

      // Send to speech-to-text service
      const { data, error } = await supabase.functions.invoke('beauty-speech-to-text', {
        body: { audio: base64 }
      });

      if (error) throw error;

      if (data.text && data.text.trim()) {
        onTranscription(data.text.trim());
        toast.success('Voice message transcribed!');
      } else {
        toast.warning('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process voice message');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getButtonState = () => {
    if (isProcessing) return { icon: Loader2, variant: 'secondary' as const, label: 'Processing...' };
    if (isRecording) return { icon: MicOff, variant: 'destructive' as const, label: 'Stop Recording' };
    return { icon: Mic, variant: 'outline' as const, label: 'Start Recording' };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      variant={buttonState.variant}
      size="icon"
      className={`transition-all duration-300 shadow-md hover:shadow-lg ${
        isRecording 
          ? 'animate-pulse bg-destructive hover:bg-destructive/90 scale-110' 
          : 'hover:scale-105'
      } ${isProcessing ? 'animate-pulse' : ''}`}
      title={buttonState.label}
    >
      <Icon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''} ${
        isRecording ? 'text-destructive-foreground' : ''
      }`} />
    </Button>
  );
};