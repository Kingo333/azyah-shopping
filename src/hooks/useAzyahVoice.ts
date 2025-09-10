import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeClient } from '@/lib/voice/RealtimeClient';
import { supabase } from '@/integrations/supabase/client';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export function useAzyahVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);
  const [state, setState] = useState<VoiceState>('idle');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captions, setCaptions] = useState('');
  const [level, setLevel] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const connectOnce = useCallback(async () => {
    if (connected || state === 'connecting') return;
    
    try {
      setState('connecting');
      setError(null);

      console.log('Requesting realtime session...');
      const { data, error: funcError } = await supabase.functions.invoke('realtime-session');

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data?.success || !data?.client_secret?.value) {
        throw new Error('Failed to get ephemeral token');
      }

      const ephemeralKey = data.client_secret.value;
      console.log('Got ephemeral key, connecting...');

      // Ensure audio element exists
      if (!audioRef.current) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audioRef.current = audio;
      }

      clientRef.current = new RealtimeClient({
        audioEl: audioRef.current,
        onMessage: (message: any) => {
          console.log('Voice message:', message.type);
          
          switch (message.type) {
            case 'session.created':
              console.log('Session created');
              break;
            case 'session.updated':
              console.log('Session updated');
              break;
            case 'input_audio_buffer.speech_started':
              setState('listening');
              break;
            case 'input_audio_buffer.speech_stopped':
              setState('thinking');
              break;
            case 'response.created':
              setState('thinking');
              break;
            case 'response.audio.delta':
              setState('speaking');
              break;
            case 'response.audio_transcript.delta':
              if (message.delta) {
                setCaptions(prev => prev + message.delta);
              }
              break;
            case 'response.audio_transcript.done':
              setCaptions('');
              break;
            case 'response.done':
              setState('idle');
              setCaptions('');
              break;
            case 'error':
              console.error('Realtime API error:', message);
              setError(message.error?.message || 'Unknown error');
              setState('idle');
              break;
          }
        },
        onLevel: (levelValue: number) => {
          setLevel(levelValue);
        },
      });

      await clientRef.current.connect(ephemeralKey);
      setConnected(true);
      setState('idle');
      console.log('Successfully connected to voice interface');

    } catch (error) {
      console.error('Error connecting to voice interface:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setState('idle');
      setConnected(false);
    }
  }, [connected, state]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setConnected(false);
    setState('idle');
    setCaptions('');
    setLevel(0);
  }, []);

  const toggleCaptions = useCallback(() => {
    setCaptionsOn(prev => !prev);
  }, []);

  const pttDown = useCallback(async () => {
    if (!connected) {
      await connectOnce();
      return;
    }
    
    if (state === 'speaking') {
      // Interrupt if speaking
      clientRef.current?.interrupt();
      setState('listening');
    } else if (state === 'idle') {
      setState('listening');
    }
  }, [connected, state, connectOnce]);

  const pttUp = useCallback(() => {
    if (state === 'listening') {
      setState('thinking');
      clientRef.current?.endTurn();
    }
  }, [state]);

  const interrupt = useCallback(() => {
    if (state === 'speaking') {
      clientRef.current?.interrupt();
      setState('idle');
    }
  }, [state]);

  return {
    audioRef,
    state,
    connected,
    error,
    pttDown,
    pttUp,
    interrupt,
    disconnect,
    captions,
    captionsOn,
    toggleCaptions,
    level,
    connectOnce,
  };
}