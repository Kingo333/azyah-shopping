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

// Extract brand keywords from a title
function extractBrandKeywords(title: string): string[] {
  const commonBrands = ['nike', 'adidas', 'zara', 'hm', 'gucci', 'prada', 'asos', 'mango', 'massimo', 'uniqlo', 'gap', 'levis', 'calvin', 'tommy', 'ralph', 'armani', 'versace', 'chanel', 'dior', 'burberry'];
  const titleLower = title.toLowerCase();
  return commonBrands.filter(brand => titleLower.includes(brand));
}

// Extract category keywords from a title
function extractCategoryKeywords(title: string): string[] {
  const categories = ['shoes', 'sneakers', 'dress', 'shirt', 'pants', 'jeans', 'jacket', 'coat', 'bag', 'handbag', 'watch', 'abaya', 'hijab', 'blazer', 'sweater', 'hoodie', 'skirt', 'top', 'blouse', 'boots', 'sandals', 'heels'];
  const titleLower = title.toLowerCase();
  return categories.filter(cat => titleLower.includes(cat));
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

    // Extract brand and category hints from query
    const queryBrands = extractBrandKeywords(query_title);
    const queryCategories = extractCategoryKeywords(query_title);

    // Fetch ALL active products from catalog (removed is_external filter)
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
      .limit(300); // Increased limit

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
      const brandName = (product.brands as any)?.name || null;

      // Title similarity (weight: 0.4)
      const titleSim = textSimilarity(query_title, product.title || '');
      score += titleSim * 0.4;

      // Tag match (weight: 0.15)
      if (product.tags && Array.isArray(product.tags)) {
        const tagMatches = keywords.filter((k: string) => 
          product.tags.some((t: string) => t.toLowerCase().includes(k))
        ).length;
        score += (tagMatches / Math.max(keywords.length, 1)) * 0.15;
      }

      // Category match (weight: 0.15)
      if (category && product.category_slug) {
        if (product.category_slug.toLowerCase().includes(category.toLowerCase()) ||
            category.toLowerCase().includes(product.category_slug.toLowerCase())) {
          score += 0.15;
        }
      }
      
      // Category keyword match from query
      if (queryCategories.length > 0 && product.category_slug) {
        const catSlug = product.category_slug.toLowerCase();
        if (queryCategories.some(qc => catSlug.includes(qc) || qc.includes(catSlug.split('-')[0]))) {
          score += 0.1;
        }
      }

      // Brand match (weight: 0.1)
      if (queryBrands.length > 0 && brandName) {
        const productBrandLower = brandName.toLowerCase();
        if (queryBrands.some(qb => productBrandLower.includes(qb))) {
          score += 0.1;
        }
      }

      // Price proximity (weight: 0.1)
      if (price_cents && product.price_cents) {
        score += priceProximity(price_cents, product.price_cents) * 0.1;
      }

      // Lowered threshold from 0.1 to 0.05
      if (score >= 0.05) {
        // Safely extract first media URL (handle JSON array stored as string)
        const mediaUrl = (() => {
          const raw = product.media_urls;
          if (!raw) return '';
          
          if (Array.isArray(raw)) {
            return raw[0] || '';
          }
          
          if (typeof raw === 'string') {
            const s = raw.trim();
            if (s.startsWith('[')) {
              try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed[0] || '';
              } catch {
                console.log('[deals-match-catalog] Failed to parse media_urls JSON:', product.id);
              }
            }
            return s; // Plain URL string
          }
          
          return '';
        })();

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

    // FALLBACK: If no matches found, return products by price proximity + category
    let matches = scoredProducts.slice(0, Math.min(limit, 8));

    if (matches.length === 0 && products.length > 0) {
      console.log(`[deals-match-catalog] No scored matches, using price/category fallback`);
      
      // Filter by category keywords if available
      let fallbackProducts = products;
      if (queryCategories.length > 0) {
        const catFiltered = products.filter(p => {
          if (!p.category_slug) return false;
          const catSlug = p.category_slug.toLowerCase();
          return queryCategories.some(qc => catSlug.includes(qc));
        });
        if (catFiltered.length > 0) {
          fallbackProducts = catFiltered;
        }
      }

      // Sort by price proximity
      if (price_cents) {
        fallbackProducts.sort((a, b) => {
          const diffA = Math.abs((a.price_cents || 0) - price_cents);
          const diffB = Math.abs((b.price_cents || 0) - price_cents);
          return diffA - diffB;
        });
      }

      matches = fallbackProducts.slice(0, Math.min(limit, 8)).map(p => ({
        id: p.id,
        title: p.title,
        price_cents: p.price_cents,
        currency: p.currency || 'AED',
        media_url: p.media_urls?.[0] || '',
        category_slug: p.category_slug,
        brand_name: (p.brands as any)?.name || null,
        match_score: 0.01, // Indicate this is a fallback match
      }));
    }

    console.log(`[deals-match-catalog] Found ${matches.length} matches (scored: ${scoredProducts.length}, top score: ${matches[0]?.match_score.toFixed(2) || 0})`);

    const response: MatchCatalogResponse = {
      success: true,
      matches,
      total_found: scoredProducts.length || matches.length,
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
