import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[vto-gemini] Processing job:', jobId);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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

    // Return immediately, process in background
    const processJob = async () => {
      try {
        await admin
          .from('event_tryon_jobs')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', jobId);

    // 2. Create signed URLs for input images
    console.log('[vto-gemini] Creating signed URLs for paths:', {
      person: job.input_person_path,
      outfit: job.input_outfit_path
    });

    const [personResult, outfitResult] = await Promise.all([
      admin.storage.from('event-user-photos').createSignedUrl(job.input_person_path, 120),
      admin.storage.from('event-assets').createSignedUrl(job.input_outfit_path, 120)
    ]);

    if (!personResult.data?.signedUrl) {
      throw new Error(`Failed to create person signed URL. Error: ${personResult.error?.message}`);
    }
    if (!outfitResult.data?.signedUrl) {
      throw new Error(`Failed to create outfit signed URL. Error: ${outfitResult.error?.message}`);
    }

    console.log('[vto-gemini] Signed URLs created successfully');

    // 3. Fetch images as base64
    const [personImg, outfitImg] = await Promise.all([
      fetch(personResult.data.signedUrl).then(r => r.arrayBuffer()),
      fetch(outfitResult.data.signedUrl).then(r => r.arrayBuffer())
    ]);

    const personB64 = btoa(
      String.fromCharCode(...new Uint8Array(personImg))
    );
    const outfitB64 = btoa(
      String.fromCharCode(...new Uint8Array(outfitImg))
    );

    console.log('[vto-gemini] Images fetched and encoded');

    // 4. Call Gemini API with strict instructions
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
      
      await admin
        .from('event_tryon_jobs')
        .update({
          status: 'failed',
          error: `Gemini API error: ${errorText}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      return new Response(
        JSON.stringify({ error: 'Gemini API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiResult = await geminiResponse.json();
    console.log('[vto-gemini] Gemini response received');

    // 5. Extract base64 image from response
    const imageData = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!imageData) {
      throw new Error('No image data in Gemini response');
    }

    // 6. Upload result to storage
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

    console.log('[vto-gemini] Result uploaded to:', outputPath);

        // 7. Update job status
        await admin
          .from('event_tryon_jobs')
          .update({
            status: 'succeeded',
            output_path: outputPath,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        console.log('[vto-gemini] Job completed successfully');

      } catch (error: any) {
        console.error('[vto-gemini] Background processing error:', error);
        
        await admin
          .from('event_tryon_jobs')
          .update({
            status: 'failed',
            error: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    };

    // Fire and forget
    processJob();

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
