import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function upgradeAsosImageUrl(url: string, minWid = 1500): string {
  try {
    const ASOS_HOSTS = ['images.asos-media.com', 'asos-media.com'];
    const urlObj = new URL(url);
    
    if (!ASOS_HOSTS.some(h => urlObj.hostname.endsWith(h))) return url;

    // Strip existing macros
    urlObj.pathname = urlObj.pathname.replace(/\$[^$]*\$/g, '');

    // Upgrade width
    const currentWid = Number(urlObj.searchParams.get('wid') || '0');
    const targetWid = Math.max(currentWid || 0, minWid);
    urlObj.searchParams.set('wid', String(targetWid));

    // Set quality parameters
    urlObj.searchParams.set('fit', 'constrain');
    urlObj.searchParams.set('fmt', 'jpg');
    urlObj.searchParams.set('qlt', '90');
    urlObj.searchParams.set('resmode', 'sharp2');
    urlObj.searchParams.set('bg', 'fff');
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let processed = 0;
    let updated = 0;
    let offset = 0;
    const limit = 100;
    
    console.log('Starting ASOS image URL backfill...');
    
    while (true) {
      // Fetch products in batches
      const { data: products, error } = await supabase
        .from('products')
        .select('id, media_urls, image_url, source')
        .eq('is_external', true)
        .in('source', ['ASOS_AXESSO', 'ASOS_AXESSO_BULK'])
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching products:', error);
        break;
      }

      if (!products || products.length === 0) {
        console.log('No more products to process');
        break;
      }

      for (const product of products) {
        processed++;
        let needsUpdate = false;
        const updates: any = {};

        // Upgrade media_urls if present
        if (product.media_urls && Array.isArray(product.media_urls)) {
          const upgradedMedia = product.media_urls.map((url: string) => 
            upgradeAsosImageUrl(url, 1500)
          );
          
          // Check if any URLs were actually changed
          const hasChanges = upgradedMedia.some((url, i) => url !== product.media_urls[i]);
          if (hasChanges) {
            updates.media_urls = upgradedMedia;
            needsUpdate = true;
          }
        }

        // Upgrade image_url if present
        if (product.image_url) {
          const upgradedImage = upgradeAsosImageUrl(product.image_url, 1500);
          if (upgradedImage !== product.image_url) {
            updates.image_url = upgradedImage;
            needsUpdate = true;
          }
        }

        // Update if needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('products')
            .update(updates)
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError);
          } else {
            updated++;
            console.log(`Updated product ${product.id}`);
          }
        }
      }

      offset += limit;
      
      // Log progress
      if (processed % 500 === 0) {
        console.log(`Processed ${processed} products, updated ${updated}`);
      }
    }

    const result = {
      success: true,
      processed,
      updated,
      message: `Backfill completed. Processed ${processed} products, updated ${updated} with high-res URLs.`
    };

    console.log(result.message);
    
    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});