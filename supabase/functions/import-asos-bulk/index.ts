import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { transformAxessoToAzyah, calculateQualityScore } from "../shared/axesso-transformer.ts";
import { EnhancedAxessoClient } from "../shared/enhanced-axesso-client.ts";

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
  metrics: any;
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting bulk ASOS import...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check feature flag (using features.ts approach)
    // axessoImportBulk flag should be enabled in features.ts
    console.log('Bulk import feature check: axessoImportBulk should be enabled in features.ts');

    // Parse request
    const body: BulkImportRequest = await req.json();
    if (!body.markets?.length || !body.keywords?.length) {
      return new Response(JSON.stringify({ error: 'Markets and keywords are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize enhanced Axesso client
    const axessoClient = new EnhancedAxessoClient({
      primaryKey: Deno.env.get('AXESSO_PRIMARY_KEY') ?? '',
      secondaryKey: Deno.env.get('AXESSO_SECONDARY_KEY') ?? '',
      maxRpm: parseInt(Deno.env.get('AXESSO_MAX_RPM') ?? '50'),
      maxConcurrency: parseInt(Deno.env.get('AXESSO_MAX_CONCURRENCY') ?? '5'),
      timeout: parseInt(Deno.env.get('AXESSO_TIMEOUT_MS') ?? '8000'),
      searchCacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
      detailsCacheExpiry: 12 * 60 * 60 * 1000, // 12 hours
    });

    // Get or create retailer for retailer@test.com
    let { data: retailers } = await supabase
      .from('retailers')
      .select('id')
      .eq('owner_user_id', (
        await supabase
          .from('users')
          .select('id')
          .eq('email', 'retailer@test.com')
          .single()
      ).data?.id)
      .single();

    if (!retailers) {
      // Create retailer if it doesn't exist
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'retailer@test.com')
        .single();

      if (!user) {
        throw new Error('retailer@test.com user not found');
      }

      const { data: newRetailer } = await supabase
        .from('retailers')
        .insert({
          name: 'ASOS Aggregated Retailer',
          slug: 'asos-aggregated-retailer',
          owner_user_id: user.id,
          bio: 'Aggregated ASOS products via Axesso API'
        })
        .select('id')
        .single();

      retailers = newRetailer;
    }

    const retailerId = retailers!.id;

    // Bulk search and hydrate
    console.log('Starting bulk search and hydrate...');
    const { products, metrics } = await axessoClient.bulkSearchAndHydrate(
      body.markets,
      body.keywords,
      body.pagesPerKeyword ?? 5
    );

    console.log(`Found ${products.length} products, processing...`);

    const result: ImportResult = {
      imported: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      metrics,
      results: []
    };

    // Process each product
    for (const axessoProduct of products) {
      try {
        const transformed = transformAxessoToAzyah(axessoProduct, retailerId);
        if (!transformed) {
          result.rejected++;
          result.results.push({
            url: axessoProduct.url,
            status: 'rejected',
            reason: 'Transformation failed'
          });
          continue;
        }

        // Calculate quality score
        const qualityScore = calculateQualityScore(transformed);
        if (qualityScore < 60) {
          result.rejected++;
          result.results.push({
            url: axessoProduct.url,
            status: 'rejected',
            score: qualityScore,
            reason: 'Quality score too low'
          });
          continue;
        }

        // Check for duplicates
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('sku', transformed.sku)
          .eq('retailer_id', retailerId)
          .single();

        if (existing) {
          result.duplicates++;
          result.results.push({
            url: axessoProduct.url,
            status: 'duplicate',
            score: qualityScore
          });
          continue;
        }

        // Ensure brand exists
        let brandId = null;
        if (transformed.brand_name) {
          const { data: existingBrand } = await supabase
            .from('brands')
            .select('id')
            .eq('name', transformed.brand_name)
            .single();

          if (existingBrand) {
            brandId = existingBrand.id;
          } else {
            const { data: newBrand } = await supabase
              .from('brands')
              .insert({
                name: transformed.brand_name,
                slug: transformed.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                owner_user_id: (await supabase
                  .from('users')
                  .select('id')
                  .eq('email', 'retailer@test.com')
                  .single()).data?.id
              })
              .select('id')
              .single();
            brandId = newBrand?.id;
          }
        }

        // Insert into staging first
        const stagingProduct = {
          ...transformed,
          brand_id: brandId,
          is_external: true,
          source: 'ASOS_AXESSO_BULK',
          source_vendor: 'ASOS',
          source_imported_at: new Date().toISOString(),
          status: 'pending'
        };

        const { error: stagingError } = await supabase
          .from('import_products_staging')
          .insert(stagingProduct);

        if (stagingError) {
          throw stagingError;
        }

        // Insert into products table
        const { error: productError } = await supabase
          .from('products')
          .insert({
            ...stagingProduct,
            status: 'active'
          });

        if (productError) {
          throw productError;
        }

        result.imported++;
        result.results.push({
          url: axessoProduct.url,
          status: 'imported',
          score: qualityScore
        });

      } catch (error) {
        result.errors++;
        result.results.push({
          url: axessoProduct.url,
          status: 'error',
          reason: error.message
        });
        console.error(`Error processing product ${axessoProduct.url}:`, error);
      }
    }

    console.log(`Bulk import completed: ${result.imported} imported, ${result.rejected} rejected, ${result.duplicates} duplicates, ${result.errors} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});