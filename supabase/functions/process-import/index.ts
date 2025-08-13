import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, userId, sourceId, productUrls } = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing import for ${productUrls.length} URLs from ${domain}`);

    // Create import job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        source_id: sourceId,
        status: 'running',
        pages_crawled: productUrls.length,
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create import job: ${jobError.message}`);
    }

    console.log('Created import job:', job.id);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Process each URL
    for (const url of productUrls) {
      try {
        console.log('Processing URL:', url);

        // Call product extractor
        const extractorResponse = await fetch(`${supabaseUrl}/functions/v1/product-extractor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ url }),
        });

        if (!extractorResponse.ok) {
          throw new Error(`Extractor failed for ${url}`);
        }

        const extractorResult = await extractorResponse.json();
        
        if (!extractorResult.success) {
          throw new Error(`Extraction failed: ${extractorResult.error}`);
        }

        const product = extractorResult.product;

        // Simple category suggestion based on title
        const suggestCategory = (title: string) => {
          const titleLower = title.toLowerCase();
          
          if (titleLower.includes('dress') || titleLower.includes('gown')) return 'clothing';
          if (titleLower.includes('abaya') || titleLower.includes('kaftan')) return 'modestwear';
          if (titleLower.includes('shoe') || titleLower.includes('boot') || titleLower.includes('sandal')) return 'footwear';
          if (titleLower.includes('bag') || titleLower.includes('purse') || titleLower.includes('wallet')) return 'accessories';
          if (titleLower.includes('necklace') || titleLower.includes('ring') || titleLower.includes('earring')) return 'jewelry';
          if (titleLower.includes('perfume') || titleLower.includes('fragrance') || titleLower.includes('cologne')) return 'beauty';
          if (titleLower.includes('hijab') || titleLower.includes('scarf')) return 'modestwear';
          
          return 'clothing'; // default
        };

        const suggestSubcategory = (title: string, category: string) => {
          const titleLower = title.toLowerCase();
          
          if (category === 'clothing') {
            if (titleLower.includes('dress')) return 'dresses';
            if (titleLower.includes('top') || titleLower.includes('blouse')) return 'tops';
            if (titleLower.includes('shirt')) return 'shirts';
            if (titleLower.includes('jean') || titleLower.includes('denim')) return 'jeans';
            if (titleLower.includes('trouser') || titleLower.includes('pant')) return 'trousers';
            return 'tops'; // default
          }
          
          if (category === 'footwear') {
            if (titleLower.includes('heel')) return 'heels';
            if (titleLower.includes('flat')) return 'flats';
            if (titleLower.includes('sandal')) return 'sandals';
            if (titleLower.includes('sneaker') || titleLower.includes('trainer')) return 'sneakers';
            if (titleLower.includes('boot')) return 'boots';
            return 'flats'; // default
          }
          
          return null;
        };

        const suggestedCategory = suggestCategory(product.title);
        const suggestedSubcategory = suggestSubcategory(product.title, suggestedCategory);

        // Save to staging table
        const { error: stagingError } = await supabase
          .from('import_products_staging')
          .insert({
            job_id: job.id,
            external_url: product.external_url,
            title: product.title,
            description: product.description,
            price_cents: product.price_cents,
            currency: product.currency,
            images: product.images,
            extracted_data: product.extracted_data,
            suggested_category: suggestedCategory,
            suggested_subcategory: suggestedSubcategory,
            suggested_attributes: {
              brand: product.brand,
              sku: product.sku,
              gender_target: 'unisex', // default
            },
          });

        if (stagingError) {
          throw new Error(`Failed to save to staging: ${stagingError.message}`);
        }

        successCount++;
        console.log(`Successfully processed: ${url}`);

      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
        errors.push(`${url}: ${error.message}`);
        failureCount++;
      }

      // Add delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        products_extracted: successCount,
        error_log: errors.length > 0 ? errors.join('\n') : null,
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    // Update source last crawl time
    await supabase
      .from('import_sources')
      .update({ last_crawl_at: new Date().toISOString() })
      .eq('id', sourceId);

    console.log(`Import job completed. Success: ${successCount}, Failures: ${failureCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      jobId: job.id,
      productsExtracted: successCount,
      totalProcessed: productUrls.length,
      errors: errors.slice(0, 10) // Limit error details
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process import:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});