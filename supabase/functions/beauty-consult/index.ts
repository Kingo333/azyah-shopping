import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

if (!openAIApiKey) {
  console.error('OPENAI_API_KEY is not set');
}

interface RecItem {
  name: string;
  finish?: string;
  why_it_matches: string;
  shade_family?: string;
  price_tier?: 'drugstore' | 'mid' | 'premium';
  alt_options?: string[];
}

interface BeautyConsultation {
  skin_profile: {
    tone_depth: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
    undertone: 'cool' | 'warm' | 'neutral' | 'olive';
    skin_type: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
    visible_concerns: string[];
    confidence: number;
  };
  questions?: string[];
  recommendations: {
    primer: RecItem[];
    foundation_concealer: RecItem[];
    brows_eyeliner_bronzer: RecItem[];
    shadow_palette: RecItem[];
  };
  technique_notes: string[];
}

const SYSTEM_PROMPT = `
You are "Azyah Beauty Consultant", a licensed-quality makeup artist. You ONLY provide cosmetic advice (not medical). Be concise, friendly, and factual.

⚠️ IMPORTANT DISCLAIMERS:
- This is cosmetic advice only, NOT medical advice
- Always patch test new products for allergic reactions
- Consult a dermatologist for skin concerns or conditions
- Products may vary in performance based on individual skin
- Age verification required for certain product categories

GOAL:
1) From the user's selfie, infer skin_type, tone_depth, undertone, visible_concerns.
2) Ask max 2 clarifying questions only if needed (e.g., preferred finish/coverage).
3) Output ranked, concrete product suggestions for Primer, Foundation/Concealer, Brows/Eyeliner/Bronzer, Shadow Palette. Each item must include: name, finish, why_it_matches, shade_family, price_tier (drugstore/mid/premium).
4) Add technique notes tied to face traits (brow shape, liner angle, contour placement).
5) Keep claims modest—lighting can mislead undertone; include a confidence 0–1 for skin_profile and a lighting note if needed.
6) Prioritize products available in the user's region when possible.

RULES:
- If unsure of exact shade numbers, suggest 2–3 shade families per tier.
- No medical claims. Return EXACTLY the JSON schema provided by the app.
- Be specific with product names and brands when possible.
- Consider undertone when suggesting shades.
- Adapt recommendations to the person's features and skin characteristics.
- Include allergy warnings for sensitive ingredients when relevant.
- Mention patch testing recommendations for new users.
`;

const jsonSchema = {
  "type": "object",
  "properties": {
    "skin_profile": {
      "type": "object",
      "properties": {
        "tone_depth": {
          "type": "string",
          "enum": ["fair", "light", "medium", "tan", "deep"]
        },
        "undertone": {
          "type": "string",
          "enum": ["cool", "warm", "neutral", "olive"]
        },
        "skin_type": {
          "type": "string",
          "enum": ["dry", "oily", "combination", "normal", "sensitive"]
        },
        "visible_concerns": {
          "type": "array",
          "items": { "type": "string" }
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": ["tone_depth", "undertone", "skin_type", "visible_concerns", "confidence"],
      "additionalProperties": false
    },
    "questions": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 2
    },
    "recommendations": {
      "type": "object",
      "properties": {
        "primer": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "finish": { "type": "string" },
              "why_it_matches": { "type": "string" },
              "shade_family": { "type": "string" },
              "price_tier": { "type": "string", "enum": ["drugstore", "mid", "premium"] },
              "alt_options": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["name", "why_it_matches"],
            "additionalProperties": false
          }
        },
        "foundation_concealer": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "finish": { "type": "string" },
              "why_it_matches": { "type": "string" },
              "shade_family": { "type": "string" },
              "price_tier": { "type": "string", "enum": ["drugstore", "mid", "premium"] },
              "alt_options": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["name", "why_it_matches"],
            "additionalProperties": false
          }
        },
        "brows_eyeliner_bronzer": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "finish": { "type": "string" },
              "why_it_matches": { "type": "string" },
              "shade_family": { "type": "string" },
              "price_tier": { "type": "string", "enum": ["drugstore", "mid", "premium"] },
              "alt_options": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["name", "why_it_matches"],
            "additionalProperties": false
          }
        },
        "shadow_palette": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "finish": { "type": "string" },
              "why_it_matches": { "type": "string" },
              "shade_family": { "type": "string" },
              "price_tier": { "type": "string", "enum": ["drugstore", "mid", "premium"] },
              "alt_options": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["name", "why_it_matches"],
            "additionalProperties": false
          }
        }
      },
      "required": ["primer", "foundation_concealer", "brows_eyeliner_bronzer", "shadow_palette"],
      "additionalProperties": false
    },
    "technique_notes": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["skin_profile", "recommendations", "technique_notes"],
  "additionalProperties": false
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, prefs, last_skin_profile, user_id } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the conversation
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze my selfie and recommend products. Return your response as a JSON object matching the provided schema."
          },
          {
            type: "image_url",
            image_url: {
              url: image_base64,
              detail: "high"
            }
          }
        ]
      }
    ];

    // Add preferences if provided
    if (prefs && Object.keys(prefs).length > 0) {
      messages.push({
        role: "user",
        content: `My preferences: ${JSON.stringify(prefs)}`
      });
    }

    // Add previous profile for consistency if available
    if (last_skin_profile) {
      messages.push({
        role: "user",
        content: `Previous skin profile for reference: ${JSON.stringify(last_skin_profile)}`
      });
    }

    console.log('Making OpenAI API call...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: messages,
        max_completion_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "BeautyConsultation",
            schema: jsonSchema,
            strict: true
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const consultationResult = JSON.parse(data.choices[0].message.content);
    
    // Validate the result against our interface
    if (!consultationResult.skin_profile || !consultationResult.recommendations || !consultationResult.technique_notes) {
      console.error('Invalid consultation result structure:', consultationResult);
      
      // Retry once with a simpler prompt
      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT + "\n\nIMPORTANT: Return a valid JSON object with all required fields."
            },
            ...messages.slice(1)
          ],
          max_completion_tokens: 2000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "BeautyConsultation",
              schema: jsonSchema,
              strict: true
            }
          }
        }),
      });

      if (!retryResponse.ok) {
        throw new Error('Retry failed');
      }

      const retryData = await retryResponse.json();
      const retryResult = JSON.parse(retryData.choices[0].message.content);
      
      if (!retryResult.skin_profile || !retryResult.recommendations || !retryResult.technique_notes) {
        return new Response(
          JSON.stringify({ error: 'Schema validation failed' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      consultationResult = retryResult;
    }

    // Store consultation in database if user_id provided
    if (user_id) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('beauty_consults')
          .insert({
            user_id: user_id,
            skin_profile: consultationResult.skin_profile,
            recommendations: consultationResult.recommendations,
            confidence: consultationResult.skin_profile.confidence,
            lighting_note: consultationResult.lighting_note || null,
            sources: []
          });

        // Log the event
        await supabase
          .from('beauty_consult_events')
          .insert({
            user_id: user_id,
            event: 'consultation_completed',
            payload: {
              skin_profile: consultationResult.skin_profile,
              preferences: prefs || {}
            }
          });

        console.log('Consultation saved to database');
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    return new Response(
      JSON.stringify(consultationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in beauty-consult function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze photo. Please try again with a clear, well-lit selfie.',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});