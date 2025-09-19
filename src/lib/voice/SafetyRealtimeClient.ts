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
                description: 'Generate a comprehensive safety checklist with 10-15 detailed items based on the user\'s situation or activity. Make it thorough and downloadable.',
                parameters: {
                  type: 'object',
                  properties: {
                    situation: { type: 'string', description: 'Current situation or activity' },
                    checklist: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: '10-15 detailed safety check items, each specific and actionable'
                    },
                    priority: { type: 'string', description: 'Overall priority level (High, Medium, Low)' },
                    location: { type: 'string', description: 'Work location or environment type' },
                    hazards: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Potential hazards identified for this situation'
                    }
                  },
                  required: ['situation', 'checklist', 'priority']
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
    
    // Generate comprehensive safety checklists with 10-15 items based on situation
    const checklists = {
      'working at height': [
        'Inspect all fall protection equipment (harness, lanyard, connectors)',
        'Check ladder condition and proper placement (4:1 ratio)',
        'Verify weather conditions are suitable (no high winds, rain, or ice)',
        'Ensure proper non-slip footwear is worn',
        'Confirm fall protection systems are anchored to certified points',
        'Test communication equipment and establish contact protocols',
        'Review emergency rescue procedures with team',
        'Secure all tools and materials to prevent dropping',
        'Establish controlled access zone below work area',
        'Check guardrails and safety barriers are in place',
        'Verify personal fall arrest system is properly fitted',
        'Inspect work platform stability and load capacity',
        'Ensure adequate lighting for safe work conditions',
        'Confirm emergency evacuation routes are clear',
        'Document safety briefing attendance and understanding'
      ],
      'machinery operation': [
        'Verify equipment maintenance records are current',
        'Test all emergency stop functions and switches',
        'Inspect and wear all required PPE (gloves, eye protection, hearing protection)',
        'Confirm all safety guards and barriers are securely in place',
        'Test communication systems between operators and spotters',
        'Check hydraulic fluid levels and inspect for leaks',
        'Verify lockout/tagout procedures for maintenance activities',
        'Inspect electrical connections and grounding systems',
        'Review operating procedures and safety protocols',
        'Check workspace for adequate lighting and ventilation',
        'Ensure proper lifting techniques and weight limits are observed',
        'Verify fire suppression systems are operational',
        'Test warning devices and alarms functionality',
        'Confirm operator certification and training currency',
        'Establish clear communication signals with ground personnel'
      ],
      'chemical handling': [
        'Review Safety Data Sheets (SDS) for all chemicals in use',
        'Verify adequate ventilation systems are operational',
        'Inspect and wear appropriate chemical-resistant PPE',
        'Check spill containment materials are readily available',
        'Confirm emergency shower and eyewash stations are accessible',
        'Test chemical detection and monitoring equipment',
        'Verify proper chemical storage and segregation protocols',
        'Check waste disposal containers and labeling requirements',
        'Review emergency response procedures for chemical exposure',
        'Ensure proper handling tools and equipment are available',
        'Verify fire suppression systems compatibility with chemicals',
        'Check respiratory protection equipment and fit testing',
        'Confirm proper chemical inventory and tracking systems',
        'Test emergency communication and alarm systems',
        'Establish decontamination procedures and equipment readiness'
      ],
      'electrical work': [
        'Verify electrical isolation and lockout/tagout procedures',
        'Test circuits with appropriate voltage detection equipment',
        'Inspect insulated tools and protective equipment',
        'Check electrical PPE certification and condition',
        'Verify grounding and bonding systems are intact',
        'Review electrical safety work practices and procedures',
        'Test ground fault circuit interrupters (GFCI)',
        'Inspect work area for wet conditions and moisture',
        'Confirm proper arc flash protection is worn',
        'Verify electrical permits and authorization to work',
        'Check emergency shut-off locations and accessibility',
        'Test emergency lighting and backup power systems',
        'Inspect electrical panels and enclosure integrity',
        'Verify proper cable management and routing',
        'Establish clear boundaries for electrical work zones'
      ],
      'confined space': [
        'Test atmospheric conditions (oxygen, toxic gases, combustible gases)',
        'Verify continuous atmospheric monitoring equipment',
        'Ensure proper ventilation systems are operational',
        'Check emergency retrieval systems and equipment',
        'Verify entrant, attendant, and supervisor roles are assigned',
        'Test communication systems between inside and outside personnel',
        'Inspect and fit personal protective equipment properly',
        'Confirm rescue procedures and emergency contacts',
        'Verify entry permits are properly completed and authorized',
        'Check lighting systems and backup illumination',
        'Test emergency escape breathing apparatus (SCSR)',
        'Verify lockout/tagout of energy sources to space',
        'Confirm medical surveillance and fitness for entry',
        'Establish clear entry and exit procedures',
        'Verify emergency response team availability and readiness'
      ],
      'hot work': [
        'Obtain and review hot work permits and authorizations',
        'Inspect fire extinguishing equipment and accessibility',
        'Remove or protect combustible materials in work area',
        'Verify fire watch personnel assignments and training',
        'Test welding equipment and gas systems for leaks',
        'Check ventilation systems for fume removal',
        'Inspect personal protective equipment for heat resistance',
        'Verify proper grounding of welding equipment',
        'Review emergency response procedures for fire incidents',
        'Check spark and spatter containment measures',
        'Verify proper storage of compressed gas cylinders',
        'Test emergency shutdown procedures and equipment',
        'Confirm medical support availability for burn treatment',
        'Inspect work area for hidden combustible materials',
        'Establish continuous fire watch for specified duration post-work'
      ]
    };

    const key = Object.keys(checklists).find(k => 
      situation.toLowerCase().includes(k)
    ) || 'general';

    const selectedChecklist = checklists[key] || [
      'Conduct comprehensive hazard assessment of work environment',
      'Verify all required personal protective equipment is available and worn',
      'Check emergency communication devices and contact procedures',
      'Inspect work tools and equipment for safe operating condition',
      'Establish clear emergency evacuation routes and assembly points',
      'Verify first aid supplies and trained personnel availability',
      'Review applicable safety procedures and work instructions',
      'Check environmental conditions (weather, lighting, noise levels)',
      'Confirm proper training and competency for assigned tasks',
      'Verify adequate supervision and safety oversight is in place',
      'Check material handling and storage safety requirements',
      'Test emergency alarm systems and notification procedures',
      'Inspect housekeeping and ensure clear walkways and exits',
      'Verify incident reporting procedures and contact information',
      'Establish safety monitoring and periodic check-in protocols'
    ];

    return {
      situation,
      checklist: selectedChecklist,
      priority: this.determinePriority(situation),
      location: 'Workplace',
      hazards: this.identifyHazards(situation)
    };
  }

  private determinePriority(situation: string): string {
    const highRisk = ['height', 'chemical', 'electrical', 'confined space', 'hot work', 'machinery'];
    const mediumRisk = ['lifting', 'driving', 'construction', 'maintenance'];
    
    const situationLower = situation.toLowerCase();
    
    if (highRisk.some(risk => situationLower.includes(risk))) {
      return 'High';
    } else if (mediumRisk.some(risk => situationLower.includes(risk))) {
      return 'Medium';
    }
    return 'Low';
  }

  private identifyHazards(situation: string): string[] {
    const hazardMap = {
      'height': ['Falls', 'Falling objects', 'Weather exposure'],
      'chemical': ['Chemical exposure', 'Inhalation hazards', 'Skin contact', 'Fire/explosion'],
      'electrical': ['Electrical shock', 'Arc flash', 'Burns', 'Fire'],
      'machinery': ['Caught in/between', 'Struck by', 'Noise exposure', 'Vibration'],
      'confined space': ['Atmospheric hazards', 'Engulfment', 'Entrapment'],
      'hot work': ['Fire', 'Burns', 'Fume exposure', 'Explosion']
    };

    const situationLower = situation.toLowerCase();
    for (const [key, hazards] of Object.entries(hazardMap)) {
      if (situationLower.includes(key)) {
        return hazards;
      }
    }
    
    return ['Physical injury', 'Environmental hazards', 'Equipment failure'];
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