import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

type ProductPayload = {
  product_id: string;
  brand: string;
  name: string;
  category: "primer" | "foundation" | "concealer" | "brow" | "eyeliner" | "bronzer" | "shadow";
  finish?: "matte" | "natural" | "glow" | "satin";
  coverage?: "light" | "medium" | "full";
  undertone_tags?: string[];
  shade_name?: string;
  shade_hex?: string;
  price: number;
  currency: string;
  region?: string[];
  url?: string;
  image_url?: string;
  availability?: "in_stock" | "out_of_stock";
  popularity_score?: number;
  brand_tier?: "drugstore" | "mid" | "premium";
  tags?: string[];
  last_seen_at: string;
};

function normalizeProductString(p: ProductPayload): string {
  return `brand:${p.brand}; name:${p.name}; category:${p.category}; finish:${p.finish ?? ""}; coverage:${p.coverage ?? ""}; undertone:${(p.undertone_tags ?? []).join("|")}; shade:${p.shade_name ?? ""}; price:${p.price} ${p.currency}; region:${(p.region ?? []).join("|")}; tags:${(p.tags ?? []).join("|")}; tier:${p.brand_tier ?? ""}`;
}

function tierFromPriceAED(aed: number): "drugstore" | "mid" | "premium" {
  const dMax = 60; // AZ_PRICE_TIER_DRUGSTORE_MAX
  const mMax = 180; // AZ_PRICE_TIER_MID_MAX
  if (aed <= dMax) return "drugstore";
  if (aed <= mMax) return "mid";
  return "premium";
}

async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: texts
    })
  });
  
  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const points: any[] = [];

    console.log('Processing product ingestion request');

    if ("products" in body) {
      const items = body.products as ProductPayload[];
      console.log(`Processing ${items.length} products`);
      
      const norm = items.map(p => {
        const aed = p.currency === "AED" ? p.price : p.price; // Add FX conversion if needed
        p.brand_tier = p.brand_tier ?? tierFromPriceAED(aed);
        return { p, s: normalizeProductString(p) };
      });
      
      const vecs = await embed(norm.map(n => n.s));
      norm.forEach((n, i) => {
        points.push({
          id: crypto.randomUUID(),
          vector: vecs[i],
          payload: { ...n.p, content: n.s }
        });
      });
    } else if ("image_base64" in body) {
      console.log('Processing product image extraction');
      
      // Extract SKUs from image using GPT-4o vision
      const vision = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'Extract product information from beauty images. Return array of ProductPayload objects with undertone_tags, finish, category when visible.' 
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract all visible products as JSON array matching ProductPayload schema.' },
                { type: 'image_url', image_url: { url: body.image_base64 } }
              ]
            }
          ]
        })
      });
      
      const visionResult = await vision.json();
      const extracted = JSON.parse(visionResult.choices[0]?.message?.content ?? "[]");
      
      const withTier = extracted.map((p: any) => ({ 
        ...p, 
        brand_tier: p.brand_tier ?? tierFromPriceAED(p.price || 0),
        last_seen_at: new Date().toISOString()
      }));
      
      const strings = withTier.map((p: any) => normalizeProductString(p));
      const vecs = await embed(strings);
      
      withTier.forEach((p: any, i: number) => {
        points.push({ 
          id: crypto.randomUUID(), 
          vector: vecs[i], 
          payload: { ...p, content: strings[i] } 
        });
      });
    }

    console.log(`Generated ${points.length} product points for vector storage`);

    // In production, this would upsert to Qdrant
    // await qdrant.upsert(COLLECTION_PRODUCTS, { wait: true, points });

    return new Response(
      JSON.stringify({ ok: true, count: points.length, message: "Products processed successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in beauty-ingest-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});