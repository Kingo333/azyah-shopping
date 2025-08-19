import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EnhancedAxessoClient } from '../shared/enhanced-axesso-client.ts';
import { AXESSO } from '../shared/axesso-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsyncImportRequest {
  markets: string[];
  keywords: string[];
  pagesPerKeyword?: number;
  useChunked?: boolean;
}

interface JobStatusResponse {
  jobId: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'POST') {
      // Start new import job
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user from auth header
      const { data: user, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !user?.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body: AsyncImportRequest = await req.json();
      
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('import_job_status')
        .insert({
          user_id: user.user.id,
          job_type: 'asos_bulk_import',
          status: 'pending',
          config: body,
          progress: 0
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Failed to create job:', jobError);
        return new Response(JSON.stringify({ error: 'Failed to create import job' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Start background processing
      const jobId = job.id;
      console.log(`Starting async import job ${jobId}`);
      
      // Use background task to handle the import
      EdgeRuntime.waitUntil(processImportJob(jobId, body, supabase));

      return new Response(JSON.stringify({ 
        jobId,
        status: 'started',
        message: 'Import job has been queued for processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'GET') {
      // Get job status
      const url = new URL(req.url);
      const jobId = url.searchParams.get('jobId');
      
      if (!jobId) {
        return new Response(JSON.stringify({ error: 'jobId parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: job, error: jobError } = await supabase
        .from('import_job_status')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const response: JobStatusResponse = {
        jobId: job.id,
        status: job.status,
        progress: job.progress || 0,
        result: job.result,
        error: job.error_message
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Async import error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processImportJob(jobId: string, config: AsyncImportRequest, supabase: any) {
  try {
    console.log(`Processing import job ${jobId}`);
    
    // Update job status to running
    await supabase
      .from('import_job_status')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        progress: 5 
      })
      .eq('id', jobId);

    // Initialize Axesso client
    const axessoClient = new EnhancedAxessoClient({
      primary: AXESSO.primary,
      secondary: AXESSO.secondary,
      maxRpm: 30,
      maxConcurrency: 3,
      timeoutMs: 20000,
      searchCacheExpiry: AXESSO.searchCacheExpiry,
      detailsCacheExpiry: AXESSO.detailsCacheExpiry
    });

    // Ensure ASOS retailer exists
    const { data: retailer } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', 'ASOS')
      .maybeSingle();

    let retailerId = retailer?.id;
    if (!retailerId) {
      const { data: newRetailer, error: retailerError } = await supabase
        .from('retailers')
        .insert({ name: 'ASOS', slug: 'asos' })
        .select('id')
        .single();

      if (retailerError) {
        throw new Error('Failed to create ASOS retailer');
      }
      retailerId = newRetailer.id;
    }

    // Update progress
    await supabase
      .from('import_job_status')
      .update({ progress: 10 })
      .eq('id', jobId);

    // Validate markets
    const validMarkets = config.markets
      .map(m => m.toLowerCase().trim())
      .filter(m => ['us', 'de', 'co.uk'].includes(m));

    if (validMarkets.length === 0) {
      throw new Error('No valid markets provided. Supported: us, de, co.uk');
    }

    const result = {
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
    const totalOperations = validMarkets.length * config.keywords.length * (config.pagesPerKeyword || 3);
    let completedOperations = 0;
    const seenUrls = new Set<string>();

    // Process in manageable chunks
    for (const market of validMarkets) {
      for (const keyword of config.keywords) {
        for (let page = 1; page <= (config.pagesPerKeyword || 3); page++) {
          try {
            result.metrics.searchRequests++;
            
            const searchResult = await axessoClient.searchProducts(market, keyword, page);
            
            if (!searchResult?.searchProductDetails?.length) {
              console.log(`No products found for ${keyword} in ${market} page ${page}`);
              completedOperations++;
              continue;
            }

            // Process products
            const productsToProcess = searchResult.searchProductDetails
              .slice(0, 5) // Limit products per search
              .filter(p => p.dpUrl && !seenUrls.has(p.dpUrl));

            for (const product of productsToProcess) {
              seenUrls.add(product.dpUrl);
              
              try {
                result.metrics.detailRequests++;
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

                // Quality check
                const hasTitle = details.productTitle?.trim().length > 0;
                const hasPrice = details.price > 0;
                
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

                // Create product
                const productData = {
                  title: details.productTitle.slice(0, 255),
                  description: details.productDescription?.slice(0, 1000) || null,
                  price_cents: Math.round(details.price * 100),
                  currency: 'USD',
                  external_url: product.dpUrl,
                  image_url: details.mainImage?.imageUrl || details.imageUrlList?.[0] || null,
                  media_urls: details.imageUrlList ? JSON.stringify(details.imageUrlList.slice(0, 5)) : '[]',
                  category_slug: 'clothing',
                  subcategory_slug: 'tops',
                  retailer_id: retailerId,
                  sku: `asos-${details.productId || Date.now()}`,
                  status: 'active',
                  is_external: true,
                  source: 'axesso-async',
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
                    score: 0.8
                  });
                }

                // Small delay between products
                await new Promise(resolve => setTimeout(resolve, 500));

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

            completedOperations++;
            
            // Update progress
            const progress = Math.min(10 + Math.round((completedOperations / totalOperations) * 85), 95);
            await supabase
              .from('import_job_status')
              .update({ progress })
              .eq('id', jobId);

            // Delay between searches
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            console.error(`Search failed for ${keyword} in ${market} page ${page}:`, error);
            result.errors++;
            completedOperations++;
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

    // Update job as completed
    await supabase
      .from('import_job_status')
      .update({ 
        status: 'completed',
        progress: 100,
        result,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Import job ${jobId} completed: ${result.imported} imported, ${result.errors} errors`);

  } catch (error) {
    console.error(`Import job ${jobId} failed:`, error);
    
    // Update job as failed
    await supabase
      .from('import_job_status')
      .update({ 
        status: 'failed',
        error_message: error.message || 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}