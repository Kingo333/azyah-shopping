import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This version does NOT deduct picture credits - used for video tab flow
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { model_photo_url, clothing_photo_url } = await req.json();

    if (!model_photo_url || !clothing_photo_url) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing model_photo_url or clothing_photo_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = Deno.env.get("THE_NEW_BLACK_API_KEY");
    if (!API_KEY) {
      console.error("THE_NEW_BLACK_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call The New Black VTO stream API using FormData
    console.log("Calling The New Black VTO stream API (free - no credit deduction)...");
    
    const formData = new FormData();
    formData.append("model_photo", model_photo_url);
    formData.append("clothing_photo", clothing_photo_url);
    formData.append("ratio", "auto");
    formData.append("prompt", "virtual try on, put the model in the outfit");

    const apiResponse = await fetch(`https://thenewblack.ai/api/1.1/wf/vto_stream?api_key=${API_KEY}`, {
      method: "POST",
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("API error:", apiResponse.status, errorText);
      return new Response(
        JSON.stringify({ ok: false, error: `API error: ${apiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Response is a text URL, not JSON
    const resultUrl = await apiResponse.text();
    console.log("API response URL:", resultUrl);

    if (!resultUrl || !resultUrl.startsWith("http")) {
      console.error("Invalid result URL:", resultUrl);
      return new Response(
        JSON.stringify({ ok: false, error: "No valid result URL returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download and store the result image
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const imageResponse = await fetch(resultUrl.trim());
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    const fileName = `${user.id}/${Date.now()}-video-input.png`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from("ai-tryon-results")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Still return the original URL if upload fails
      return new Response(
        JSON.stringify({ ok: true, result_url: resultUrl.trim(), stored: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("ai-tryon-results")
      .getPublicUrl(fileName);

    // Don't save to ai_assets table - this is just for video input
    // The final video will be saved

    return new Response(
      JSON.stringify({ 
        ok: true, 
        result_url: publicUrlData.publicUrl,
        stored: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
