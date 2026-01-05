import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // 'outfit' or 'item'
    const id = url.searchParams.get('id');
    
    console.log(`[share-meta] Request for type=${type}, id=${id}`);
    
    if (!type || !id) {
      console.log('[share-meta] Missing type or id');
      return new Response('Missing type or id', { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let title = 'Azyah Style';
    let description = 'Discover fashion on Azyah Style';
    let image = 'https://azyahstyle.com/og-image.png';
    const baseUrl = 'https://azyahstyle.com';
    const shareUrl = `${baseUrl}/share/${type}/${id}`;

    if (type === 'outfit') {
      // Fetch outfit data
      const { data: fit, error: fitError } = await supabaseClient
        .from('fits')
        .select('id, title, render_path, image_preview, user_id, is_public')
        .eq('id', id)
        .eq('is_public', true)
        .single();

      console.log(`[share-meta] Outfit query result:`, fit, fitError);

      if (fit) {
        // Get creator info
        const { data: user } = await supabaseClient
          .from('users_public')
          .select('username, name')
          .eq('id', fit.user_id)
          .single();

        const creatorName = user?.username || user?.name || 'a stylist';
        title = fit.title ? `${fit.title} - Outfit by ${creatorName}` : `Outfit by ${creatorName}`;
        description = `Check out this outfit created by ${creatorName} on Azyah Style`;
        
        // Get image - ensure it's an absolute URL
        const outfitImage = fit.render_path || fit.image_preview;
        if (outfitImage) {
          if (outfitImage.startsWith('http')) {
            image = outfitImage;
          } else {
            image = `${baseUrl}${outfitImage}`;
          }
        }
        console.log(`[share-meta] Outfit found: ${title}, image: ${image}`);
      } else {
        console.log('[share-meta] Outfit not found or not public');
      }
    } else if (type === 'item') {
      // Fetch item data
      const { data: item, error: itemError } = await supabaseClient
        .from('wardrobe_items')
        .select('id, brand, category, image_url, image_bg_removed_url, source_vendor_name')
        .eq('id', id)
        .single();

      console.log(`[share-meta] Item query result:`, item, itemError);

      if (item) {
        const displayName = item.brand || item.source_vendor_name || item.category || 'Fashion Item';
        title = `${displayName} - Azyah Style`;
        description = `Check out this ${item.category || 'fashion item'} on Azyah Style`;
        
        // Get image - ensure it's an absolute URL
        const itemImage = item.image_bg_removed_url || item.image_url;
        if (itemImage) {
          if (itemImage.startsWith('http')) {
            image = itemImage;
          } else {
            image = `${baseUrl}${itemImage}`;
          }
        }
        console.log(`[share-meta] Item found: ${title}, image: ${image}`);
      } else {
        console.log('[share-meta] Item not found');
      }
    }

    // Return HTML with meta tags
    // Bots will read the meta tags, browsers will be redirected via JS
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="Azyah Style">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(shareUrl)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <!-- Redirect browsers to the actual SPA page -->
  <script>window.location.replace("${escapeHtml(shareUrl)}");</script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(shareUrl)}">
  </noscript>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(shareUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

    console.log(`[share-meta] Returning HTML with title: ${title}`);

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('[share-meta] Error:', error);
    // Fallback redirect to home
    return new Response(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=https://azyahstyle.com"></head><body>Redirecting...</body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
