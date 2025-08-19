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

// Image optimization function using Canvas API
async function optimizeImageData(
  imageBuffer: ArrayBuffer, 
  options: { targetWidth: number; targetHeight: number; quality: number }
): Promise<Uint8Array> {
  const { targetWidth, targetHeight, quality } = options;
  
  // Create a blob from the image buffer
  const blob = new Blob([imageBuffer]);
  const imageUrl = URL.createObjectURL(blob);
  
  try {
    // Load image in a way that works in Deno
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    // Calculate optimal dimensions maintaining aspect ratio
    const aspectRatio = img.width / img.height;
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    
    if (aspectRatio > 1) {
      // Landscape: fit by width
      finalHeight = Math.round(targetWidth / aspectRatio);
    } else {
      // Portrait: fit by height  
      finalWidth = Math.round(targetHeight * aspectRatio);
    }
    
    // Create canvas for image processing
    const canvas = new OffscreenCanvas(finalWidth, finalHeight);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw and resize image
    ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
    
    // Apply image enhancements
    const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
    enhanceImageData(imageData);
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob with specified quality
    const optimizedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality / 100
    });
    
    // Convert blob to Uint8Array
    const optimizedBuffer = await optimizedBlob.arrayBuffer();
    return new Uint8Array(optimizedBuffer);
    
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

// Enhance image data with improved contrast, saturation, and sharpness
function enhanceImageData(imageData: ImageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply slight contrast boost (1.1x)
    r = Math.min(255, Math.max(0, (r - 128) * 1.1 + 128));
    g = Math.min(255, Math.max(0, (g - 128) * 1.1 + 128));
    b = Math.min(255, Math.max(0, (b - 128) * 1.1 + 128));
    
    // Apply saturation boost (1.15x)
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    r = Math.min(255, Math.max(0, gray + (r - gray) * 1.15));
    g = Math.min(255, Math.max(0, gray + (g - gray) * 1.15));
    b = Math.min(255, Math.max(0, gray + (b - gray) * 1.15));
    
    // Apply slight brightness boost (1.05x)
    r = Math.min(255, r * 1.05);
    g = Math.min(255, g * 1.05);
    b = Math.min(255, b * 1.05);
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
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
    let imageBytes = new Uint8Array(imageArrayBuffer);
    
    console.log('🖼️ Original image size:', imageBytes.length, 'bytes');

    // Process image for optimization (resize and enhance quality)
    try {
      const optimizedImageData = await optimizeImageData(imageArrayBuffer, {
        targetWidth,
        targetHeight,
        quality
      });
      imageBytes = optimizedImageData;
      console.log('✨ Image optimized, new size:', imageBytes.length, 'bytes');
    } catch (error) {
      console.warn('⚠️ Image optimization failed, using original:', error);
      // Keep original imageBytes if optimization fails
    }

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