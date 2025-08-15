
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json()
    const { toyReplicaId, sourceUrl, test } = body
    console.log('Processing request:', { toyReplicaId, sourceUrl, test })

    // Handle test requests for configuration check
    if (test) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Toy Replica functionality is properly configured' 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!toyReplicaId || !sourceUrl) {
      throw new Error('toyReplicaId and sourceUrl are required')
    }

    // Get the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get the uploaded image from storage
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from('toy-replica-source')
      .download(sourceUrl.replace('toy-replica-source/', ''))

    if (downloadError) {
      throw new Error(`Failed to download source image: ${downloadError.message}`)
    }

    // Convert image to base64
    const imageBuffer = await imageData.arrayBuffer()
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // The embedded LEGO generation prompt
    const prompt = `Create a LEGO mini-figure version of the person in the uploaded photo, wearing the exact same outfit, accessories, and hairstyle. Replicate all clothing details, patterns, and colors exactly, including any printed text on clothing, denim styles, jewelry, headwear, phone case designs, handbags, or boots.The LEGO figure should mimic the identical facial expression, stance, and pose as the person in the image, while holding the same objects in the same way.Maintain realistic LEGO proportions and brick-like textures while ensuring accurate color matching to the original photo.Render with a transparent background and no shadows so it can be used in various layouts. The style should be consistent with authentic LEGO mini-figure aesthetics.`

    // Call OpenAI Images API
    const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        background: "transparent",
        output_format: "png",
        image: imageBase64
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`)
    }

    const result = await openaiResponse.json()
    console.log('OpenAI response received')

    // Convert base64 to buffer and upload to result bucket
    const resultImageBuffer = Uint8Array.from(atob(result.data[0].b64_json), c => c.charCodeAt(0))
    const resultFileName = `${toyReplicaId}-result.png`

    const { error: uploadError } = await supabaseClient.storage
      .from('toy-replica-result')
      .upload(resultFileName, resultImageBuffer, {
        contentType: 'image/png'
      })

    if (uploadError) {
      throw new Error(`Failed to upload result: ${uploadError.message}`)
    }

    // Get public URL for result
    const { data: urlData } = supabaseClient.storage
      .from('toy-replica-result')
      .getPublicUrl(resultFileName)

    const resultUrl = urlData.publicUrl

    // Update database record
    const { error: updateError } = await supabaseClient
      .from('toy_replicas')
      .update({
        result_url: resultUrl,
        status: 'succeeded',
        updated_at: new Date().toISOString()
      })
      .eq('id', toyReplicaId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(`Failed to update record: ${updateError.message}`)
    }

    console.log('Toy replica generated successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        resultUrl,
        toyReplicaId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in generate-toy-replica:', error)

    // Try to update the record status to failed if we have the necessary info
    try {
      const body = await req.json().catch(() => ({}))
      const { toyReplicaId } = body
      if (toyReplicaId && !body.test) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabaseClient
          .from('toy_replicas')
          .update({
            status: 'failed',
            error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', toyReplicaId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
