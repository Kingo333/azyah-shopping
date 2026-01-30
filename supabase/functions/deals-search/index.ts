import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
  price: string;
  extracted_price: number | null;
  rating?: number;
  reviews?: number;
  position: number;
}

interface DealsResponse {
  success: boolean;
  query: string;
  shopping_results: ShoppingResult[];
  price_stats: {
    low: number | null;
    median: number | null;
    high: number | null;
    valid_count: number;
  };
  deals_found: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!SERPAPI_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

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

    const { q, sort_by } = await req.json();

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query (q) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deals-search] Searching for user ${user.id}: "${q}"`);

    // Call Google Shopping via SerpApi
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: q.trim(),
      api_key: SERPAPI_KEY,
      gl: 'ae',  // UAE default
      hl: 'en',
      location: 'United Arab Emirates',
    });

    // Add sort if specified (1 = price low to high, 2 = price high to low)
    if (sort_by === 1 || sort_by === 2) {
      params.set('tbs', sort_by === 1 ? 'p_ord:p' : 'p_ord:pd');
    }

    const shoppingResponse = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const shoppingData = await shoppingResponse.json();

    if (shoppingData.error) {
      throw new Error(`Shopping API error: ${shoppingData.error}`);
    }

    const shoppingResults: ShoppingResult[] = (shoppingData.shopping_results || [])
      .slice(0, 30)
      .map((result: any, index: number) => ({
        title: result.title || '',
        link: result.link || '',
        thumbnail: result.thumbnail || '',
        source: result.source || '',
        price: result.price || '',
        extracted_price: result.extracted_price || null,
        rating: result.rating || undefined,
        reviews: result.reviews || undefined,
        position: index + 1,
      }));

    console.log(`[deals-search] Found ${shoppingResults.length} results`);

    // Compute price statistics with guardrails
    const validPrices = shoppingResults
      .map(r => r.extracted_price)
      .filter((p): p is number => p !== null && p > 0);

    let priceStats = {
      low: null as number | null,
      median: null as number | null,
      high: null as number | null,
      valid_count: validPrices.length,
    };

    if (validPrices.length >= 5) {
      const sorted = [...validPrices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      
      // Remove outliers
      const filtered = sorted.filter(p => p >= median * 0.1 && p <= median * 5);
      
      if (filtered.length >= 5) {
        priceStats.low = filtered[Math.floor(filtered.length * 0.25)];
        priceStats.median = filtered[Math.floor(filtered.length * 0.5)];
        priceStats.high = filtered[Math.floor(filtered.length * 0.75)];
      }
    }

    // Sort by price if not already sorted by API
    if (!sort_by) {
      shoppingResults.sort((a, b) => {
        if (a.extracted_price === null) return 1;
        if (b.extracted_price === null) return -1;
        return a.extracted_price - b.extracted_price;
      });
    }

    const response: DealsResponse = {
      success: true,
      query: q.trim(),
      shopping_results: shoppingResults,
      price_stats: priceStats,
      deals_found: shoppingResults.length,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deals-search] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        shopping_results: [],
        price_stats: { low: null, median: null, high: null, valid_count: 0 },
        deals_found: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
