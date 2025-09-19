import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SafetyRealtimeClient } from '@/lib/voice/SafetyRealtimeClient';

interface SafetyReport {
  dateTime?: string;
  location?: string;
  weather?: string;
  activity?: string;
  equipment?: string;
  injuredPerson?: string;
  injuryDetails?: string;
  otherInvolved?: string;
  witnesses?: string;
  damage?: string;
  photos?: string;
  immediateActions?: string;
  prevention?: string;
  reporter?: string;
}

type SafetyVoiceState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'introduction'
  | 'decision'
  | 'checklist'
  | 'reporting'
  | 'complete';

export function useAzyahSafetyVoice() {
  const [state, setState] = useState<SafetyVoiceState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [currentCaption, setCurrentCaption] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const [totalSteps] = useState(14); // Number of reporting questions
  const [reportData, setReportData] = useState<SafetyReport>({});
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const clientRef = useRef<SafetyRealtimeClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;
    
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const connectOnce = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      setState('connecting');

      const response = await supabase.functions.invoke('safety-realtime-session');
      
      if (!response.data?.client_secret?.value) {
        throw new Error('Failed to get session token');
      }

      const ephemeralKey = response.data.client_secret.value;
      
      clientRef.current = new SafetyRealtimeClient({
        audioEl: audioRef.current!,
        onMessage: handleMessage,
        onLevel: () => {}, // We can add level monitoring later if needed
      });

      await clientRef.current.connect(ephemeralKey);
      setIsConnected(true);
      setState('introduction');
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setState('disconnected');
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  const handleMessage = useCallback((message: any) => {
    console.log('Safety voice message:', message.type, message);

    switch (message.type) {
      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        clientRef.current?.createResponse();
        break;

      case 'response.audio_transcript.delta':
        if (showCaptions && message.delta) {
          setCurrentCaption(prev => prev + message.delta);
        }
        break;

      case 'response.audio_transcript.done':
        if (showCaptions) {
          setTimeout(() => setCurrentCaption(''), 3000);
        }
        break;

      case 'response.done':
        console.log('Response complete');
        break;

      case 'conversation.item.created':
        if (message.item?.content?.[0]?.text) {
          const text = message.item.content[0].text;
          // Update progress based on conversation flow
          if (text.includes('Date and time')) setProgressStep(1);
          else if (text.includes('Location')) setProgressStep(2);
          else if (text.includes('Weather')) setProgressStep(3);
          // ... more progress tracking
        }
        break;

      case 'response.function_call_arguments.done':
        if (message.name === 'generate_safety_report') {
          handleReportGeneration(message.arguments);
        }
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [showCaptions]);

  const handleReportGeneration = useCallback((args: string) => {
    try {
      const reportArgs = JSON.parse(args);
      console.log('Generating safety report:', reportArgs);
      
      // Update report data
      setReportData(reportArgs);
      
      // Generate Excel file (this would be implemented in the client)
      // For now, we'll just mark as complete
      setState('complete');
      setProgressStep(totalSteps);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report');
    }
  }, [totalSteps]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setState('disconnected');
    setCurrentCaption('');
    setProgressStep(0);
    setReportData({});
    setReportUrl(null);
  }, []);

  const toggleCaptions = useCallback(() => {
    setShowCaptions(prev => !prev);
  }, []);

  const pttDown = useCallback(async () => {
    if (!isConnected) {
      await connectOnce();
      return;
    }

    if (clientRef.current) {
      clientRef.current.startTurn();
    }
  }, [isConnected, connectOnce]);

  const pttUp = useCallback(() => {
    // With server VAD, we don't need to manually end turns
    if (clientRef.current) {
      clientRef.current.endTurn();
    }
  }, []);

  const interrupt = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.interrupt();
    }
  }, []);

  return {
    state,
    isConnected,
    isConnecting,
    error,
    showCaptions,
    currentCaption,
    progressStep,
    totalSteps,
    reportData,
    reportUrl,
    connectOnce,
    disconnect,
    toggleCaptions,
    pttDown,
    pttUp,
    interrupt,
  };
}