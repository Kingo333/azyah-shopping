import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EnhancedAxessoClient } from '../shared/enhanced-axesso-client.ts';
import { AXESSO } from '../shared/axesso-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UltraLightRequest {
  markets: string[];
  keywords: string[];
  pagesPerKeyword?: number;
  maxProducts?: number;
}

interface UltraLightResult {
  imported: number;
  rejected: number;
  duplicates: number;
  errors: number;
  metrics: {
    searchRequests: number;
    detailRequests: number;
    productsFound: number;
    duration: number;
    successRate: number;
  };
  results: Array<{
    url?: string;
    sku?: string;
    title?: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    score?: number;
    reason?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🚀 Starting ultra-light ASOS import');
    
    // Get auth header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Initialize Supabase with user auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Initialize Axesso client with conservative settings
    const axessoClient = new EnhancedAxessoClient({
      primary: AXESSO.primary,
      secondary: AXESSO.secondary,
      maxRpm: 30, // Very conservative
      maxConcurrency: 2, // Ultra-low concurrency
      timeoutMs: 15000, // Short timeout per request
      searchCacheExpiry: AXESSO.searchCacheExpiry,
      detailsCacheExpiry: AXESSO.detailsCacheExpiry
    });

    // Parse request
    const body: UltraLightRequest = await req.json();
    const { markets, keywords, pagesPerKeyword = 1, maxProducts = 10 } = body;

    console.log(`Ultra-light import: ${markets.length} markets, ${keywords.length} keywords, max ${maxProducts} products`);

    // Get user's retailer
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (retailerError || !retailer) {
      throw new Error('No retailer found for authenticated user. Please create a retailer account first.');
    }

    const retailerId = retailer.id;

    // Validate and normalize markets
    const validMarkets = markets
      .map(m => m.toLowerCase().trim())
      .filter(m => ['us', 'de', 'co.uk'].includes(m));

    if (validMarkets.length === 0) {
      throw new Error('No valid markets provided. Supported: us, de, co.uk');
    }

    console.log(`Using valid markets: ${validMarkets.join(', ')}`);

    const result: UltraLightResult = {
      imported: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      metrics: {
        searchRequests: 0,
        detailRequests: 0,
        productsFound: 0,
        duration: 0,
        successRate: 0
      },
      results: []
    };

    const startTime = Date.now();
    let processedProducts = 0;
    const seenUrls = new Set<string>();

    // Ultra-conservative processing: limit total operations
    const maxSearchOperations = Math.min(validMarkets.length * keywords.length * pagesPerKeyword, 6);
    let searchOperations = 0;

    console.log(`Will perform max ${maxSearchOperations} search operations`);

    // Search and process immediately (no bulk collection)
    outerLoop: for (const market of validMarkets) {
      for (const keyword of keywords) {
        for (let page = 1; page <= pagesPerKeyword; page++) {
          if (searchOperations >= maxSearchOperations || processedProducts >= maxProducts) {
            console.log(`Stopping: operations=${searchOperations}/${maxSearchOperations}, products=${processedProducts}/${maxProducts}`);
            break outerLoop;
          }

          try {
            searchOperations++;
            result.metrics.searchRequests++;
            
            console.log(`🔍 Searching: ${keyword} in ${market} page ${page}`);
            const searchResult = await axessoClient.searchProducts(market, keyword, page);
            
            if (!searchResult?.searchProductDetails?.length) {
              console.log(`❌ No products found for ${keyword} in ${market} page ${page}`);
              continue;
            }

            console.log(`✅ Found ${searchResult.searchProductDetails.length} products`);

            // Process first few products immediately
            const productsToProcess = searchResult.searchProductDetails
              .slice(0, Math.min(3, maxProducts - processedProducts))
              .filter(p => p.dpUrl && !seenUrls.has(p.dpUrl));

            for (const product of productsToProcess) {
              if (processedProducts >= maxProducts) break;

              seenUrls.add(product.dpUrl);
              
              try {
                result.metrics.detailRequests++;
                console.log(`Processing URL: ${product.dpUrl}`);
                
                const details = await axessoClient.fetchProductDetails(product.dpUrl);
                
                if (!details) {
                  result.errors++;
                  result.results.push({
                    url: product.dpUrl,
                    status: 'error',
                    reason: 'Failed to fetch product details'
                  });
                  continue;
                }

                // Basic quality check
                const hasTitle = details.productTitle?.trim().length > 0;
                const hasPrice = details.price > 0;
                const hasImage = details.imageUrlList?.length > 0 || details.mainImage?.imageUrl;
                
                if (!hasTitle || !hasPrice) {
                  result.rejected++;
                  result.results.push({
                    url: product.dpUrl,
                    title: details.productTitle,
                    status: 'rejected',
                    reason: `Missing ${!hasTitle ? 'title' : 'price'}`
                  });
                  continue;
                }

                // Check for duplicates
                const { data: existing } = await supabase
                  .from('products')
                  .select('id')
                  .eq('external_url', product.dpUrl)
                  .maybeSingle();

                if (existing) {
                  result.duplicates++;
                  result.results.push({
                    url: product.dpUrl,
                    title: details.productTitle,
                    status: 'duplicate',
                    reason: 'Product already exists'
                  });
                  continue;
                }

                // Basic category mapping
                let categorySlug = 'clothing';
                let subcategorySlug = 'tops';
                
                const title = details.productTitle.toLowerCase();
                if (title.includes('dress') || title.includes('abaya')) {
                  subcategorySlug = title.includes('abaya') ? 'abayas' : 'dresses';
                } else if (title.includes('shoe') || title.includes('sneaker') || title.includes('boot')) {
                  categorySlug = 'footwear';
                  subcategorySlug = 'sneakers';
                } else if (title.includes('bag') || title.includes('wallet')) {
                  categorySlug = 'accessories';
                  subcategorySlug = 'handbags';
                }

                // Create product
                const productData = {
                  title: details.productTitle.slice(0, 255),
                  description: details.productDescription?.slice(0, 1000) || null,
                  price_cents: Math.round(details.price * 100),
                  currency: 'USD',
                  external_url: product.dpUrl,
                  image_url: details.mainImage?.imageUrl || details.imageUrlList?.[0] || null,
                  media_urls: details.imageUrlList ? JSON.stringify(details.imageUrlList.slice(0, 5)) : '[]',
                  category_slug: categorySlug,
                  subcategory_slug: subcategorySlug,
                  retailer_id: retailerId,
                  sku: `asos-${details.productId || Date.now()}`,
                  status: 'active',
                  is_external: true,
                  source: 'axesso-ultra',
                  source_imported_at: new Date().toISOString()
                };

                const { error: insertError } = await supabase
                  .from('products')
                  .insert(productData);

                if (insertError) {
                  console.error(`Failed to insert product ${product.dpUrl}:`, insertError);
                  result.errors++;
                  result.results.push({
                    url: product.dpUrl,
                    title: details.productTitle,
                    status: 'error',
                    reason: 'Database insert failed'
                  });
                } else {
                  result.imported++;
                  result.results.push({
                    url: product.dpUrl,
                    title: details.productTitle,
                    status: 'imported',
                    score: hasImage ? 0.8 : 0.6
                  });
                  processedProducts++;
                  console.log(`✅ Imported: ${details.productTitle}`);
                }

                // Small delay between products
                await new Promise(resolve => setTimeout(resolve, 200));

              } catch (error) {
                console.error(`Error processing URL ${product.dpUrl}:`, error);
                result.errors++;
                result.results.push({
                  url: product.dpUrl,
                  status: 'error',
                  reason: error.message || 'Processing error'
                });
              }
            }

            // Delay between searches
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.error(`Search failed for ${keyword} in ${market} page ${page}:`, error);
            result.errors++;
            result.results.push({
              status: 'error',
              reason: `Search failed: ${error.message}`
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    result.metrics.duration = duration;
    result.metrics.productsFound = seenUrls.size;
    result.metrics.successRate = result.metrics.detailRequests > 0 
      ? ((result.imported + result.duplicates) / result.metrics.detailRequests) * 100 
      : 0;

    console.log(`Ultra-light import completed: ${result.imported} imported, ${result.errors} errors, ${duration}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ultra-light import error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      imported: 0,
      rejected: 0,
      duplicates: 0,
      errors: 1,
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});