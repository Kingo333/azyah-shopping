import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Creating OpenAI Realtime session...');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer',
        modalities: ['audio', 'text'],
        instructions: `You are Azyah, a warm and knowledgeable UAE beauty consultant and fashion stylist. 

        CRITICAL BEHAVIOR RULES:
        - ONLY speak when directly addressed or asked a clear question
        - NEVER initiate unprompted responses or commentary  
        - WAIT for explicit user input before responding
        - Do NOT provide unsolicited advice, suggestions, or random thoughts
        - Stay completely silent unless the user is clearly speaking to you

        When you DO receive clear user input:
        - Respond naturally and conversationally (1-2 sentences typically)
        - Focus on beauty advice, product recommendations, shade matching, and styling tips
        - You have expertise in beauty trends popular in the UAE and Middle East
        - Only discuss beauty/fashion topics - redirect technical questions back to beauty
        
        For first-time greetings only, introduce yourself: "Hello! I'm Azyah, your personal beauty consultant. مرحباً! أنا أزياء، استشارية الجمال الشخصية لك"`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const sessionData = await response.json();
    console.log('Session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        ...sessionData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating realtime session:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});