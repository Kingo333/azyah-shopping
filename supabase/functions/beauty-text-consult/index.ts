import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface TextConsultationRequest {
  message: string;
  conversation_history?: Array<{ role: string; content: string }>;
  user_id?: string;
  skin_profile?: any;
}

interface TextConsultationResponse {
  response: string;
  follow_up_questions?: string[];
  recommendations?: any;
  suggested_analysis?: boolean;
}

const SYSTEM_PROMPT = `
You are "Azyah Beauty Consultant", a licensed makeup artist providing cosmetic advice.

⚠️ IMPORTANT DISCLAIMERS:
- This is cosmetic advice only, NOT medical advice
- Always patch test new products for allergic reactions
- Consult a dermatologist for skin concerns or conditions

YOUR APPROACH:
1. Listen to the user's beauty concerns and questions
2. Ask intelligent follow-up questions to understand their needs
3. Provide helpful advice based on their descriptions
4. Suggest uploading a selfie for more accurate recommendations when appropriate
5. Give general product guidance when image analysis isn't available

CONVERSATION GUIDELINES:
- Be conversational and helpful
- Ask 1-2 targeted questions per response
- If they describe their skin, give general advice but suggest photo analysis for accuracy
- Focus on education and building their confidence
- Always mention safety (patch testing, allergies)
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_history = [], user_id, skin_profile }: TextConsultationRequest = await req.json();

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build input array for OpenAI Responses API
    const input = [
      { role: "user", content: [{ type: "input_text", text: message }] }
    ];

    // Add conversation history
    if (conversation_history.length > 0) {
      const recentHistory = conversation_history.slice(-6); // Keep last 6 messages for context
      recentHistory.forEach(h => {
        input.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: [{ type: "input_text", text: h.content }]
        });
      });
    }

    // Add skin profile context if available
    if (skin_profile) {
      input.push({
        role: "developer",
        content: [{ type: "input_text", text: `User skin profile (if any): ${JSON.stringify(skin_profile)}` }]
      });
    }

    console.log('Making OpenAI Responses API call for text consultation...');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('AZ_TEXT_MODEL') ?? 'gpt-5',
        instructions: SYSTEM_PROMPT,
        input: input,
        max_output_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Responses API error:', errorText);
      throw new Error(`OpenAI Responses API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Parse text output from Responses API
    const outputText = data.output_text || (
      data.output?.flatMap((m: any) =>
        (m.content || []).filter((c: any) => c.type === "output_text").map((c: any) => c.text)
      ).join("\n")
    );

    if (!outputText) {
      throw new Error('No text returned');
    }

    const consultationResponse: TextConsultationResponse = {
      response: outputText,
      suggested_analysis: !skin_profile && message.toLowerCase().includes('skin'),
    };

    // Log the interaction if user_id provided
    if (user_id) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('beauty_consult_events')
          .insert({
            user_id: user_id,
            event: 'text_consultation',
            payload: {
              message: message,
              response: consultationResponse.response
            }
          });

      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    return new Response(
      JSON.stringify(consultationResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in beauty-text-consult function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your message. Please try again.',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});