import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  success: boolean;
  category: string;
  subcategory?: string;
  color_primary: string;
  color_secondary?: string;
  pattern?: string;
  fabric_hint?: string;
  silhouette?: string;
  brand_guess?: string;
  description: string;
  confidence: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-product-image] Analyzing image for user ${user.id}`);

    // Call Gemini vision to analyze the product image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a fashion expert analyzing clothing items for a shopping comparison app. 
Analyze the garment in the image and return structured data about its key visual attributes.
Focus on: category, colors, patterns/prints, fabric texture, and silhouette.
If you recognize a brand, include it but mark confidence appropriately.
Return ONLY valid JSON matching the schema provided.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this clothing item and provide:
1. category (e.g., "abaya", "dress", "coat", "kimono", "blazer", "kaftan")
2. subcategory if applicable (e.g., "open abaya", "maxi dress")
3. primary color
4. secondary color if present
5. pattern/print description (e.g., "floral", "paisley", "geometric", "border print", "solid")
6. fabric hint (e.g., "flowing/chiffon", "structured/cotton", "silky")
7. silhouette (e.g., "open front", "fitted", "loose", "belted")
8. brand guess if recognizable (or null)
9. A short natural language description like "Looks like: beige printed open abaya with colorful border trim"
10. confidence 0.0-1.0

Return as JSON: 
{
  "category": "...",
  "subcategory": "...",
  "color_primary": "...",
  "color_secondary": "...",
  "pattern": "...",
  "fabric_hint": "...",
  "silhouette": "...",
  "brand_guess": null,
  "description": "Looks like: ...",
  "confidence": 0.85
}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_product_image',
              description: 'Analyze a clothing item and return structured attributes',
              parameters: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Main category of the clothing item (e.g., abaya, dress, coat)'
                  },
                  subcategory: {
                    type: 'string',
                    description: 'More specific subcategory if applicable'
                  },
                  color_primary: {
                    type: 'string',
                    description: 'Primary/dominant color of the item'
                  },
                  color_secondary: {
                    type: 'string',
                    description: 'Secondary color if present'
                  },
                  pattern: {
                    type: 'string',
                    description: 'Pattern or print description (floral, paisley, solid, etc.)'
                  },
                  fabric_hint: {
                    type: 'string',
                    description: 'Fabric texture hint (flowing, structured, silky, etc.)'
                  },
                  silhouette: {
                    type: 'string',
                    description: 'Shape/cut description (open front, fitted, loose, etc.)'
                  },
                  brand_guess: {
                    type: 'string',
                    description: 'Brand name if recognizable, null otherwise'
                  },
                  description: {
                    type: 'string',
                    description: 'Natural language description starting with "Looks like: "'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score 0.0-1.0'
                  }
                },
                required: ['category', 'color_primary', 'description', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_product_image' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-product-image] AI analysis failed:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[analyze-product-image] AI response received');

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall?.function?.arguments 
      ? JSON.parse(toolCall.function.arguments)
      : {
          category: 'clothing',
          color_primary: 'unknown',
          description: 'Looks like: a clothing item',
          confidence: 0.3
        };

    const response: AnalysisResult = {
      success: true,
      category: result.category || 'clothing',
      subcategory: result.subcategory,
      color_primary: result.color_primary || 'unknown',
      color_secondary: result.color_secondary,
      pattern: result.pattern,
      fabric_hint: result.fabric_hint,
      silhouette: result.silhouette,
      brand_guess: result.brand_guess,
      description: result.description || 'Looks like: a clothing item',
      confidence: result.confidence || 0.5,
    };

    console.log(`[analyze-product-image] Success: ${response.description}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[analyze-product-image] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        category: 'clothing',
        color_primary: 'unknown',
        description: 'Unable to analyze image',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
