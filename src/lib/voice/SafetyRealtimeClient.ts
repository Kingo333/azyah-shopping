export class SafetyRealtimeClient {
  private pc!: RTCPeerConnection;
  private dc!: RTCDataChannel;
  private audioEl: HTMLAudioElement;
  private onMessage?: (msg: any) => void;
  private onLevel?: (level: number) => void;
  private isConnected = false;

  constructor(opts: {
    audioEl: HTMLAudioElement;
    onMessage?: (msg: any) => void;
    onLevel?: (level: number) => void;
  }) {
    this.audioEl = opts.audioEl;
    this.onMessage = opts.onMessage;
    this.onLevel = opts.onLevel;
  }

  async connect(ephemeralKey: string) {
    try {
      this.pc = new RTCPeerConnection();
      this.dc = this.pc.createDataChannel('oai-events');

      this.dc.onopen = () => {
        console.log('Safety DataChannel opened');
        this.isConnected = true;
        
        // Configure session for safety reporting
        this.dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.7,
              prefix_padding_ms: 500,
              silence_duration_ms: 1500
            },
            tools: [
              {
                type: 'function',
                name: 'generate_safety_report',
                description: 'Generate an Excel HSE incident report with all collected data.',
                parameters: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', description: 'Date and time of incident' },
                    location: { type: 'string', description: 'Location of incident' },
                    weather: { type: 'string', description: 'Weather conditions' },
                    activity: { type: 'string', description: 'Activity being performed' },
                    equipment: { type: 'string', description: 'Equipment involved' },
                    injuredPerson: { type: 'string', description: 'Injured person details' },
                    injuryDetails: { type: 'string', description: 'Injury type and treatment' },
                    otherInvolved: { type: 'string', description: 'Other people involved' },
                    witnesses: { type: 'string', description: 'Witness information' },
                    damage: { type: 'string', description: 'Property damage' },
                    photos: { type: 'string', description: 'Photo/video availability' },
                    immediateActions: { type: 'string', description: 'Immediate actions taken' },
                    prevention: { type: 'string', description: 'Prevention measures' },
                    reporter: { type: 'string', description: 'Reporter details' }
                  },
                  required: ['dateTime', 'location', 'activity']
                }
              },
              {
                type: 'function',
                name: 'generate_safety_checklist',
                description: 'Generate a safety checklist based on the situation or activity.',
                parameters: {
                  type: 'object',
                  properties: {
                    situation: { type: 'string', description: 'Current situation or activity' },
                    environment: { type: 'string', description: 'Work environment details' }
                  },
                  required: ['situation']
                }
              },
              {
                type: 'function',
                name: 'checklist_action',
                description: 'Handle user actions during checklist interaction: complete, next, reset, or update.',
                parameters: {
                  type: 'object',
                  properties: {
                    action: { 
                      type: 'string', 
                      enum: ['complete', 'next', 'reset', 'update'],
                      description: 'Action to perform on the checklist'
                    },
                    new_situation: { 
                      type: 'string', 
                      description: 'New situation description if updating checklist'
                    }
                  },
                  required: ['action']
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8
          }
        }));
      };

      this.dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Safety received message:', message.type);
          this.onMessage?.(message);

          // Handle tool calls
          if (message.type === 'response.function_call_arguments.done') {
            this.handleToolCall(message);
          }

          // Log important events for debugging
          if (message.type.includes('input_audio_buffer') || message.type.includes('response')) {
            console.log('Safety audio/response event:', message.type, message);
          }
        } catch (error) {
          console.error('Error parsing safety message:', error);
        }
      };

      this.dc.onerror = (error) => {
        console.error('Safety DataChannel error:', error);
      };

      // Handle incoming audio
      this.pc.ontrack = (event) => {
        console.log('Safety received audio track');
        this.audioEl.srcObject = event.streams[0];
      };

      // Set up microphone with level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });

      // Audio level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        this.onLevel?.(rms);
        requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Add audio track to peer connection
      stream.getAudioTracks().forEach(track => {
        this.pc.addTrack(track, stream);
      });

      // Create offer and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI Realtime API
      const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp!,
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to OpenAI: ${response.status}`);
      }

      const answerSdp = await response.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };

      await this.pc.setRemoteDescription(answer);
      console.log('Safety WebRTC connection established');

    } catch (error) {
      console.error('Error connecting to safety realtime API:', error);
      throw error;
    }
  }

  private async handleToolCall(message: any) {
    const { call_id, name, arguments: args } = message;
    console.log(`Handling safety tool call: ${name}`, args);

    let result = {};

    try {
      const parsedArgs = JSON.parse(args);

      switch (name) {
        case 'generate_safety_report':
          // Generate Excel report
          result = await this.generateExcelReport(parsedArgs);
          break;

        case 'generate_safety_checklist':
          result = this.generateSafetyChecklist(parsedArgs);
          break;

        case 'checklist_action':
          result = this.handleChecklistAction(parsedArgs);
          break;

        default:
          result = { error: 'Unknown safety tool function' };
      }
    } catch (error) {
      result = { error: 'Failed to parse safety arguments' };
    }

    // Send tool result back
    this.dc.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(result)
      }
    }));
  }

  private async generateExcelReport(data: any) {
    // This would generate an actual Excel file
    // For now, return success with download URL
    console.log('Generating Excel report with data:', data);
    
    return {
      success: true,
      reportId: `HSE-${Date.now()}`,
      downloadUrl: '#', // Would be actual download URL
      message: 'HSE Incident Report generated successfully'
    };
  }

  private generateSafetyChecklist(data: any) {
    const { situation } = data;
    
    // Generate relevant safety checklist based on situation
    const checklists = {
      'working at height': [
        'Check harness and safety equipment',
        'Inspect ladder stability',
        'Verify weather conditions',
        'Ensure proper footwear',
        'Check fall protection systems'
      ],
      'machinery operation': [
        'Verify equipment maintenance status',
        'Check emergency stop functions',
        'Ensure proper PPE is worn',
        'Confirm safety guards are in place',
        'Test communication systems'
      ],
      'chemical handling': [
        'Check SDS availability',
        'Verify ventilation systems',
        'Ensure proper PPE',
        'Check spill containment',
        'Confirm emergency procedures'
      ]
    };

    const key = Object.keys(checklists).find(k => 
      situation.toLowerCase().includes(k)
    ) || 'general';

    return {
      situation,
      checklist: checklists[key] || [
        'Assess the work environment',
        'Identify potential hazards',
        'Ensure proper PPE',
        'Check emergency procedures',
        'Verify communication methods'
      ],
      priority: 'high'
    };
  }

  private handleChecklistAction(data: any) {
    const { action, new_situation } = data;
    
    switch (action) {
      case 'complete':
        return {
          action: 'complete',
          message: 'Item marked as complete. Moving to next item.',
          success: true
        };
        
      case 'next':
        return {
          action: 'next',
          message: 'Moving to next item.',
          success: true
        };
        
      case 'reset':
        return {
          action: 'reset',
          message: 'Checklist reset. Starting from the beginning.',
          success: true
        };
        
      case 'update':
        if (new_situation) {
          const newChecklist = this.generateSafetyChecklist({ situation: new_situation });
          return {
            action: 'update',
            message: 'Generating updated checklist.',
            checklist: newChecklist,
            success: true
          };
        }
        return {
          action: 'update',
          message: 'Please describe the new situation.',
          success: false
        };
        
      default:
        return {
          action: 'unknown',
          message: 'Unknown action. Say complete, next, reset, or update checklist.',
          success: false
        };
    }
  }

  startTurn() {
    console.log('Safety AI ready to listen...');
  }

  endTurn() {
    console.log('Safety AI waiting for speech detection...');
  }

  createResponse() {
    if (this.isConnected) {
      console.log('Creating safety response...');
      this.dc.send(JSON.stringify({ type: 'response.create' }));
    }
  }

  interrupt() {
    if (this.isConnected) {
      this.dc.send(JSON.stringify({ type: 'response.cancel' }));
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      } catch (error) {
        console.log('Could not pause safety audio:', error);
      }
    }
  }

  disconnect() {
    this.isConnected = false;
    try {
      this.dc?.close();
      this.pc?.close();
    } catch (error) {
      console.log('Error during safety disconnect:', error);
    }
  }
}