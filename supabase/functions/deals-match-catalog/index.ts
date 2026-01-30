import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CatalogMatch {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  media_url: string;
  category_slug: string | null;
  brand_name: string | null;
  match_score: number;
}

interface MatchCatalogResponse {
  success: boolean;
  matches: CatalogMatch[];
  total_found: number;
  error?: string;
}

// Simple text similarity (Jaccard-like on words)
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Price proximity score (1.0 if exact, lower if further)
function priceProximity(priceA: number, priceB: number): number {
  if (priceA <= 0 || priceB <= 0) return 0.5;
  const ratio = Math.min(priceA, priceB) / Math.max(priceA, priceB);
  return ratio;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
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

    // Verify token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query_title, category, price_cents, limit = 8 } = await req.json();

    if (!query_title || typeof query_title !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'query_title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-match-catalog] Matching: "${query_title.substring(0, 50)}...", category=${category}, price=${price_cents}`);

    // Extract keywords from query title
    const keywords = query_title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .slice(0, 5);

    // Fetch active products from catalog
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        price_cents,
        currency,
        media_urls,
        category_slug,
        brand_id,
        tags,
        brands:brand_id (name)
      `)
      .eq('status', 'active')
      .eq('is_external', false)
      .limit(200);

    if (dbError) {
      console.error('[deals-match-catalog] DB error:', dbError);
      throw new Error('Failed to fetch catalog');
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matches: [], total_found: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-match-catalog] Fetched ${products.length} products to score`);

    // Score each product
    const scoredProducts: CatalogMatch[] = [];

    for (const product of products) {
      let score = 0;

      // Title similarity (weight: 0.5)
      const titleSim = textSimilarity(query_title, product.title || '');
      score += titleSim * 0.5;

      // Tag match (weight: 0.2)
      if (product.tags && Array.isArray(product.tags)) {
        const tagMatches = keywords.filter((k: string) => 
          product.tags.some((t: string) => t.toLowerCase().includes(k))
        ).length;
        score += (tagMatches / Math.max(keywords.length, 1)) * 0.2;
      }

      // Category match (weight: 0.15)
      if (category && product.category_slug) {
        if (product.category_slug.toLowerCase().includes(category.toLowerCase()) ||
            category.toLowerCase().includes(product.category_slug.toLowerCase())) {
          score += 0.15;
        }
      }

      // Price proximity (weight: 0.15)
      if (price_cents && product.price_cents) {
        score += priceProximity(price_cents, product.price_cents) * 0.15;
      }

      // Only include products with meaningful score
      if (score >= 0.1) {
        const mediaUrl = product.media_urls?.[0] || '';
        const brandName = (product.brands as any)?.name || null;

        scoredProducts.push({
          id: product.id,
          title: product.title,
          price_cents: product.price_cents,
          currency: product.currency || 'AED',
          media_url: mediaUrl,
          category_slug: product.category_slug,
          brand_name: brandName,
          match_score: score,
        });
      }
    }

    // Sort by score descending
    scoredProducts.sort((a, b) => b.match_score - a.match_score);

    // Take top N
    const matches = scoredProducts.slice(0, Math.min(limit, 8));

    console.log(`[deals-match-catalog] Found ${matches.length} matches (top score: ${matches[0]?.match_score.toFixed(2) || 0})`);

    const response: MatchCatalogResponse = {
      success: true,
      matches,
      total_found: scoredProducts.length,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-match-catalog] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        matches: [],
        total_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
