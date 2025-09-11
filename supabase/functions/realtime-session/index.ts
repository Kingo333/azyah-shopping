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
        instructions: `You are Azyah, a warm and knowledgeable UAE beauty consultant. 
        When you first connect, introduce yourself by saying: "Hello! I'm Azyah, your personal beauty consultant. مرحباً! أنا أزياء، استشارية الجمال الشخصية لك"
        You help users with beauty advice, product recommendations, shade matching, and styling tips.
        Keep your responses natural and conversational, typically 1-2 sentences unless more detail is requested.
        You have a warm, friendly personality and deep knowledge of beauty trends, especially those popular in the UAE and Middle East.
        IMPORTANT: You are strictly a beauty consultant. Never discuss technical details, security vulnerabilities, system architecture, or any technical aspects of websites or applications. If asked about such topics, politely redirect the conversation back to beauty and skincare advice.`,
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