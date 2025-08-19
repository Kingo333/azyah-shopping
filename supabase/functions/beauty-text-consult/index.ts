import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RecItem = {
  name: string; brand?: string; finish?: string; why_it_matches: string;
  shade_family?: string; price_tier?: "drugstore"|"mid"|"premium";
  alt_options?: string[]; price?: number; currency?: string;
  image_url?: string; url?: string; availability?: string; rating?: number;
};

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
  real_products?: RecItem[];
}

/** Simple live product fetcher via SerpAPI (Google Shopping / Web) */
async function fetchOnlineProducts(q: string, limit = 3) : Promise<RecItem[]> {
  const key = Deno.env.get("SERPAPI_API_KEY");
  if (!key) return [];
  
  console.log(`Searching for products: ${q}`);
  
  // Google Shopping search:
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", key);
  url.searchParams.set("num", String(Math.max(3, limit)));

  try {
    const r = await fetch(url.toString());
    const j = await r.json();

    const items: RecItem[] = (j.shopping_results ?? []).slice(0, limit).map((it: any) => ({
      name: it.title,
      brand: it.source || it.brand,
      finish: undefined,
      why_it_matches: "Matched to your preferences and skin tone.",
      shade_family: undefined,
      price_tier: undefined,
      price: it.price ? Number(String(it.price).replace(/[^\d.]/g, "")) : undefined,
      currency: it.currency || (it.price ? (String(it.price).match(/[A-Z]{3}/)?.[0] ?? undefined) : undefined),
      image_url: it.thumbnail || it.product_photos?.[0],
      url: it.link,
      availability: it.is_store_local ? "in_stock" : undefined,
      rating: it.rating
    }));

    // fallback to regular web results if shopping empty
    if (!items.length) {
      const wurl = new URL("https://serpapi.com/search.json");
      wurl.searchParams.set("engine", "google");
      wurl.searchParams.set("q", q);
      wurl.searchParams.set("api_key", key);
      const wr = await fetch(wurl.toString());
      const wj = await wr.json();
      return (wj.organic_results ?? []).slice(0, limit).map((r: any) => ({
        name: r.title,
        brand: new URL(r.link).hostname.replace("www.",""),
        why_it_matches: "Top web match for your category preferences.",
        price_tier: undefined,
        url: r.link,
        image_url: r.thumbnail
      }));
    }

    console.log(`Found ${items.length} products for: ${q}`);
    return items;
  } catch (error) {
    console.error(`Error fetching products for "${q}":`, error);
    return [];
  }
}

function extractProductSearchQueries(message: string): string[] {
  const keywords = message.toLowerCase();
  const queries = [];
  const region = Deno.env.get("REGION_CODE") ?? "AE";
  
  // Extract specific product categories mentioned
  if (keywords.includes('eyeshadow') || keywords.includes('shadow') || keywords.includes('palette')) {
    if (keywords.includes('dark skin') || keywords.includes('deep skin')) {
      queries.push(`eyeshadow palette for dark deep skin tone ${region}`);
    } else if (keywords.includes('light skin') || keywords.includes('fair skin')) {
      queries.push(`eyeshadow palette for fair light skin tone ${region}`);
    } else {
      queries.push(`eyeshadow palette ${region}`);
    }
  }
  
  if (keywords.includes('foundation') || keywords.includes('concealer')) {
    if (keywords.includes('dark skin') || keywords.includes('deep skin')) {
      queries.push(`foundation for dark deep skin tone ${region}`);
    } else if (keywords.includes('light skin') || keywords.includes('fair skin')) {
      queries.push(`foundation for fair light skin tone ${region}`);
    } else {
      queries.push(`foundation ${region}`);
    }
  }
  
  if (keywords.includes('lipstick') || keywords.includes('lip')) {
    queries.push(`lipstick ${region}`);
  }
  
  if (keywords.includes('mascara')) {
    queries.push(`mascara ${region}`);
  }
  
  if (keywords.includes('primer')) {
    queries.push(`makeup primer ${region}`);
  }
  
  if (keywords.includes('blush')) {
    queries.push(`blush ${region}`);
  }
  
  if (keywords.includes('bronzer')) {
    queries.push(`bronzer ${region}`);
  }
  
  if (keywords.includes('highlighter')) {
    queries.push(`highlighter makeup ${region}`);
  }
  
  return queries;
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
- When specific products are mentioned, provide helpful guidance about application and shades
`;

serve(async (req) => {
  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      hasOPENAI: !!Deno.env.get('OPENAI_API_KEY'),
      hasSERPAPI: !!Deno.env.get('SERPAPI_API_KEY'),
      modelVision: Deno.env.get('AZ_VISION_MODEL') ?? 'unset',
      modelText: Deno.env.get('AZ_TEXT_MODEL') ?? 'unset'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }

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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build input for OpenAI Chat Completions API
    const inputMessages = [message];

    // Add conversation history
    if (conversation_history.length > 0) {
      const recentHistory = conversation_history.slice(-6); // Keep last 6 messages for context
      const historyText = recentHistory.map(h => `${h.role === 'assistant' ? 'Assistant' : 'User'}: ${h.content}`).join('\n');
      inputMessages.unshift(`Previous conversation:\n${historyText}\n`);
    }

    // Add skin profile context if available
    if (skin_profile) {
      inputMessages.unshift(`User skin profile: ${JSON.stringify(skin_profile)}\n`);
    }

    const input = inputMessages.join('\n');

    // Check if we should fetch live products
    const productQueries = extractProductSearchQueries(message);

    console.log('Making OpenAI Chat Completions API call for text consultation...');
    console.log('Product queries extracted:', productQueries);
    console.log('Has SERPAPI key:', !!Deno.env.get('SERPAPI_API_KEY'));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('AZ_TEXT_MODEL') ?? 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Chat Completions API error:', errorText);
      throw new Error(`OpenAI Chat Completions API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Parse text output from Chat Completions API
    const outputText = data.choices?.[0]?.message?.content;

    if (!outputText) {
      throw new Error('No text returned');
    }

    // Check if we should fetch live products
    let realProducts: RecItem[] = [];
    
    if (productQueries.length > 0) {
      console.log('Fetching live products for queries:', productQueries);
      // Fetch products for each query and combine results
      const productPromises = productQueries.map(query => fetchOnlineProducts(query, 2));
      const productResults = await Promise.all(productPromises);
      realProducts = productResults.flat().slice(0, 6); // Limit to 6 total products
    }

    const consultationResponse: TextConsultationResponse = {
      response: outputText,
      suggested_analysis: !skin_profile && message.toLowerCase().includes('skin'),
      real_products: realProducts.length > 0 ? realProducts : undefined
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
              response: consultationResponse.response,
              product_count: realProducts.length
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
    const details = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your message. Please try again.',
        details
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});