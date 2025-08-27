import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsultationRequest {
  user_id: string;
  message?: string;
  region?: string;
  image?: string; // base64 image
  audio?: string; // base64 audio
}

interface SessionData {
  id: string;
  session_id: string;
  conversation_history: Array<{role: 'user' | 'assistant'; content: string; timestamp: string}>;
  preferences: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    const body: ConsultationRequest = await req.json();
    const { user_id, message = '', region = '', image, audio } = body;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log('Beauty consultation request:', { user_id, region, hasImage: !!image, hasAudio: !!audio });

    // Initialize Supabase client with service role key
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create user session
    const session = await getOrCreateSession(supabase, user_id, { region });
    console.log('Session:', session.session_id);

    let userText = message;
    let transcriptionText = '';

    // Handle audio transcription if provided
    if (audio) {
      console.log('Transcribing audio...');
      transcriptionText = await transcribeAudio(audio, openaiApiKey);
      if (transcriptionText) {
        userText = userText ? `${userText}\n${transcriptionText}` : transcriptionText;
      }
      console.log('Transcription result:', transcriptionText);
    }

    // Handle image analysis if provided
    let skinAnalysis = '';
    if (image) {
      console.log('Analyzing selfie...');
      skinAnalysis = await analyzeSelfie(image, userText, region, openaiApiKey);
      console.log('Skin analysis completed');
    }

    // Record user turn
    await appendHistory(supabase, session.session_id, {
      role: 'user',
      content: userText || '(no text; voice/selfie only)',
      timestamp: new Date().toISOString()
    });

    // Generate consultation
    console.log('Generating consultation...');
    const consultation = await generateConsultation({
      skinAnalysis,
      history: session.conversation_history || [],
      region,
      userMessage: userText,
      openaiApiKey
    });

    // Generate voice summary
    console.log('Creating voice summary...');
    const voiceSummary = await makeSpokenSummary(consultation, openaiApiKey);

    // Generate TTS audio and save to storage
    let audioUrl: string | null = null;
    if (voiceSummary) {
      console.log('Generating TTS audio...');
      try {
        audioUrl = await synthesizeSpeechToStorage(voiceSummary, openaiApiKey, supabase);
        console.log('Audio URL:', audioUrl);
      } catch (e) {
        console.error('TTS error:', e);
        audioUrl = null;
      }
    }

    // Record assistant turn
    await appendHistory(supabase, session.session_id, {
      role: 'assistant',
      content: consultation,
      timestamp: new Date().toISOString()
    });

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      session: {
        id: session.session_id,
        turn: (session.conversation_history?.length || 0) + 1
      },
      consultation: {
        text: consultation,
        voice_summary: voiceSummary,
        audio_url: audioUrl,
        transcription: transcriptionText ? { success: true, text: transcriptionText } : undefined
      }
    };

    console.log('Consultation completed successfully');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Beauty consultation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Session management functions
async function getOrCreateSession(supabase: any, userId: string, preferences: Record<string, any> = {}): Promise<SessionData> {
  // Try to get existing active session
  const { data: existingSession, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!error && existingSession) {
    // Update last activity and extend expiration
    const { data: updated } = await supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', existingSession.id)
      .select()
      .single();
    return updated;
  }

  // Create new session
  const { data: created } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_id: `session_${userId}_${Date.now()}`,
      preferences,
      conversation_history: [],
      session_data: {},
    })
    .select()
    .single();

  return created;
}

async function appendHistory(supabase: any, sessionId: string, msg: {role: 'user'|'assistant'; content: string; timestamp: string}) {
  const { data: sess } = await supabase
    .from('user_sessions')
    .select('conversation_history')
    .eq('session_id', sessionId)
    .single();

  const hist = Array.isArray(sess?.conversation_history) ? sess.conversation_history : [];
  hist.push(msg);
  const trimmed = hist.slice(-10); // Keep last 10 turns

  await supabase
    .from('user_sessions')
    .update({
      conversation_history: trimmed,
      last_activity: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  return trimmed;
}

// AI functions
async function transcribeAudio(base64Audio: string, openaiApiKey: string): Promise<string> {
  // Convert base64 to blob
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create form data
  const formData = new FormData();
  const blob = new Blob([bytes], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.text?.trim() || '';
}

async function analyzeSelfie(base64Image: string, userMessage: string, region: string, openaiApiKey: string): Promise<string> {
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;
  const systemPrompt = `
You are Azyah, a warm professional beauty consultant. Analyze selfies for:
- Skin type (oily/dry/combination/normal/sensitive)
- Tone depth (very light → very deep) 
- Undertone (cool/warm/neutral)
- Visible concerns (acne, hyperpigmentation, fine lines)
- Lighting conditions + confidence.
Ask up to 2 clarifying questions if needed. Include a brief cosmetic advice disclaimer. Keep under 300 words.
Region context: ${region || 'Not specified'}
User says: ${userMessage || 'Analyze my skin.'}
  `.trim();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze my skin and share thoughts.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision analysis failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

async function generateConsultation({
  skinAnalysis,
  history,
  region,
  userMessage,
  openaiApiKey
}: {
  skinAnalysis?: string;
  history: Array<{role:'user'|'assistant'; content:string}>;
  region?: string;
  userMessage?: string;
  openaiApiKey: string;
}): Promise<string> {
  const systemPrompt = `
You are "Azyah," a pro makeup artist who speaks like a warm, supportive friend.
Rules:
- One short paragraph (2–4 sentences) per turn.
- Max 2 clarifying questions when needed.
- Recommend up to 1–2 items per category, with a one-line "why it matches".
- Categories: Primer; Foundation/Concealer; Brows/Eyeliner/Bronzer; Shadow Palette.
- No product images or URLs, only names/brands/shade families.
- Add 1–3 brief technique tips for complexion.
- Consider regional availability ("UAE", etc.) at a high level (retailer types), not links.
- Close with a single next step question.
  `.trim();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-5).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Region: ${region || 'Not specified'}\n` +
               (userMessage ? `User: ${userMessage}\n` : '') +
               `Skin Analysis:\n${skinAnalysis || 'No selfie provided — give general guidance.'}`
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_completion_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`Consultation failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

async function makeSpokenSummary(consultation: string, openaiApiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Write a 25–40 word, natural, friendly voice summary suitable for TTS.' },
        { role: 'user', content: consultation }
      ],
      temperature: 0.4,
      max_completion_tokens: 120,
    }),
  });

  if (!response.ok) {
    throw new Error(`Summary failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content?.trim() || '';
}

async function synthesizeSpeechToStorage(text: string, openaiApiKey: string, supabase: any): Promise<string> {
  // Generate speech
  const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      speed: 1.0
    }),
  });

  if (!speechResponse.ok) {
    throw new Error(`TTS failed: ${await speechResponse.text()}`);
  }

  const arrayBuffer = await speechResponse.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Upload to Supabase Storage
  const fileName = `azyah_${Date.now()}.mp3`;
  const filePath = `responses/${fileName}`;

  const { error } = await supabase.storage
    .from('azyah-audio')
    .upload(filePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data } = supabase.storage
    .from('azyah-audio')
    .getPublicUrl(filePath);

  return data.publicUrl;
}