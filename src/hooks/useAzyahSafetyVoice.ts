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

interface SafetyChecklist {
  situation: string;
  checklist: string[];
  priority: string;
  location?: string;
  hazards?: string[];
  completedItems?: boolean[];
}

type SafetyVoiceState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'introduction'
  | 'decision'
  | 'checklist_mode'
  | 'checklist_interaction'
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
  const [checklistData, setChecklistData] = useState<SafetyChecklist | null>(null);
  const [checklistUrl, setChecklistUrl] = useState<string | null>(null);
  const [currentChecklistItem, setCurrentChecklistItem] = useState(0);

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
        } else if (message.name === 'generate_safety_checklist') {
          handleChecklistGeneration(message.arguments);
        } else if (message.name === 'checklist_action') {
          handleChecklistAction(message.arguments);
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
      
      // Generate downloadable report
      generateReportFile(reportArgs);
      
      setState('complete');
      setProgressStep(totalSteps);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report');
    }
  }, [totalSteps]);

  const handleChecklistGeneration = useCallback((args: string) => {
    try {
      const checklistArgs = JSON.parse(args);
      console.log('Generating safety checklist:', checklistArgs);
      
      const checklist: SafetyChecklist = {
        ...checklistArgs,
        completedItems: new Array(checklistArgs.checklist?.length || 0).fill(false)
      };
      
      setChecklistData(checklist);
      setState('checklist_interaction');
      setCurrentChecklistItem(0);
      
      // Generate downloadable checklist file
      generateChecklistFile(checklist);
      
    } catch (error) {
      console.error('Error generating checklist:', error);
      setError('Failed to generate checklist');
    }
  }, []);

  const generateChecklistFile = useCallback((checklist: SafetyChecklist) => {
    // Create a formatted checklist content
    const checklistContent = `
SAFETY CHECKLIST
Generated: ${new Date().toLocaleString()}

==========================================

SITUATION: ${checklist.situation}
LOCATION: ${checklist.location || 'Not specified'}
PRIORITY LEVEL: ${checklist.priority}

IDENTIFIED HAZARDS:
${checklist.hazards?.map(hazard => `• ${hazard}`).join('\n') || 'No specific hazards identified'}

SAFETY CHECKLIST (${checklist.checklist.length} items):
${checklist.checklist.map((item, index) => `${index + 1}. [ ] ${item}`).join('\n')}

==========================================

INSTRUCTIONS:
- Complete each item before proceeding to the next
- Check off items as they are completed
- Do not skip any safety checks
- Report any issues or concerns immediately
- Keep this checklist for your records

COMPLETION STATUS:
Date Completed: _______________
Completed By: _________________
Supervisor Review: ____________

==========================================
End of Checklist
    `.trim();

    // Create blob and download URL
    const blob = new Blob([checklistContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    setChecklistUrl(url);
  }, []);

  const generateReportFile = useCallback((data: SafetyReport) => {
    // Create a formatted report content
    const reportContent = `
SAFETY INCIDENT REPORT
Generated: ${new Date().toLocaleString()}

==========================================

Date & Time: ${data.dateTime || 'Not specified'}
Location: ${data.location || 'Not specified'}
Weather Conditions: ${data.weather || 'Not specified'}
Activity: ${data.activity || 'Not specified'}
Equipment Involved: ${data.equipment || 'Not specified'}

INJURY DETAILS:
Injured Person: ${data.injuredPerson || 'Not specified'}
Injury Description: ${data.injuryDetails || 'Not specified'}

OTHER PEOPLE INVOLVED:
${data.otherInvolved || 'Not specified'}

WITNESSES:
${data.witnesses || 'Not specified'}

PROPERTY DAMAGE:
${data.damage || 'Not specified'}

PHOTOS/EVIDENCE:
${data.photos || 'Not specified'}

IMMEDIATE ACTIONS TAKEN:
${data.immediateActions || 'Not specified'}

PREVENTION MEASURES:
${data.prevention || 'Not specified'}

REPORTED BY:
${data.reporter || 'Not specified'}

==========================================
End of Report
    `.trim();

    // Create blob and download URL
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    setReportUrl(url);
  }, []);

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
    setChecklistData(null);
    setChecklistUrl(null);
    setCurrentChecklistItem(0);
  }, []);

  const markChecklistItemComplete = useCallback((index: number) => {
    if (!checklistData) return;
    
    const updatedItems = [...(checklistData.completedItems || [])];
    updatedItems[index] = true;
    
    setChecklistData({
      ...checklistData,
      completedItems: updatedItems
    });
    
    // Move to next item if available
    if (index < checklistData.checklist.length - 1) {
      setCurrentChecklistItem(index + 1);
    }
  }, [checklistData]);

  const resetChecklist = useCallback(() => {
    if (!checklistData) return;
    
    setChecklistData({
      ...checklistData,
      completedItems: new Array(checklistData.checklist.length).fill(false)
    });
    setCurrentChecklistItem(0);
  }, [checklistData]);

  const handleChecklistAction = useCallback((args: string) => {
    try {
      const actionArgs = JSON.parse(args);
      console.log('Handling checklist action:', actionArgs);
      
      const { action, checklist } = actionArgs;
      
      switch (action) {
        case 'complete':
          if (checklistData) {
            markChecklistItemComplete(currentChecklistItem);
          }
          break;
          
        case 'next':
          if (checklistData && currentChecklistItem < checklistData.checklist.length - 1) {
            setCurrentChecklistItem(currentChecklistItem + 1);
          }
          break;
          
        case 'reset':
          resetChecklist();
          break;
          
        case 'update':
          if (checklist) {
            const newChecklist: SafetyChecklist = {
              ...checklist,
              completedItems: new Array(checklist.checklist?.length || 0).fill(false)
            };
            setChecklistData(newChecklist);
            setCurrentChecklistItem(0);
          }
          break;
      }
      
    } catch (error) {
      console.error('Error handling checklist action:', error);
      setError('Failed to handle checklist action');
    }
  }, [checklistData, currentChecklistItem, markChecklistItemComplete, resetChecklist]);

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
    checklistData,
    checklistUrl,
    currentChecklistItem,
    connectOnce,
    disconnect,
    toggleCaptions,
    pttDown,
    pttUp,
    interrupt,
    markChecklistItemComplete,
    resetChecklist,
  };
}