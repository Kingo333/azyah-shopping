import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { QdrantClient } from "https://esm.sh/@qdrant/js-client-rest@1.15.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const qdrantUrl = Deno.env.get('QDRANT_URL');
const qdrantApiKey = Deno.env.get('QDRANT_API_KEY');

interface ProductSearchRequest {
  query: string;
  category: 'primer' | 'foundation' | 'concealer' | 'brow' | 'eyeliner' | 'bronzer' | 'shadow';
  skin_profile?: {
    tone_depth: string;
    undertone: string;
    skin_type: string;
  };
  price_tier?: 'drugstore' | 'mid' | 'premium';
  region?: string;
  limit?: number;
}

interface ProductPayload {
  product_id: string;
  brand: string;
  name: string;
  category: string;
  finish?: string;
  coverage?: string;
  undertone_tags?: string[];
  shade_name?: string;
  shade_hex?: string;
  price: number;
  currency: string;
  region?: string[];
  url?: string;
  image_url?: string;
  availability?: string;
  popularity_score?: number;
  brand_tier?: string;
  tags?: string[];
  last_seen_at: string;
}

async function embedQuery(query: string): Promise<number[]> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function findGroundedProducts(
  query: string, 
  category: string, 
  skin_profile?: any,
  price_tier?: string,
  region = "AE",
  limit = 12
): Promise<{ drugstore: ProductPayload | null; mid: ProductPayload | null; premium: ProductPayload | null }> {
  try {
    if (!qdrantUrl || !qdrantApiKey) {
      console.warn('Qdrant not configured, returning mock data');
      return { drugstore: null, mid: null, premium: null };
    }

    const qdrant = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey
    });

    // Create enhanced query with skin profile
    let enhancedQuery = query;
    if (skin_profile) {
      enhancedQuery += ` ${skin_profile.tone_depth} ${skin_profile.undertone} ${skin_profile.skin_type}`;
    }

    const vector = await embedQuery(enhancedQuery);
    
    const searchFilter: any = {
      must: [
        { key: "category", match: { value: category } },
        { key: "region", match: { any: [region] } }
      ]
    };

    // Add price tier filter if specified
    if (price_tier) {
      searchFilter.must.push({ key: "brand_tier", match: { value: price_tier } });
    }

    // Add undertone filter if available
    if (skin_profile?.undertone) {
      searchFilter.should = [
        { key: "undertone_tags", match: { any: [skin_profile.undertone] } },
        { key: "undertone_tags", match: { any: ["neutral", "universal"] } }
      ];
    }

    const res = await qdrant.search("kb_products", {
      vector,
      limit,
      with_payload: true,
      filter: searchFilter
    });

    const items = (res ?? [])
      .map((p: any) => p.payload as ProductPayload)
      .filter((p: ProductPayload) => p.category === category);

    // Group by price tier
    const tiers = { 
      drugstore: null as ProductPayload | null, 
      mid: null as ProductPayload | null, 
      premium: null as ProductPayload | null 
    };
    
    for (const tier of ["drugstore", "mid", "premium"] as const) {
      tiers[tier] = items.find((i: ProductPayload) => i.brand_tier === tier) ?? null;
    }
    
    // Fill empty tiers with remaining items
    const remaining = items.filter(i => !Object.values(tiers).includes(i));
    if (!tiers.drugstore && remaining.length > 0) tiers.drugstore = remaining.shift()!;
    if (!tiers.mid && remaining.length > 0) tiers.mid = remaining.shift()!;
    if (!tiers.premium && remaining.length > 0) tiers.premium = remaining.shift()!;

    return tiers;
  } catch (error) {
    console.error('Error finding grounded products:', error);
    return { drugstore: null, mid: null, premium: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category, skin_profile, price_tier, region, limit }: ProductSearchRequest = await req.json();

    if (!query || !category) {
      return new Response(
        JSON.stringify({ error: 'Query and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching products:', { query, category, price_tier, region });

    const products = await findGroundedProducts(
      query, 
      category, 
      skin_profile,
      price_tier,
      region || "AE",
      limit || 12
    );

    return new Response(
      JSON.stringify(products),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in beauty-product-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to search products. Please try again.',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});