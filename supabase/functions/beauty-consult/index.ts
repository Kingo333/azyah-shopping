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
  brand?: string;
  finish?: string;
  why_it_matches: string;
  shade_family?: string;
  price_tier?: 'drugstore' | 'mid' | 'premium';
  alt_options?: string[];
  price?: number;
  currency?: string;
  image_url?: string;
  url?: string;
  availability?: string;
  rating?: number;
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
  real_products?: boolean;
}

// Developer-level instructions for OpenAI Responses API
const BEAUTY_DEVELOPER_INSTRUCTIONS = `
You are "Azyah Beauty Consultant", a licensed-quality makeup artist AI. You ONLY provide cosmetic advice (not medical). Be concise, friendly, and factual.

⚠️ CRITICAL DISCLAIMERS & SAFETY:
- This is cosmetic advice only, NOT medical advice
- Always recommend patch testing for new products (especially for sensitive skin)
- Consult a dermatologist for skin concerns, conditions, or allergic reactions
- Products may vary in performance based on individual skin chemistry
- Age verification required for certain product categories (18+ for retinoids, acids)
- Include allergy warnings for common irritants (fragrances, sulfates, parabens)

ANALYSIS PROTOCOL:
1) From selfie input: Analyze skin_type, tone_depth, undertone, visible_concerns
2) Assess lighting conditions and note if they may affect undertone accuracy
3) Provide confidence score (0-1) for skin analysis based on image quality/lighting
4) Ask ≤2 clarifying questions ONLY if essential (preferred finish: matte/natural/glow, coverage: light/medium/full)

PRODUCT RECOMMENDATIONS:
- Output exactly 3 ranked suggestions per category: Primer, Foundation/Concealer, Brows/Eyeliner/Bronzer, Shadow Palette
- Each item MUST include: name, brand, finish, why_it_matches, shade_family, price_tier (drugstore/mid/premium)
- If uncertain about exact shades, suggest 2-3 shade families across price tiers
- Prioritize products available in user's region when possible
- Include alternative options for budget constraints

TECHNIQUE GUIDANCE:
- Provide specific application techniques based on face shape, eye shape, brow shape
- Include contouring/highlighting placement for their bone structure
- Mention tools/brushes that work best for their skin type
- Adapt techniques for their skill level (beginner vs experienced)

SAFETY & QUALITY RULES:
- Never make medical claims or diagnose skin conditions
- Include patch test reminders for sensitive skin types
- Mention ingredient sensitivities for common allergens
- Keep confidence modest—lighting can mislead undertone analysis
- If image quality is poor, request better lighting or additional angles
- Return EXACTLY the JSON schema format—no additional keys or prose text

BUSINESS RULES:
- Maintain professional, friendly tone
- Be specific with product names and brands when possible
- Consider undertone when suggesting all shade recommendations
- Adapt to user's stated preferences and budget constraints
- Include technique difficulty level in notes
`.trim();

