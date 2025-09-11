export class RealtimeClient {
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
        console.log('DataChannel opened');
        this.isConnected = true;
        
        // Configure session
        this.dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: `You are Azyah, a friendly UAE-based beauty consultant. 

LANGUAGE RULES:
- If the user speaks in Arabic, respond ONLY in Arabic
- If the user speaks in English, respond ONLY in English  
- Never mix languages in a single response
- For greetings: Say "مرحبا! أنا أزياء، مستشارة الجمال" if they say مرحبا or speak Arabic
- For greetings: Say "Hello! I'm Azyah, your beauty consultant" if they say hello or speak English

You specialize in Middle Eastern beauty, skincare, and makeup. Provide personalized advice for the UAE climate and cultural preferences. Keep responses conversational and helpful.`,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'shade_match',
                description: 'Find the best foundation shade for a user based on their skin tone and undertone.',
                parameters: {
                  type: 'object',
                  properties: {
                    brand: { type: 'string', description: 'Foundation brand name' },
                    undertone: { type: 'string', enum: ['warm', 'cool', 'neutral'], description: 'Skin undertone' },
                    depth: { type: 'string', description: 'Skin depth/lightness level' }
                  },
                  required: ['brand', 'undertone']
                }
              },
              {
                type: 'function',
                name: 'product_recommend',
                description: 'Recommend beauty products based on user preferences and needs.',
                parameters: {
                  type: 'object',
                  properties: {
                    category: { type: 'string', description: 'Product category (lipstick, eyeshadow, etc.)' },
                    occasion: { type: 'string', description: 'Occasion or use case' },
                    budget: { type: 'string', description: 'Budget range' }
                  },
                  required: ['category']
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
          console.log('Received message:', message.type);
          this.onMessage?.(message);

          // Handle tool calls
          if (message.type === 'response.function_call_arguments.done') {
            this.handleToolCall(message);
          }

          // Log important events for debugging
          if (message.type.includes('input_audio_buffer') || message.type.includes('response')) {
            console.log('Audio/Response event:', message.type, message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.dc.onerror = (error) => {
        console.error('DataChannel error:', error);
      };

      // Handle incoming audio
      this.pc.ontrack = (event) => {
        console.log('Received audio track');
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
      console.log('WebRTC connection established');

    } catch (error) {
      console.error('Error connecting to realtime API:', error);
      throw error;
    }
  }

  private async handleToolCall(message: any) {
    const { call_id, name, arguments: args } = message;
    console.log(`Handling tool call: ${name}`, args);

    let result = {};

    try {
      const parsedArgs = JSON.parse(args);

      switch (name) {
        case 'shade_match':
          result = {
            recommended_shade: '3N1 Ivory Beige',
            confidence: 'high',
            alternative_shades: ['2N1 Light Ivory', '4N1 Shell Beige'],
            brand_available: true
          };
          break;

        case 'product_recommend':
          result = {
            products: [
              {
                name: 'Fenty Beauty Gloss Bomb',
                category: parsedArgs.category,
                price: '65 AED',
                availability: 'in-stock'
              }
            ],
            total_recommendations: 1
          };
          break;

        default:
          result = { error: 'Unknown tool function' };
      }
    } catch (error) {
      result = { error: 'Failed to parse arguments' };
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

  startTurn() {
    // With server VAD, we don't manually control audio buffers
    // Just indicate we're ready to listen
    console.log('Ready to listen...');
  }

  endTurn() {
    // With server VAD, the server detects when speech stops
    // We'll create a response when we get the speech_stopped event
    console.log('Waiting for speech detection...');
  }

  createResponse() {
    // Only create response when speech is actually detected
    if (this.isConnected) {
      console.log('Creating response...');
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
        console.log('Could not pause audio:', error);
      }
    }
  }

  disconnect() {
    this.isConnected = false;
    try {
      this.dc?.close();
      this.pc?.close();
    } catch (error) {
      console.log('Error during disconnect:', error);
    }
  }
}