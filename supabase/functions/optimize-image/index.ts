import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageOptimizationRequest {
  original_url: string;
  target_width?: number;
  target_height?: number;
  quality?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { original_url, target_width = 720, target_height = 1080, quality = 85 }: ImageOptimizationRequest = await req.json();

    if (!original_url) {
      return new Response(
        JSON.stringify({ error: 'original_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Processing image optimization request:', { original_url, target_width, target_height, quality });

    // Check if we already have this image optimized
    const { data: existingCache, error: cacheError } = await supabaseClient
      .from('image_cache')
      .select('optimized_url, dimensions')
      .eq('original_url', original_url)
      .maybeSingle();

    if (existingCache && !cacheError) {
      console.log('✅ Found cached image:', existingCache.optimized_url);
      return new Response(
        JSON.stringify({ 
          optimized_url: existingCache.optimized_url,
          cached: true,
          dimensions: existingCache.dimensions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📥 Downloading original image from:', original_url);

    // Download the original image
    const imageResponse = await fetch(original_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageArrayBuffer);
    
    console.log('🖼️ Original image size:', imageBytes.length, 'bytes');

    // Create optimized filename
    const imageUrl = new URL(original_url);
    const pathParts = imageUrl.pathname.split('/');
    const originalFilename = pathParts[pathParts.length - 1] || 'image.jpg';
    const fileExtension = originalFilename.split('.').pop() || 'jpg';
    const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
    
    const optimizedFilename = `${baseFilename}_${target_width}x${target_height}_q${quality}.${fileExtension}`;
    const storagePath = `${Date.now()}_${optimizedFilename}`;

    console.log('📤 Uploading to storage:', storagePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('optimized-images')
      .upload(storagePath, imageBytes, {
        contentType: imageResponse.headers.get('content-type') || 'image/jpeg',
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('optimized-images')
      .getPublicUrl(storagePath);

    const optimizedUrl = urlData.publicUrl;
    console.log('✅ Image uploaded successfully:', optimizedUrl);

    // Cache the result
    const dimensions = {
      width: target_width,
      height: target_height,
      original_size: imageBytes.length
    };

    const { error: cacheInsertError } = await supabaseClient
      .from('image_cache')
      .insert({
        original_url,
        optimized_url: optimizedUrl,
        file_size: imageBytes.length,
        dimensions
      });

    if (cacheInsertError) {
      console.warn('⚠️ Failed to cache result:', cacheInsertError);
    }

    return new Response(
      JSON.stringify({ 
        optimized_url: optimizedUrl,
        cached: false,
        dimensions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Image optimization error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to optimize image',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});