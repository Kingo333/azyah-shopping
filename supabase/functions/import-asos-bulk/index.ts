import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { AXESSO, normalizeMarket } from '../shared/axesso-config.ts';
import { EnhancedAxessoClient } from '../shared/enhanced-axesso-client.ts';
import { transformAxessoToAzyah, calculateQualityScore } from '../shared/axesso-transformer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkImportRequest {
  markets: string[];
  keywords: string[];
  pagesPerKeyword?: number;
}

interface ImportResult {
  imported: number;
  rejected: number;
  duplicates: number;
  errors: number;
  metrics: {
    totalProcessed: number;
    processingTimeMs: number;
    searchTimeMs: number;
    transformTimeMs: number;
  };
  results: Array<{
    sku: string;
    title: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    reason?: string;
    qualityScore?: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('🚀 Starting bulk ASOS import process');
    
    // Get auth header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Initialize Supabase client with user auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Initialize Axesso client
    const axessoClient = new EnhancedAxessoClient(AXESSO);
    
    // Parse request body
    const { markets, keywords, pagesPerKeyword = 1 }: BulkImportRequest = await req.json();
    
    console.log(`📝 Import config: ${markets.length} markets, ${keywords.length} keywords, ${pagesPerKeyword} pages per keyword`);
    
    const startTime = Date.now();
    let searchTimeMs = 0;
    let transformTimeMs = 0;
    
    // Get user's retailer
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();
      
    if (retailerError || !retailer) {
      throw new Error('No retailer found for authenticated user. Please create a retailer account first.');
    }
    
    console.log(`🏪 Using retailer ID: ${retailer.id}`);
    
    // Filter and normalize markets to valid domain codes
    const validMarkets = markets
      .map(normalizeMarket)
      .filter((m): m is NonNullable<typeof m> => m !== null);
    
    console.log(`Normalized markets: ${validMarkets.join(', ')}`);
    
    if (validMarkets.length === 0) {
      throw new Error(`No valid markets provided. Supported markets: us, co.uk, de. Received: ${markets.join(', ')}`);
    }
    
    // Calculate total search operations to prevent timeouts
    const totalSearches = validMarkets.length * keywords.length * pagesPerKeyword;
    console.log(`🔍 Total searches planned: ${totalSearches}`);
    
    // Limit batch size to prevent timeouts (Edge Functions have ~150s limit)
    if (totalSearches > 30) {
      throw new Error(`Batch too large (${totalSearches} searches). Please reduce markets, keywords, or pages per keyword to stay under 30 total searches.`);
    }
    
    // Perform bulk search and hydration with normalized markets
    const searchStart = Date.now();
    console.log(`🔍 Starting search for ${validMarkets.length} markets x ${keywords.length} keywords x ${pagesPerKeyword} pages`);
    
    let fetchedProducts: any[] = [];
    let metrics: any = { searchRequests: 0, detailRequests: 0, productsFound: 0 };
    
    try {
      const result = await axessoClient.bulkSearchAndHydrate(
        validMarkets,
        keywords,
        pagesPerKeyword
      );
      fetchedProducts = result.products || [];
      metrics = result.metrics || metrics;
    } catch (searchError) {
      console.error('💥 Search/hydration failed:', searchError);
      
      // Handle timeout/network errors gracefully
      if (searchError.message.includes('AbortError') || searchError.message.includes('timeout')) {
        throw new Error('API request timed out. Try reducing the number of markets, keywords, or pages per keyword.');
      }
      
      throw new Error(`Search failed: ${searchError.message}`);
    }
    
    searchTimeMs = Date.now() - searchStart;
    
    console.log(`🔍 Fetched ${fetchedProducts.length} products in ${searchTimeMs}ms`);
    
    // Extract UI-compatible metrics from client
    const searchRequests = Number(metrics?.searchRequests ?? 0);
    const detailRequests = Number(metrics?.detailRequests ?? fetchedProducts.length ?? 0);
    const productsFound = Number(metrics?.productsFound ?? fetchedProducts.length ?? 0);
    
    const result: ImportResult = {
      imported: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      metrics: {
        totalProcessed: fetchedProducts.length,
        processingTimeMs: 0,
        searchTimeMs,
        transformTimeMs: 0
      },
      results: []
    };
    
    // Process each product
    const transformStart = Date.now();
    
    for (const product of fetchedProducts) {
      try {
        console.log(`🔄 Processing: ${product.title?.substring(0, 50)}...`);
        
        // Transform product data
        const transformedProduct = transformAxessoToAzyah(product, retailer.id);
        
        if (!transformedProduct) {
          result.rejected++;
          result.results.push({
            sku: product.asin || 'unknown',
            title: product.title || 'Unknown Product',
            status: 'rejected',
            reason: 'Failed transformation validation'
          });
          continue;
        }
        
        // Calculate quality score
        const qualityScore = calculateQualityScore(transformedProduct);
        
        // Reject low quality products
        if (qualityScore < 0.6) {
          result.rejected++;
          result.results.push({
            sku: transformedProduct.sku,
            title: transformedProduct.title,
            status: 'rejected',
            reason: `Low quality score: ${qualityScore.toFixed(2)}`,
            qualityScore
          });
          continue;
        }
        
        // Check for duplicates
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('sku', transformedProduct.sku)
          .single();
          
        if (existingProduct) {
          result.duplicates++;
          result.results.push({
            sku: transformedProduct.sku,
            title: transformedProduct.title,
            status: 'duplicate',
            reason: 'Product already exists',
            qualityScore
          });
          continue;
        }
        
        // Get or create brand
        let brandId: string | null = null;
        if (transformedProduct.brand) {
          let { data: brand } = await supabase
            .from('brands')
            .select('id')
            .eq('slug', transformedProduct.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
            .single();
            
          if (!brand) {
            const { data: newBrand, error: brandError } = await supabase
              .from('brands')
              .insert({
                name: transformedProduct.brand,
                slug: transformedProduct.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              })
              .select('id')
              .single();
              
            if (!brandError && newBrand) {
              brand = newBrand;
            }
          }
          
          brandId = brand?.id || null;
        }
        
        // Insert into staging table
        const { error: stagingError } = await supabase
          .from('import_products_staging')
          .insert({
            title: transformedProduct.title,
            description: transformedProduct.description,
            price_cents: transformedProduct.price_cents,
            currency: transformedProduct.currency,
            external_url: transformedProduct.external_url,
            images: transformedProduct.media_urls,
            suggested_category: transformedProduct.category_slug,
            suggested_subcategory: transformedProduct.subcategory_slug,
            suggested_attributes: transformedProduct.attributes,
            extracted_data: {
              brand: transformedProduct.brand,
              qualityScore,
              originalData: product
            },
            job_id: '00000000-0000-0000-0000-000000000000' // Placeholder for bulk imports
          });
          
        if (stagingError) {
          console.error(`❌ Staging error for ${transformedProduct.sku}:`, stagingError);
          result.errors++;
          result.results.push({
            sku: transformedProduct.sku,
            title: transformedProduct.title,
            status: 'error',
            reason: `Staging error: ${stagingError.message}`,
            qualityScore
          });
          continue;
        }
        
        // Insert final product
        const { error: productError } = await supabase
          .from('products')
          .insert({
            sku: transformedProduct.sku,
            title: transformedProduct.title,
            description: transformedProduct.description,
            price_cents: transformedProduct.price_cents,
            currency: transformedProduct.currency,
            image_url: transformedProduct.image_url,
            media_urls: transformedProduct.media_urls,
            external_url: transformedProduct.external_url,
            category_slug: transformedProduct.category_slug,
            subcategory_slug: transformedProduct.subcategory_slug,
            attributes: transformedProduct.attributes,
            brand_id: brandId,
            retailer_id: retailer.id,
             source: 'ASOS_AXESSO_BULK',
             source_vendor: 'ASOS',
            is_external: true,
            status: 'active'
          });
          
        if (productError) {
          console.error(`❌ Product error for ${transformedProduct.sku}:`, productError);
          result.errors++;
          result.results.push({
            sku: transformedProduct.sku,
            title: transformedProduct.title,
            status: 'error',
            reason: `Product insert error: ${productError.message}`,
            qualityScore
          });
          continue;
        }
        
         result.imported++;
         result.results.push({
           sku: transformedProduct.sku,
           title: transformedProduct.title,
           status: 'imported',
           qualityScore,
           url: transformedProduct.external_url
         });
        
      } catch (error) {
        console.error(`❌ Error processing product:`, error);
        result.errors++;
        result.results.push({
          sku: product.asin || 'unknown',
          title: product.title || 'Unknown Product',
          status: 'error',
          reason: error.message
        });
      }
    }
    
    transformTimeMs = Date.now() - transformStart;
    result.metrics.transformTimeMs = transformTimeMs;
    result.metrics.processingTimeMs = Date.now() - startTime;
    
    // Calculate UI-compatible metrics
    const duration = result.metrics.processingTimeMs;
    const totalProcessed = result.imported + result.rejected + result.duplicates + result.errors;
    const successRate = totalProcessed > 0 ? Number(((result.imported / totalProcessed) * 100).toFixed(1)) : 0;
    
    // Build UI-compatible response
    const responsePayload = {
      imported: result.imported,
      rejected: result.rejected,
      duplicates: result.duplicates,
      errors: result.errors,
      metrics: {
        searchRequests,
        detailRequests,
        productsFound,
        duration,
        successRate
      },
      results: result.results.map(r => ({
        ...r,
        url: r.url || r.sku || 'unknown',
        score: r.qualityScore
      }))
    };
    
    console.log(`✅ Import completed: ${result.imported} imported, ${result.rejected} rejected, ${result.duplicates} duplicates, ${result.errors} errors`);
    
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('💥 Bulk import error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        imported: 0,
        rejected: 0,
        duplicates: 0,
        errors: 1,
        metrics: {
          searchRequests: 0,
          detailRequests: 0,
          productsFound: 0,
          duration: 0,
          successRate: 0
        },
        results: []
      }), 
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});