// JSON Schema for OpenAI Structured Outputs
const BeautyConsultationJsonSchema = {
  name: "BeautyConsultation",
  schema: {
    type: "object",
    properties: {
      skin_profile: {
        type: "object",
        properties: {
          tone_depth: {
            type: "string",
            enum: ["fair", "light", "medium", "tan", "deep"]
          },
          undertone: {
            type: "string",
            enum: ["cool", "warm", "neutral", "olive"]
          },
          skin_type: {
            type: "string",
            enum: ["dry", "oily", "combination", "normal", "sensitive"]
          },
          visible_concerns: {
            type: "array",
            items: { type: "string" }
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        },
        required: ["tone_depth", "undertone", "skin_type", "visible_concerns", "confidence"],
        additionalProperties: false
      },
      questions: {
        type: "array",
        items: { type: "string" },
        maxItems: 2
      },
      recommendations: {
        type: "object",
        properties: {
          primer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: { type: "string" },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: { type: "string", enum: ["drugstore", "mid", "premium"] },
                alt_options: { type: "array", items: { type: "string" } }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          foundation_concealer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: { type: "string" },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: { type: "string", enum: ["drugstore", "mid", "premium"] },
                alt_options: { type: "array", items: { type: "string" } }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          brows_eyeliner_bronzer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: { type: "string" },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: { type: "string", enum: ["drugstore", "mid", "premium"] },
                alt_options: { type: "array", items: { type: "string" } }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          shadow_palette: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: { type: "string" },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: { type: "string", enum: ["drugstore", "mid", "premium"] },
                alt_options: { type: "array", items: { type: "string" } }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          }
        },
        required: ["primer", "foundation_concealer", "brows_eyeliner_bronzer", "shadow_palette"],
        additionalProperties: false
      },
      technique_notes: {
        type: "array",
        items: { type: "string" }
      },
      safety_warnings: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["skin_profile", "recommendations", "technique_notes"],
    additionalProperties: false
  },
  strict: true
};

// Enhanced product search with fallback
async function searchRealProducts(category: string, skin_profile: any, supabase: any): Promise<RecItem[]> {
  try {
    console.log(`Searching real products for category: ${category}`);
    
    // Create search query based on skin profile and category
    const searchQuery = `${category} ${skin_profile.tone_depth} ${skin_profile.undertone} ${skin_profile.skin_type}`;
    
    const { data, error } = await supabase.functions.invoke('beauty-product-search', {
      body: {
        query: searchQuery,
        category: category,
        skin_profile: skin_profile,
        region: 'AE',
        limit: 9
      }
    });

    if (error) {
      console.error(`Product search error for ${category}:`, error);
      return [];
    }

    console.log(`Found products for ${category}:`, data);

    // Convert search results to RecItem format
    const products: RecItem[] = [];
    
    if (data.drugstore) {
      products.push({
        name: data.drugstore.name,
        brand: data.drugstore.brand,
        finish: data.drugstore.finish,
        why_it_matches: `Perfect drugstore option for ${skin_profile.tone_depth} ${skin_profile.undertone} skin`,
        shade_family: data.drugstore.shade_name || data.drugstore.shade_family,
        price_tier: 'drugstore',
        price: data.drugstore.price,
        currency: data.drugstore.currency,
        image_url: data.drugstore.image_url,
        url: data.drugstore.url,
        availability: data.drugstore.availability,
        alt_options: ["Similar drugstore alternatives available"]
      });
    }

    if (data.mid) {
      products.push({
        name: data.mid.name,
        brand: data.mid.brand,
        finish: data.mid.finish,
        why_it_matches: `Great mid-range choice for ${skin_profile.tone_depth} ${skin_profile.undertone} undertones`,
        shade_family: data.mid.shade_name || data.mid.shade_family,
        price_tier: 'mid',
        price: data.mid.price,
        currency: data.mid.currency,
        image_url: data.mid.image_url,
        url: data.mid.url,
        availability: data.mid.availability,
        alt_options: ["Other mid-range options available"]
      });
    }

    if (data.premium) {
      products.push({
        name: data.premium.name,
        brand: data.premium.brand,
        finish: data.premium.finish,
        why_it_matches: `Luxury option perfectly suited for ${skin_profile.tone_depth} skin with ${skin_profile.undertone} undertones`,
        shade_family: data.premium.shade_name || data.premium.shade_family,
        price_tier: 'premium',
        price: data.premium.price,
        currency: data.premium.currency,
        image_url: data.premium.image_url,
        url: data.premium.url,
        availability: data.premium.availability,
        alt_options: ["Premium alternatives available"]
      });
    }

    return products;
  } catch (error) {
    console.error(`Error searching products for ${category}:`, error);
    return [];
  }
}

// Fallback product recommendations
function getFallbackProducts(category: string, skin_profile: any): RecItem[] {
  const categoryMaps: Record<string, RecItem[]> = {
    primer: [
      {
        name: "Hydrating Face Primer",
        brand: "Local Beauty",
        finish: "natural",
        why_it_matches: `Perfect for ${skin_profile.skin_type} skin, creates smooth base`,
        shade_family: "universal",
        price_tier: "drugstore",
        alt_options: ["Mattifying primer for oily skin", "Pore-filling primer"]
      },
      {
        name: "Illuminating Primer",
        brand: "Mid Range Beauty",
        finish: "glow",
        why_it_matches: `Enhances ${skin_profile.tone_depth} skin with subtle radiance`,
        shade_family: "universal",
        price_tier: "mid",
        alt_options: ["Color-correcting primer", "Long-wear primer"]
      }
    ],
    foundation_concealer: [
      {
        name: "Perfect Match Foundation",
        brand: "Inclusive Beauty",
        finish: "natural",
        why_it_matches: `Formulated for ${skin_profile.tone_depth} skin with ${skin_profile.undertone} undertones`,
        shade_family: `${skin_profile.tone_depth} ${skin_profile.undertone}`,
        price_tier: "drugstore",
        alt_options: ["Full coverage option", "Lightweight tinted moisturizer"]
      }
    ],
    brows_eyeliner_bronzer: [
      {
        name: "Universal Brow Kit",
        brand: "Brow Expert",
        finish: "natural",
        why_it_matches: `Complements ${skin_profile.tone_depth} hair and skin tones`,
        shade_family: `${skin_profile.tone_depth}`,
        price_tier: "mid",
        alt_options: ["Waterproof eyeliner", "Cream bronzer"]
      }
    ],
    shadow_palette: [
      {
        name: "Everyday Neutrals Palette",
        brand: "Color Pro",
        finish: "mixed",
        why_it_matches: `Neutral tones perfect for ${skin_profile.undertone} undertones`,
        shade_family: "neutral browns",
        price_tier: "mid",
        alt_options: ["Bold color palette", "Single eyeshadows"]
      }
    ]
  };

  return categoryMaps[category] || [];
}

serve(async (req) => {
  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      hasOPENAI: !!Deno.env.get('OPENAI_API_KEY'),
      modelVision: Deno.env.get('AZ_VISION_MODEL') ?? 'unset',
      modelText: Deno.env.get('AZ_TEXT_MODEL') ?? 'unset'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, prefs, last_skin_profile, user_id } = await req.json();

    console.log('Request received:', {
      hasImage: !!image_base64,
      imagePrefix: image_base64?.slice(0, 50),
      prefs,
      hasProfile: !!last_skin_profile,
      userId: user_id
    });

    if (!image_base64) {
      console.log('No image provided');
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

    // Initialize Supabase client for product search
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build context prompt
    let contextPrompt = "Analyze my selfie and recommend makeup products. Return ONLY JSON that matches the schema.";
    
    // Add preferences if provided
    if (prefs && Object.keys(prefs).length > 0) {
      contextPrompt += `\n\nPreferences: ${JSON.stringify(prefs)}`;
    }

    // Add previous profile for consistency if available
    if (last_skin_profile) {
      contextPrompt += `\n\nPrevious skin profile: ${JSON.stringify(last_skin_profile)}`;
    }

    console.log('Making OpenAI Chat Completions API call...');

    // Call OpenAI Chat Completions API with vision and structured output
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: BEAUTY_DEVELOPER_INSTRUCTIONS
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: contextPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: image_base64
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: BeautyConsultationJsonSchema
        },
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Chat Completions API error:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`OpenAI Chat Completions API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received, status:', response.status);
    console.log('Response structure:', Object.keys(data));
    console.log('Response choices:', data.choices?.length || 0);

    // Parse structured JSON from Chat Completions API
    const output = data.choices?.[0]?.message?.content;

    console.log('Parsed output available:', !!output);

    if (!output) {
      throw new Error('No JSON returned by model (check response)');
    }

    let consultationResult;
    try {
      consultationResult = JSON.parse(output);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw output:', output);
      throw new Error('Invalid JSON response from model');
    }
    
    // Validate the result against our interface
    if (!consultationResult.skin_profile || !consultationResult.recommendations || !consultationResult.technique_notes) {
      console.error('Invalid consultation result structure:', consultationResult);
      throw new Error('Invalid consultation structure');
    }

    // Enhance recommendations with real products
    console.log('Enhancing recommendations with real products...');
    
    try {
      const categories = ['primer', 'foundation', 'concealer', 'bronzer'];
      const enhancedRecommendations = { ...consultationResult.recommendations };
      let hasRealProducts = false;

      // Search for real products for each category
      for (const category of categories) {
        let categoryKey = category;
        if (category === 'foundation' || category === 'concealer') {
          categoryKey = 'foundation_concealer';
        } else if (category === 'bronzer') {
          categoryKey = 'brows_eyeliner_bronzer';
        }

        const realProducts = await searchRealProducts(category, consultationResult.skin_profile, supabase);
        
        if (realProducts.length > 0) {
          enhancedRecommendations[categoryKey] = realProducts;
          hasRealProducts = true;
          console.log(`Enhanced ${categoryKey} with ${realProducts.length} real products`);
        } else {
          // Use fallback products
          const fallbackProducts = getFallbackProducts(categoryKey, consultationResult.skin_profile);
          if (fallbackProducts.length > 0) {
            enhancedRecommendations[categoryKey] = fallbackProducts;
          }
          console.log(`Using fallback products for ${categoryKey}`);
        }
      }

      consultationResult.recommendations = enhancedRecommendations;
      consultationResult.real_products = hasRealProducts;
      
    } catch (enhancementError) {
      console.error('Error enhancing with real products:', enhancementError);
      // Continue with AI-generated recommendations
    }

    // Store consultation in database if user_id provided
    if (user_id) {
      try {
        await supabase
          .from('beauty_consults')
          .insert({
            user_id: user_id,
            skin_profile: consultationResult.skin_profile,
            recommendations: consultationResult.recommendations,
            confidence: consultationResult.skin_profile.confidence,
            lighting_note: consultationResult.lighting_note || null,
            sources: consultationResult.real_products ? ['qdrant', 'ai'] : ['ai']
          });

        // Log the event
        await supabase
          .from('beauty_consult_events')
          .insert({
            user_id: user_id,
            event: 'consultation_completed',
            payload: {
              skin_profile: consultationResult.skin_profile,
              preferences: prefs || {},
              real_products: consultationResult.real_products || false
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
    const details = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze photo',
        details
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});