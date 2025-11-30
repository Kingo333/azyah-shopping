import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase 1: Outfit image caching
const outfitCache = new Map<string, { b64: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Phase 3: Simple job queue with rate limiting
const jobQueue: string[] = [];
let processingCount = 0;
const MAX_CONCURRENT_GEMINI_CALLS = 15; // Optimized for 200 concurrent shoppers

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig: {
    responseMimeType: string;
  };
}

async function getCachedOutfit(outfitPath: string, storage: any): Promise<string> {
  // Check cache
  const cached = outfitCache.get(outfitPath);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log('[vto-gemini] ✓ Using cached outfit:', outfitPath);
    return cached.b64;
  }

  // Fetch and cache
  console.log('[vto-gemini] ⚡ Fetching and caching outfit:', outfitPath);
  const { data: outfitResult, error } = await storage
    .from('event-assets')
    .createSignedUrl(outfitPath, 300);
  
  if (!outfitResult?.signedUrl || error) {
    throw new Error(`Failed to create outfit signed URL: ${error?.message}`);
  }

  const outfitImg = await fetch(outfitResult.signedUrl).then(r => r.arrayBuffer());
  const outfitB64 = btoa(String.fromCharCode(...new Uint8Array(outfitImg)));
  
  outfitCache.set(outfitPath, { b64: outfitB64, timestamp: Date.now() });
  console.log('[vto-gemini] ✓ Outfit cached, cache size:', outfitCache.size);
  
  return outfitB64;
}

async function processJobInBackground(jobId: string, admin: any) {
  try {
    await admin
      .from('event_tryon_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    const { data: job } = await admin
      .from('event_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      throw new Error('Job not found');
    }

    console.log('[vto-gemini] Processing job:', jobId, {
      person: job.input_person_path,
      outfit: job.input_outfit_path
    });

    // Fetch person image (always fresh)
    const { data: personResult, error: personError } = await admin.storage
      .from('event-user-photos')
      .createSignedUrl(job.input_person_path, 300);

    if (!personResult?.signedUrl || personError) {
      throw new Error(`Failed to create person signed URL: ${personError?.message}`);
    }

    const personImg = await fetch(personResult.signedUrl).then(r => r.arrayBuffer());
    const personB64 = btoa(String.fromCharCode(...new Uint8Array(personImg)));

    // Get outfit from cache (Phase 1 optimization)
    const outfitB64 = await getCachedOutfit(job.input_outfit_path, admin.storage);

    console.log('[vto-gemini] Images ready, calling Gemini API');

    // Call Gemini API
    const prompt = `You are a professional virtual try-on system. Generate a photorealistic image of the person wearing the outfit.

STRICT REQUIREMENTS:
1. MATTING: Extract the person from their image with transparent background
2. GARMENT ISOLATION: Isolate the outfit from the second image
3. POSE ALIGNMENT: Warp and align the garment to match the person's body pose and perspective
4. COMPOSITE: Place the garment naturally on the person with realistic shadows and lighting
5. PRESERVE IDENTITY: Do NOT alter the person's face, body shape, or identity
6. OUTPUT: Return a single PNG image with transparent background at 1024x1024

Focus on natural fit and photorealism.`;

    const geminiPayload: GeminiRequest = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: personB64
              }
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: outfitB64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'image/png'
      }
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[vto-gemini] Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiResult = await geminiResponse.json();
    const imageData = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!imageData) {
      throw new Error('No image data in Gemini response');
    }

    // Upload result to storage
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const blob = new Blob([imageBytes], { type: 'image/png' });
    
    const outputPath = `${job.event_id}/${job.user_id}/${job.product_id}_${Date.now()}.png`;
    
    const { error: uploadError } = await admin.storage
      .from('event-tryon-renders')
      .upload(outputPath, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[vto-gemini] ✓ Job completed:', jobId);

    // Update job status (triggers realtime notification)
    await admin
      .from('event_tryon_jobs')
      .update({
        status: 'succeeded',
        output_path: outputPath,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

  } catch (error: any) {
    console.error('[vto-gemini] ✗ Job failed:', jobId, error);
    
    await admin
      .from('event_tryon_jobs')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

async function processQueue(admin: any) {
  while (jobQueue.length > 0 && processingCount < MAX_CONCURRENT_GEMINI_CALLS) {
    const jobId = jobQueue.shift();
    if (!jobId) continue;
    
    processingCount++;
    console.log(`[vto-gemini] Queue: ${processingCount}/${MAX_CONCURRENT_GEMINI_CALLS} active, ${jobQueue.length} waiting`);
    
    processJobInBackground(jobId, admin)
      .finally(() => {
        processingCount--;
        processQueue(admin); // Process next
      });
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 SECURITY: Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated
    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[vto-gemini] Processing job:', jobId, 'for user:', user.id);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 🔒 SECURITY: Verify job ownership
    const { data: jobOwnerCheck, error: ownerError } = await admin
      .from('event_tryon_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (ownerError || !jobOwnerCheck) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobOwnerCheck.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - job does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Load job + validate
    const { data: job, error: jobError } = await admin
      .from('event_tryon_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add to queue and process (Phase 3: Rate limiting)
    jobQueue.push(jobId);
    processQueue(admin);

    return new Response(
      JSON.stringify({ ok: true, jobId, message: 'Job queued for processing' }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[vto-gemini] Request error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
