import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { searchQuery, imageUrl, maxResults = 10 } = await req.json();

    if (!searchQuery && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Either searchQuery or imageUrl is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Google Shopping search request:', { searchQuery, imageUrl, maxResults });

    // First, search our own catalog
    let catalogResults = [];
    try {
      let query = supabaseClient
        .from('products')
        .select(`
          *,
          brand:brands(*)
        `)
        .eq('status', 'active')
        .limit(maxResults);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: products, error } = await query;
      
      if (!error && products) {
        catalogResults = products.map(product => ({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price_cents / 100,
          currency: product.currency || 'USD',
          image_url: product.media_urls?.[0] || null,
          brand: product.brand?.name || 'Unknown',
          external_url: product.external_url,
          source: 'catalog'
        }));
      }
    } catch (error) {
      console.error('Error searching catalog:', error);
    }

    // Note: Google Shopping API integration would require API keys
    // For now, we'll return catalog results and placeholder external results
    const externalResults = [
      {
        id: 'ext-1',
        title: `Similar ${searchQuery || 'Fashion Item'} - Designer Brand`,
        description: 'High-quality fashion item from external retailer',
        price: 89.99,
        currency: 'USD',
        image_url: '/placeholder.svg',
        brand: 'External Brand',
        external_url: 'https://example-retailer.com/product',
        source: 'external'
      },
      {
        id: 'ext-2',
        title: `${searchQuery || 'Fashion Item'} - Premium Collection`,
        description: 'Premium fashion item from partner store',
        price: 129.99,
        currency: 'USD',
        image_url: '/placeholder.svg',
        brand: 'Partner Brand',
        external_url: 'https://example-partner.com/product',
        source: 'external'
      }
    ];

    // Combine and sort results
    const allResults = [
      ...catalogResults,
      ...externalResults.slice(0, Math.max(0, maxResults - catalogResults.length))
    ];

    console.log(`Returning ${allResults.length} total results`);

    return new Response(
      JSON.stringify({
        success: true,
        results: allResults,
        total: allResults.length,
        sources: {
          catalog: catalogResults.length,
          external: allResults.length - catalogResults.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Google Shopping search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});