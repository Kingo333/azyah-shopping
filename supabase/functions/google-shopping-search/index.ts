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
    console.log('Environment check - SERPER_API_KEY exists:', !!Deno.env.get('SERPER_API_KEY'));

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

    // External search via Serper.dev API (Google Shopping / Lens)
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    let externalResults: Array<{
      id: string;
      title: string;
      description?: string;
      price: number;
      currency: string;
      image_url: string | null;
      brand: string;
      external_url: string;
      source: string;
    }> = [];

    try {
      if (serperApiKey) {
        let serperUrl = '';
        let requestBody: any = {};
        
        if (imageUrl) {
          serperUrl = 'https://google.serper.dev/lens';
          requestBody = { url: imageUrl };
        } else if (searchQuery) {
          serperUrl = 'https://google.serper.dev/shopping';
          requestBody = { q: searchQuery, num: maxResults };
        }

        if (serperUrl) {
          const serperRes = await fetch(serperUrl, {
            method: 'POST',
            headers: {
              'X-API-KEY': serperApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!serperRes.ok) throw new Error(`Serper.dev HTTP ${serperRes.status}`);
          const serperData = await serperRes.json();

          console.log('Serper.dev response:', JSON.stringify(serperData, null, 2));

          const items: any[] = serperData.shopping || serperData.visual || [];
          externalResults = items.slice(0, maxResults).map((item, idx) => {
            const priceStr: string = item.price || '';
            const parsed = (() => {
              const m = typeof priceStr === 'string' ? priceStr.match(/([A-Z]{3}|\$|£|€)?\s*([\d,.]+)/) : null;
              const amount = m ? parseFloat(m[2].replace(/,/g, '')) : 0;
              let currency = 'USD';
              if (m && m[1]) {
                const symbol = m[1];
                currency = symbol.length === 3 ? symbol : ({ '$': 'USD', '£': 'GBP', '€': 'EUR' } as any)[symbol] || 'USD';
              }
              return { amount, currency };
            })();

            return {
              id: String(item.productId || item.position || idx),
              title: item.title || 'Product',
              description: item.snippet || '',
              price: parsed.amount,
              currency: parsed.currency,
              image_url: item.imageUrl || null,
              brand: item.source || 'External',
              external_url: item.link || '#',
              source: 'external'
            };
          });
        }
      } else {
        console.warn('SERPER_API_KEY is not set; returning only catalog results');
      }
    } catch (e) {
      console.error('Serper.dev fetch error:', e);
      // fallback to empty; catalog results will still show
      externalResults = [];
    }

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