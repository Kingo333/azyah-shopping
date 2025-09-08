import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const productId = formData.get('productId') as string

    if (!file || !productId) {
      return new Response(JSON.stringify({ error: 'Missing file or productId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get product and check if it has outfit
    const { data: productOutfit, error: productError } = await supabase
      .from('product_outfit_assets')
      .select('outfit_image_url, brand_id')
      .eq('product_id', productId)
      .single()

    if (productError || !productOutfit) {
      return new Response(JSON.stringify({ error: 'Product outfit not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Upload person image to private storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tryon-persons')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create try-on job
    const { data: jobData, error: jobError } = await supabase
      .from('ai_tryon_jobs')
      .insert({
        user_id: user.id,
        person_image_id: uploadData.path,
        outfit_image_url: productOutfit.outfit_image_url,
        status: 'pending'
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      return new Response(JSON.stringify({ error: 'Failed to create try-on job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Start the try-on process
    const { data: personSignedUrl } = await supabase.storage
      .from('tryon-persons')
      .createSignedUrl(uploadData.path, 3600) // 1 hour expiry

    if (!personSignedUrl?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call the BitStudio try-on function
    const { data: tryonResult, error: tryonError } = await supabase.functions.invoke('bitstudio-tryon', {
      body: {
        person_image_url: personSignedUrl.signedUrl,
        outfit_image_url: productOutfit.outfit_image_url
      }
    })

    if (tryonError) {
      console.error('Try-on error:', tryonError)
      // Update job status to failed
      await supabase
        .from('ai_tryon_jobs')
        .update({ 
          status: 'failed', 
          error: tryonError.message || 'Try-on failed'
        })
        .eq('id', jobData.id)

      return new Response(JSON.stringify({ error: 'Try-on failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      jobId: jobData.id,
      status: 'queued'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error in tryon-start function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})