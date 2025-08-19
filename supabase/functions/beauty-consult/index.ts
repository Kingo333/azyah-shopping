import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64, prefs, user_id } = await req.json();
    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const modelVision = Deno.env.get("AZ_VISION_MODEL") ?? "gpt-4o";

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Request received:', {
      hasImage: !!image_base64,
      imagePrefix: image_base64?.slice(0, 50),
      prefs: prefs || {},
      userId: user_id
    });

    // Strip data URL prefix if present
    const imageData = image_base64.includes(',') ? image_base64.split(",")[1] : image_base64;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelVision,
        input: [
          {
            role: "user",
            content: [
              { 
                type: "input_text", 
                text: `
                  You are a beauty & style consultant.
                  Analyze the uploaded selfie and provide personalized recommendations.
                  
                  - Detect skin tone, undertone, and face shape
                  - Recommend makeup products & shades that complement their features
                  - Recommend 2–3 clothing color palettes that work with their skin tone
                  - Keep recommendations short, practical, and friendly
                  - Use ${prefs?.finish ?? "any"} finish and ${prefs?.coverage ?? "any"} coverage preferences if provided
                  
                  If the image is unclear, politely ask for a clearer photo instead of failing.
                  
                  Return your analysis in the specified JSON format.
                ` 
              },
              { 
                type: "input_image", 
                image_data: imageData 
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "BeautyConsultation",
            schema: {
              type: "object",
              properties: {
                analysis: { 
                  type: "string",
                  description: "Overall skin analysis and recommendations summary"
                },
                makeup: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Specific makeup product recommendations"
                },
                clothing_colors: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Recommended clothing color palettes"
                },
              },
              required: ["analysis", "makeup", "clothing_colors"],
              additionalProperties: false
            }
          }
        },
        max_output_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI error:", data);
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API failed", 
          details: data,
          message: "Unable to analyze your photo. Please ensure it's clear and well-lit, then try again."
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('OpenAI response received:', {
      status: response.status,
      hasOutput: !!data.output,
      outputLength: data.output?.length || 0
    });

    // Try extracting JSON result safely
    let result = null;
    try {
      // Handle different possible response structures from Responses API
      result =
        data.output?.[0]?.content?.find?.((c: any) => c.type === "output_json")?.json ??
        data.output?.[0]?.content?.[0]?.json ??
        data.output?.[0]?.json ??
        null;

      console.log('Extracted result:', !!result);
    } catch (e) {
      console.error("JSON extraction failed:", e);
    }

    if (!result) {
      console.error('No valid JSON result found in response:', data);
      return new Response(
        JSON.stringify({
          error: "Could not parse analysis",
          details: data,
          message: "Your photo may be unclear. Please upload a well-lit image with your face visible."
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate result has required fields
    if (!result.analysis || !result.makeup || !result.clothing_colors) {
      console.error('Invalid result structure:', result);
      return new Response(
        JSON.stringify({
          error: "Incomplete analysis",
          details: result,
          message: "Analysis was incomplete. Please try again with a clearer photo."
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Successful analysis completed');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error", 
        details: String(error),
        message: "Something went wrong. Please try again."
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});