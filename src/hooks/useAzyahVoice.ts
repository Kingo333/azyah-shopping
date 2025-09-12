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
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar' | null>(null);
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
      
      // Get current user to pass to session creation
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: funcError } = await supabase.functions.invoke('realtime-session', {
        body: { user_id: user?.id }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data?.success || !data?.client_secret?.value) {
        throw new Error('Failed to get ephemeral token');
      }

      const ephemeralKey = data.client_secret.value;
      console.log('Got ephemeral key, voice usage:', data.voiceUsage);

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
              console.log('Speech started detected by server');
              setState('listening');
              break;
            case 'input_audio_buffer.speech_stopped':
              console.log('Speech stopped detected by server');
              setState('thinking');
              // Now create the response since speech was detected
              clientRef.current?.createResponse();
              break;
            case 'response.created':
              setState('thinking');
              break;
            case 'response.audio.delta':
              setState('speaking');
              break;
            case 'response.audio_transcript.delta':
              if (message.delta) {
                // Detect language based on script
                const isArabic = /[\u0600-\u06FF]/.test(message.delta);
                const detectedLang = isArabic ? 'ar' : 'en';
                
                // Only show captions in the detected language
                setCurrentLanguage(detectedLang);
                setCaptions(prev => prev + message.delta);
              }
              break;
            case 'response.audio_transcript.done':
              setCaptions('');
              setCurrentLanguage(null);
              break;
            case 'response.done':
              setState('idle');
              setCaptions('');
              setCurrentLanguage(null);
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
      setState('idle');
    } else if (state === 'idle') {
      // Just indicate we're ready - server VAD will detect speech
      setState('idle'); // Stay idle until server detects speech
      console.log('Microphone active, waiting for speech...');
    }
  }, [connected, state, connectOnce]);

  const pttUp = useCallback(() => {
    // With server VAD, we don't need to do anything on PTT release
    // The server will automatically detect when speech stops
    console.log('PTT released, server will detect speech end...');
  }, []);

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
    currentLanguage,
    level,
    connectOnce,
  };
}