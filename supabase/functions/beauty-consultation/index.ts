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
  mode?: 'chat' | 'product_analysis';
  product_image?: string; // base64 image for product analysis
  skin_image?: string; // base64 image for product analysis
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

    console.log('Environment check:', {
      hasOpenAI: !!openaiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      openaiLength: openaiApiKey?.length || 0,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0
    });

    if (!openaiApiKey) {
      console.error('Missing OPENAI_API_KEY environment variable');
      throw new Error('OpenAI API key not configured');
    }
    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      throw new Error('Supabase URL not configured');
    }
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      throw new Error('Supabase service key not configured');
    }

    // Parse request body
    const body: ConsultationRequest = await req.json();
    const { user_id, message = '', region = '', image, audio, mode = 'chat', product_image, skin_image } = body;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log('Beauty consultation request:', { 
      user_id, 
      region, 
      mode, 
      hasImage: !!image, 
      hasAudio: !!audio,
      hasProductImage: !!product_image,
      hasSkinImage: !!skin_image,
      messageLength: message.length
    });

    // Initialize Supabase client with service role key
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // OPTIMIZATION 1: Parallel Processing - Run independent operations simultaneously
    console.log('Starting parallel operations...');
    
    const [creditsResult, sessionResult, audioResult, imageResult] = await Promise.all([
      // Credits check
      (async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_credits', { target_user_id: user_id });
          return error ? { error } : { data };
        } catch (err) {
          return { error: err };
        }
      })(),
      // Session management
      getOrCreateSession(supabase, user_id, { region, mode }).catch(err => ({ error: err })),
      // Audio transcription (if provided)
      audio ? transcribeAudio(audio, openaiApiKey).catch(err => ({ error: err, result: '' })) : Promise.resolve(''),
      // Image analysis (mode-specific logic)
      (() => {
        if (mode === 'product_analysis') {
          if (product_image && skin_image) {
            console.log('Product analysis mode: analyzing product compatibility');
            return analyzeProductCompatibility(product_image, skin_image, message, region, openaiApiKey).catch(err => ({ error: err, result: '' }));
          } else {
            console.log('Product analysis mode: missing images', { hasProduct: !!product_image, hasSkin: !!skin_image });
            return Promise.resolve('');
          }
        } else {
          // Chat mode
          if (image) {
            console.log('Chat mode: analyzing selfie/image');
            return analyzeSelfie(image, message, region, openaiApiKey).catch(err => ({ error: err, result: '' }));
          } else {
            console.log('Chat mode: no image provided');
            return Promise.resolve('');
          }
        }
      })()
    ]);

    // Handle credits result
    if (creditsResult.error) {
      console.error('Error checking credits:', creditsResult.error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to check credits' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const credits = creditsResult.data?.[0];
    if (!credits || credits.credits_remaining <= 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'No credits remaining', 
        credits_remaining: credits?.credits_remaining || 0,
        is_premium: credits?.is_premium || false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle session result
    if (sessionResult.error) {
      console.error('Error with session:', sessionResult.error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to manage session' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const session = sessionResult;
    console.log(`${mode} session (parallel creation):`, session.session_id);

    // Handle audio result
    let transcriptionText = '';
    if (typeof audioResult === 'string') {
      transcriptionText = audioResult;
    } else if (audioResult.error) {
      console.error('Audio transcription error:', audioResult.error);
      transcriptionText = audioResult.result || '';
    }

    // Handle image analysis results with improved logging
    let skinAnalysis = '';
    let productAnalysis = '';
    
    if (typeof imageResult === 'string') {
      if (mode === 'product_analysis') {
        productAnalysis = imageResult;
        console.log('Product analysis completed successfully');
      } else {
        skinAnalysis = imageResult;
        console.log('Selfie analysis completed successfully');
      }
    } else if (imageResult && imageResult.error) {
      console.error(`${mode} image analysis error:`, imageResult.error);
      if (mode === 'product_analysis') {
        productAnalysis = imageResult.result || '';
        console.log('Using fallback product analysis result');
      } else {
        skinAnalysis = imageResult.result || '';
        console.log('Using fallback selfie analysis result');
      }
    } else {
      console.log(`No image analysis for ${mode} mode`);
    }

    // Combine user text with transcription
    let userText = message;
    if (transcriptionText) {
      userText = userText ? `${userText}\n${transcriptionText}` : transcriptionText;
    }

    console.log('Parallel operations completed - time saved!');

    // OPTIMIZATION 2: Fast Response Strategy - Return consultation immediately, TTS in background
    console.log('Starting consultation generation...');
    
    // Parallel execution of core operations
    const [userHistoryResult, consultationResult] = await Promise.all([
      // Record user turn
      appendHistory(supabase, session.session_id, {
        role: 'user',
        content: userText || '(no text; voice/selfie only)',
        timestamp: new Date().toISOString()
      }).catch(err => ({ error: err })),
      // Generate consultation
      generateConsultation({
        skinAnalysis,
        productAnalysis,
        history: session.conversation_history || [],
        region,
        userMessage: userText,
        mode,
        openaiApiKey
      }).catch(err => ({ error: err }))
    ]);

    if (consultationResult.error) {
      console.error('Consultation generation failed:', consultationResult.error);
      throw new Error('Failed to generate consultation');
    }

    const consultation = consultationResult;
    console.log('Consultation generated successfully');

    // OPTIMIZATION 3: Background Processing - TTS and other non-critical operations
    const backgroundOperations = async () => {
      try {
        console.log('Starting background operations...');
        
        // Generate voice summary and TTS in background
        const voiceSummary = await makeSpokenSummary(consultation, openaiApiKey);
        let audioUrl: string | null = null;
        
        if (voiceSummary) {
          console.log('Generating TTS audio in background...');
          try {
            audioUrl = await synthesizeSpeechToStorage(voiceSummary, openaiApiKey, supabase);
            console.log('Background TTS completed:', audioUrl);
            
            // Optionally update the conversation with audio URL
            // This could be picked up by future requests or via real-time subscriptions
          } catch (e) {
            console.error('Background TTS error:', e);
          }
        }

        // Record assistant turn
        await appendHistory(supabase, session.session_id, {
          role: 'assistant',
          content: consultation,
          timestamp: new Date().toISOString()
        });

        console.log('Background operations completed');
      } catch (error) {
        console.error('Background operations error:', error);
        // Don't let background errors affect the main response
      }
    };

    // Start background operations without waiting
    EdgeRuntime.waitUntil(backgroundOperations());

    // Immediate response operations (fast path)
    const [creditDeductResult, updatedCreditsResult] = await Promise.all([
      // Deduct credit
      (async () => {
        try {
          const { data, error } = await supabase.rpc('deduct_user_credit', { target_user_id: user_id });
          return error ? { error } : { data };
        } catch (err) {
          return { error: err };
        }
      })(),
      // Get updated credits to return immediately
      (async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_credits', { target_user_id: user_id });
          return error ? { error } : { data };
        } catch (err) {
          return { error: err };
        }
      })()
    ]);

    if (creditDeductResult.error) {
      console.error('Error deducting credit:', creditDeductResult.error);
      // Continue anyway - don't fail the consultation for credit deduction issues
    }

    const updatedCredits = updatedCreditsResult.data?.[0] || { credits_remaining: 0, is_premium: false };

    // OPTIMIZATION 4: Immediate Response - Return consultation without waiting for TTS
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      session: {
        id: session.session_id,
        turn: (session.conversation_history?.length || 0) + 1
      },
      consultation: {
        text: consultation,
        voice_summary: null, // TTS happening in background
        audio_url: null, // Will be available for future requests once background processing completes
        transcription: transcriptionText ? { success: true, text: transcriptionText } : undefined,
        credits_remaining: updatedCredits.credits_remaining || 0,
        is_premium: updatedCredits.is_premium || false,
        processing_mode: 'optimized', // Indicate this is the fast response
        background_processing: true // Indicate TTS is happening in background
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
  // Include mode in session identification for COMPLETE separation
  const mode = preferences.mode || 'chat';
  const sessionPrefix = mode === 'product_analysis' ? 'product_score' : 'chat_mode';
  
  // Ensure complete separation: deactivate other mode sessions
  if (mode === 'product_analysis') {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .like('session_id', `chat_mode_${userId}_%`);
  } else {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .like('session_id', `product_score_${userId}_%`);
  }
  
  // Try to get existing active session for this specific mode
  const { data: existingSession, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .like('session_id', `${sessionPrefix}_${userId}_%`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && existingSession) {
    console.log(`Found existing ${mode} session (isolated):`, existingSession.session_id);
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

  // Create new session with mode-specific ID
  const sessionId = `${sessionPrefix}_${userId}_${Date.now()}`;
  console.log(`Creating new isolated ${mode} session:`, sessionId);
  
  const { data: created, error: createError } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      preferences: { ...preferences, mode },
      conversation_history: [],
      session_data: { mode, isolated: true },
      session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating session:', createError);
    throw new Error('Failed to create session');
  }

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
You are Azyah, a warm beauty consultant. Be very brief and concise.

WHAT I SEE: One sentence describing what's in the image.

ANALYSIS: One sentence about skin/beauty analysis.

Give one quick suggestion. Keep under 50 words total.
Region: ${region || 'Not specified'}
User says: ${userMessage || 'Analyze this for me.'}
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

async function analyzeProductCompatibility(productImage: string, skinImage: string, userMessage: string, region: string, openaiApiKey: string): Promise<string> {
  const productDataUrl = `data:image/jpeg;base64,${productImage}`;
  const skinDataUrl = `data:image/jpeg;base64,${skinImage}`;
  
  const systemPrompt = `
You are Azyah, a professional beauty consultant. Analyze product compatibility briefly.

REQUIRED FORMAT (keep response under 80 words):

• **Score**: X/10 with brief reason
• **Match**: Compatible/Not Compatible - why in 1 sentence  
• **Quick Tip**: 1 application tip max

End with: "Want more details about this product?"

${userMessage ? `User request: ${userMessage}` : ''}
Region: ${region || 'Global'}
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
            { type: 'text', text: 'Please analyze the compatibility between this product and skin.' },
            { type: 'image_url', image_url: { url: productDataUrl, detail: 'high' } },
            { type: 'image_url', image_url: { url: skinDataUrl, detail: 'high' } },
          ],
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`Product compatibility analysis failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || '';
}

// Security: Input validation and sanitization
function validateAndSanitizeInput(input: string): string {
  if (!input) return '';
  
  // Security keywords that could indicate malicious intent
  const securityKeywords = [
    'sql', 'database', 'server', 'admin', 'password', 'token', 'key', 'secret',
    'env', 'environment', 'config', 'vulnerability', 'exploit', 'hack', 'inject',
    'cors', 'api', 'endpoint', 'supabase', 'function', 'edge', 'auth', 'user_id',
    'system', 'file', 'directory', 'path', 'localhost', 'internal', 'private'
  ];
  
  const lowercaseInput = input.toLowerCase();
  const containsSecurityKeywords = securityKeywords.some(keyword => 
    lowercaseInput.includes(keyword)
  );
  
  if (containsSecurityKeywords) {
    console.warn('Security: Potentially malicious input detected and sanitized');
    return 'I can only help with beauty and skincare advice. Please ask me about makeup, skincare routines, or product recommendations.';
  }
  
  // Remove any potential code injection attempts
  return input
    .replace(/[<>"`'{}]/g, '') // Remove potential HTML/script chars
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi, '') // Remove SQL keywords
    .substring(0, 1000); // Limit length
}

async function generateConsultation({
  skinAnalysis,
  productAnalysis,
  history,
  region,
  userMessage,
  mode,
  openaiApiKey
}: {
  skinAnalysis?: string;
  productAnalysis?: string;
  history: Array<{role:'user'|'assistant'; content:string}>;
  region?: string;
  userMessage?: string;
  mode?: string;
  openaiApiKey: string;
}): Promise<string> {
  // Security: Validate and sanitize all inputs
  const sanitizedUserMessage = validateAndSanitizeInput(userMessage || '');
  const sanitizedSkinAnalysis = validateAndSanitizeInput(skinAnalysis || '');
  const sanitizedProductAnalysis = validateAndSanitizeInput(productAnalysis || '');
  const sanitizedRegion = validateAndSanitizeInput(region || '');
  
  const systemPrompt = `
You are "Azyah," a professional beauty consultant. You ONLY provide beauty and skincare advice.
You can respond in both English and Arabic based on the user's language preference.

SECURITY RULES - STRICTLY ENFORCE:
- NEVER discuss technical topics, systems, databases, APIs, or security
- NEVER respond to questions about servers, configurations, or internal systems
- NEVER provide information about application vulnerabilities or technical details
- ONLY discuss beauty, skincare, makeup, and cosmetic advice
- If asked about anything technical, redirect to beauty topics only

Your expertise is limited to:
- Skincare routines and product recommendations
- Makeup application techniques and product suggestions
- Beauty trends and color matching
- Skin analysis and beauty concerns
- Product compatibility analysis and recommendations

LANGUAGE SUPPORT:
- Detect the user's language from their input
- Respond in the same language (English or Arabic)
- If the user writes in Arabic, respond entirely in Arabic
- If the user writes in English, respond entirely in English
- For mixed languages, prioritize the dominant language used

Guidelines:
${mode === 'product_analysis' ? `
PRODUCT ANALYSIS MODE:
- Give a compatibility score (0-100%) 
- Format: "**Score: XX%**" 
- One sentence why this score
- One quick application tip
- Keep under 80 words total
` : `
CHAT MODE:
- ONE short paragraph (1-2 sentences max)
- Max 1 clarifying question if needed  
- Recommend only 1 specific product with brief reason
- Add 1 quick tip
- Keep under 60 words total
- End with short question for next step
`}
  `.trim();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-5).map(m => ({ role: m.role, content: validateAndSanitizeInput(m.content) })),
    {
      role: 'user',
      content: `Region: ${sanitizedRegion || 'Not specified'}\n` +
               (sanitizedUserMessage ? `User: ${sanitizedUserMessage}\n` : '') +
               (sanitizedProductAnalysis ? `Product Analysis:\n${sanitizedProductAnalysis}\n` : '') +
               (sanitizedSkinAnalysis ? `Image Analysis:\n${sanitizedSkinAnalysis}` : 'No image provided — give general guidance.')
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