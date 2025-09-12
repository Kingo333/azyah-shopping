import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeClient } from '@/lib/voice/RealtimeClient';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceUsage } from '@/hooks/useVoiceUsage';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export function useAzyahVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);
  const [state, setState] = useState<VoiceState>('idle');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timeout management
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(10);
  
  // Voice usage tracking
  const { canStartSession, logUsage, getLimitWarning } = useVoiceUsage();
  const sessionStartRef = useRef<Date | null>(null);
  const speakingStartRef = useRef<Date | null>(null);

  // UI state
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captions, setCaptions] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar' | null>(null);
  const [level, setLevel] = useState(0);

  // Helper functions for timeout management
  const resetTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    setShowTimeoutWarning(false);
    setTimeoutCountdown(10);
  }, []);

  const startIdleTimeout = useCallback(() => {
    resetTimeouts();
    idleTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setTimeoutCountdown(10);
      
      const countdown = setInterval(() => {
        setTimeoutCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            disconnect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      warningTimeoutRef.current = countdown;
    }, 10000); // 10 seconds of inactivity
  }, [resetTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetTimeouts();
      clientRef.current?.disconnect();
    };
  }, [resetTimeouts]);

  const connectOnce = useCallback(async () => {
    if (connected || state === 'connecting') return;
    
    // Check usage limits before connecting
    if (!canStartSession) {
      const warning = getLimitWarning();
      setError(warning || 'Daily voice limit reached');
      return;
    }
    
    try {
      setState('connecting');
      setError(null);
      sessionStartRef.current = new Date();

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
              console.log('Speech started detected by server');
              setState('listening');
              resetTimeouts(); // Reset on speech start
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
              if (state !== 'speaking') {
                speakingStartRef.current = new Date();
              }
              setState('speaking');
              resetTimeouts(); // Reset on AI response
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
              // Log usage when response is done
              if (speakingStartRef.current) {
                const speakingDuration = (new Date().getTime() - speakingStartRef.current.getTime()) / 1000;
                if (speakingDuration > 0) {
                  logUsage(speakingDuration);
                }
                speakingStartRef.current = null;
              }
              setState('idle');
              setCaptions('');
              setCurrentLanguage(null);
              startIdleTimeout(); // Start timeout when response is done
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
      sessionStartRef.current = null;
    }
  }, [connected, state, canStartSession, getLimitWarning, logUsage, resetTimeouts]);

  const disconnect = useCallback(() => {
    // Reset timeouts first
    resetTimeouts();
    
    // Log any remaining usage before disconnecting
    if (sessionStartRef.current) {
      const sessionDuration = (new Date().getTime() - sessionStartRef.current.getTime()) / 1000;
      if (sessionDuration > 0) {
        logUsage(sessionDuration);
      }
      sessionStartRef.current = null;
    }
    
    clientRef.current?.disconnect();
    setConnected(false);
    setState('idle');
    setCaptions('');
    setLevel(0);
    speakingStartRef.current = null;
  }, [logUsage, resetTimeouts]);

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
      // Log speaking time before interrupting
      if (speakingStartRef.current) {
        const speakingDuration = (new Date().getTime() - speakingStartRef.current.getTime()) / 1000;
        if (speakingDuration > 0) {
          logUsage(speakingDuration);
        }
        speakingStartRef.current = null;
      }
      clientRef.current?.interrupt();
      setState('idle');
    }
  }, [state, logUsage]);

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
    showTimeoutWarning,
    timeoutCountdown,
  };
}