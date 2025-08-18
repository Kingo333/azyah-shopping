import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { AxessoClient } from '../../../src/lib/axesso-client.ts';
import { transformAxessoToAzyah, calculateQualityScore } from '../../../src/lib/axesso-transformer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  urls: string[];
}

interface ImportResult {
  imported: number;
  rejected_low_quality: number;
  duplicates: number;
  errors: number;
  details: Array<{
    url: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    reason?: string;
    score?: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const primaryKey = Deno.env.get('AXESSO_PRIMARY_KEY');
    const secondaryKey = Deno.env.get('AXESSO_SECONDARY_KEY');

    if (!primaryKey || !secondaryKey) {
      return new Response(
        JSON.stringify({ error: 'Axesso API keys not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { urls }: ImportRequest = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'urls array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get retailer ID for retailer@test.com
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('owner_user_id', '768c1f7a-b99e-4c58-b6bd-1f9aec7da813')
      .single();

    if (retailerError || !retailer) {
      return new Response(
        JSON.stringify({ error: 'Retailer not found for retailer@test.com' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const retailerId = retailer.id;

    // Initialize Axesso client
    const axessoClient = new AxessoClient({
      primaryKey,
      secondaryKey,
    });

    // Process URLs in batches of 10
    const batchSize = 10;
    const result: ImportResult = {
      imported: 0,
      rejected_low_quality: 0,
      duplicates: 0,
      errors: 0,
      details: [],
    };

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          console.log(`Processing URL: ${url}`);
          
          // Fetch product data from Axesso
          const axessoData = await axessoClient.fetchProductDetails(url);
          
          if (!axessoData) {
            return {
              url,
              status: 'error' as const,
              reason: 'Product not found (404)',
            };
          }

          // Transform to Azyah format
          const transformedProduct = transformAxessoToAzyah(axessoData, retailerId);
          
          if (!transformedProduct) {
            return {
              url,
              status: 'rejected' as const,
              reason: 'Failed validation (missing required fields)',
            };
          }

          // Calculate quality score
          const qualityScore = calculateQualityScore(transformedProduct);
          
          if (qualityScore < 60) {
            return {
              url,
              status: 'rejected' as const,
              reason: `Low quality score: ${qualityScore}/100`,
              score: qualityScore,
            };
          }

          // Check for duplicates
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('sku', transformedProduct.sku)
            .eq('retailer_id', retailerId)
            .maybeSingle();

          if (existingProduct) {
            return {
              url,
              status: 'duplicate' as const,
              reason: 'Product already exists',
            };
          }

          // Create or get brand
          let brandId: string | null = null;
          if (transformedProduct.brand_name) {
            const { data: existingBrand } = await supabase
              .from('brands')
              .select('id')
              .eq('name', transformedProduct.brand_name)
              .maybeSingle();

            if (existingBrand) {
              brandId = existingBrand.id;
            } else {
              // Create new brand
              const { data: newBrand, error: brandError } = await supabase
                .from('brands')
                .insert({
                  name: transformedProduct.brand_name,
                  slug: transformedProduct.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  owner_user_id: '768c1f7a-b99e-4c58-b6bd-1f9aec7da813', // retailer@test.com user ID
                })
                .select('id')
                .single();

              if (brandError) {
                console.error('Error creating brand:', brandError);
                brandId = null;
              } else {
                brandId = newBrand.id;
              }
            }
          }

          // Insert into import_products_staging
          const stagingProduct = {
            title: transformedProduct.title,
            price_cents: transformedProduct.price_cents,
            compare_at_price_cents: transformedProduct.compare_at_price_cents,
            currency: transformedProduct.currency,
            images: transformedProduct.media_urls,
            suggested_category: transformedProduct.category_slug,
            suggested_subcategory: transformedProduct.subcategory_slug,
            suggested_attributes: transformedProduct.attributes,
            external_url: transformedProduct.external_url,
            description: transformedProduct.description,
            extracted_data: {
              brand_name: transformedProduct.brand_name,
              source: transformedProduct.source,
              source_vendor: transformedProduct.source_vendor,
              is_external: transformedProduct.is_external,
              quality_score: qualityScore,
              original_url: url,
              axesso_data: axessoData,
            },
            job_id: crypto.randomUUID(), // Generate a unique job ID for this import
          };

          const { error: stagingError } = await supabase
            .from('import_products_staging')
            .insert(stagingProduct);

          if (stagingError) {
            console.error('Error inserting into staging:', stagingError);
            return {
              url,
              status: 'error' as const,
              reason: `Staging error: ${stagingError.message}`,
            };
          }

          // Promote to products table
          const productData = {
            title: transformedProduct.title,
            sku: transformedProduct.sku,
            price_cents: transformedProduct.price_cents,
            compare_at_price_cents: transformedProduct.compare_at_price_cents,
            currency: transformedProduct.currency,
            category_slug: transformedProduct.category_slug,
            subcategory_slug: transformedProduct.subcategory_slug,
            attributes: transformedProduct.attributes,
            media_urls: transformedProduct.media_urls,
            external_url: transformedProduct.external_url,
            description: transformedProduct.description,
            brand_id: brandId,
            retailer_id: retailerId,
            tags: transformedProduct.tags,
            status: 'active',
            stock_qty: transformedProduct.is_external ? 999 : 0, // Assume external products are in stock
          };

          const { error: productError } = await supabase
            .from('products')
            .insert(productData);

          if (productError) {
            console.error('Error inserting product:', productError);
            return {
              url,
              status: 'error' as const,
              reason: `Product insertion error: ${productError.message}`,
            };
          }

          console.log(`Successfully imported product: ${transformedProduct.title}`);

          return {
            url,
            status: 'imported' as const,
            score: qualityScore,
          };

        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
          return {
            url,
            status: 'error' as const,
            reason: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      for (const batchResult of batchResults) {
        result.details.push(batchResult);
        
        switch (batchResult.status) {
          case 'imported':
            result.imported++;
            break;
          case 'rejected':
            result.rejected_low_quality++;
            break;
          case 'duplicate':
            result.duplicates++;
            break;
          case 'error':
            result.errors++;
            break;
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('Import completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});