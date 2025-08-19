import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { AXESSO, normalizeMarket } from '../shared/axesso-config.ts';
import { EnhancedAxessoClient } from '../shared/enhanced-axesso-client.ts';
import { transformAxessoToAzyah, calculateQualityScore } from '../shared/axesso-transformer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkedImportRequest {
  markets: string[];
  keywords: string[];
  pagesPerKeyword?: number;
  chunkSize?: number;
  resumeFromChunk?: number;
}

interface ChunkedImportResult {
  imported: number;
  rejected: number;
  duplicates: number;
  errors: number;
  totalChunks: number;
  completedChunks: number;
  metrics: {
    searchRequests: number;
    detailRequests: number;
    productsFound: number;
    duration: number;
    successRate: number;
  };
  results: Array<{
    url: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    score?: number;
    reason?: string;
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
    console.log('🚀 Starting chunked ASOS import process');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Axesso client with conservative settings
    const axessoClient = new EnhancedAxessoClient({
      ...AXESSO,
      maxConcurrency: 2, // Reduce concurrency for chunked processing
      timeoutMs: 20000,  // Shorter timeout per request
    });
    
    // Parse request body
    const { 
      markets, 
      keywords, 
      pagesPerKeyword = 1,
      chunkSize = 5,
      resumeFromChunk = 0
    }: ChunkedImportRequest = await req.json();
    
    console.log(`📝 Chunked import config: ${markets.length} markets, ${keywords.length} keywords, ${pagesPerKeyword} pages, chunk size: ${chunkSize}`);
    
    const startTime = Date.now();
    
    // Get or create retailer record
    let { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('slug', 'asos')
      .single();
      
    if (retailerError || !retailer) {
      console.log('📦 Creating ASOS retailer record');
      const { data: newRetailer, error: createError } = await supabase
        .from('retailers')
        .insert({
          name: 'ASOS',
          slug: 'asos',
          website: 'https://www.asos.com',
          bio: 'Global fashion retailer',
          owner_user_id: null
        })
        .select('id')
        .single();
        
      if (createError || !newRetailer) {
        throw new Error(`Failed to create retailer: ${createError?.message}`);
      }
      retailer = newRetailer;
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
    
    // Create search tasks (market + keyword + page combinations)
    const searchTasks: Array<{market: string, keyword: string, page: number}> = [];
    
    for (const market of validMarkets) {
      for (const keyword of keywords) {
        for (let page = 1; page <= pagesPerKeyword; page++) {
          searchTasks.push({ market, keyword, page });
        }
      }
    }
    
    const totalChunks = Math.ceil(searchTasks.length / chunkSize);
    console.log(`📊 Created ${searchTasks.length} search tasks, ${totalChunks} chunks`);
    
    // Initialize result tracking
    const result: ChunkedImportResult = {
      imported: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      totalChunks,
      completedChunks: 0,
      metrics: {
        searchRequests: 0,
        detailRequests: 0,
        productsFound: 0,
        duration: 0,
        successRate: 0
      },
      results: []
    };
    
    let allProducts: any[] = [];
    let totalSearchRequests = 0;
    let totalDetailRequests = 0;
    
    // Process chunks sequentially to avoid overwhelming the API
    for (let chunkIndex = resumeFromChunk; chunkIndex < totalChunks; chunkIndex++) {
      const chunkStart = chunkIndex * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, searchTasks.length);
      const chunk = searchTasks.slice(chunkStart, chunkEnd);
      
      console.log(`🔄 Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} searches)`);
      
      try {
        // Process searches in this chunk
        for (const task of chunk) {
          try {
            console.log(`🔍 Searching: ${task.keyword} in ${task.market} page ${task.page}`);
            
            const searchResult = await axessoClient.searchProducts(
              task.market,
              task.keyword,
              task.page,
              20 // Limit results per page
            );
            
            totalSearchRequests++;
            
            if (searchResult?.searchProductDetails) {
              console.log(`✅ Found ${searchResult.searchProductDetails.length} products`);
              
              // Fetch details for each product in this search result
              for (const product of searchResult.searchProductDetails) {
                if (product.dpUrl) {
                  try {
                    const details = await axessoClient.fetchProductDetails(product.dpUrl);
                    totalDetailRequests++;
                    
                    if (details) {
                      allProducts.push(details);
                    }
                  } catch (detailError) {
                    console.warn(`⚠️ Failed to fetch details for ${product.dpUrl}:`, detailError.message);
                    result.errors++;
                  }
                }
              }
            }
            
            // Add a small delay between searches to be respectful
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (searchError) {
            console.warn(`⚠️ Search failed for ${task.keyword} in ${task.market}:`, searchError.message);
            result.errors++;
          }
        }
        
        result.completedChunks++;
        
        // Check if we're approaching timeout (120 seconds max for edge functions)
        const elapsed = Date.now() - startTime;
        if (elapsed > 100000) { // 100 seconds safety margin
          console.log(`⏰ Approaching timeout, stopping at chunk ${chunkIndex + 1}`);
          break;
        }
        
      } catch (chunkError) {
        console.error(`❌ Chunk ${chunkIndex + 1} failed:`, chunkError);
        result.errors++;
      }
    }
    
    // Deduplicate products by URL/ASIN
    const uniqueProducts = allProducts.reduce((unique, product) => {
      const key = product.dpUrl || product.asin || product.productTitle;
      if (key && !unique.some(p => (p.dpUrl || p.asin || p.productTitle) === key)) {
        unique.push(product);
      }
      return unique;
    }, []);
    
    console.log(`🔍 Found ${allProducts.length} total, ${uniqueProducts.length} unique products`);
    
    result.metrics.searchRequests = totalSearchRequests;
    result.metrics.detailRequests = totalDetailRequests;
    result.metrics.productsFound = uniqueProducts.length;
    
    // Process unique products for import
    for (const product of uniqueProducts.slice(0, 50)) { // Limit to 50 products per run
      try {
        console.log(`🔄 Processing: ${product.productTitle?.substring(0, 50)}...`);
        
        // Transform product data
        const transformedProduct = transformAxessoToAzyah(product, retailer.id);
        
        if (!transformedProduct) {
          result.rejected++;
          result.results.push({
            url: product.dpUrl || 'unknown',
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
            url: transformedProduct.external_url || product.dpUrl || 'unknown',
            status: 'rejected',
            reason: `Low quality score: ${qualityScore.toFixed(2)}`,
            score: qualityScore
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
            url: transformedProduct.external_url || product.dpUrl || 'unknown',
            status: 'duplicate',
            reason: 'Product already exists',
            score: qualityScore
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
            job_id: '00000000-0000-0000-0000-000000000000'
          });
          
        if (stagingError) {
          console.error(`❌ Staging error for ${transformedProduct.sku}:`, stagingError);
          result.errors++;
          result.results.push({
            url: transformedProduct.external_url || product.dpUrl || 'unknown',
            status: 'error',
            reason: `Staging error: ${stagingError.message}`,
            score: qualityScore
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
            source: 'ASOS_AXESSO_CHUNKED',
            source_vendor: 'ASOS',
            is_external: true,
            status: 'active'
          });
          
        if (productError) {
          console.error(`❌ Product error for ${transformedProduct.sku}:`, productError);
          result.errors++;
          result.results.push({
            url: transformedProduct.external_url || product.dpUrl || 'unknown',
            status: 'error',
            reason: `Product insert error: ${productError.message}`,
            score: qualityScore
          });
          continue;
        }
        
        result.imported++;
        result.results.push({
          url: transformedProduct.external_url || product.dpUrl || 'unknown',
          status: 'imported',
          score: qualityScore
        });
        
      } catch (error) {
        console.error(`❌ Error processing product:`, error);
        result.errors++;
        result.results.push({
          url: product.dpUrl || 'unknown',
          status: 'error',
          reason: error.message
        });
      }
    }
    
    // Calculate final metrics
    const duration = Date.now() - startTime;
    const totalProcessed = result.imported + result.rejected + result.duplicates + result.errors;
    const successRate = totalProcessed > 0 ? Number(((result.imported / totalProcessed) * 100).toFixed(1)) : 0;
    
    result.metrics.duration = duration;
    result.metrics.successRate = successRate;
    
    console.log(`✅ Chunked import completed: ${result.imported} imported, ${result.rejected} rejected, ${result.duplicates} duplicates, ${result.errors} errors`);
    console.log(`📊 Completed ${result.completedChunks}/${result.totalChunks} chunks in ${duration}ms`);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('💥 Chunked import error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        imported: 0,
        rejected: 0,
        duplicates: 0,
        errors: 1,
        totalChunks: 0,
        completedChunks: 0,
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