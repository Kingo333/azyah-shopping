import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RerankInput {
  queryImageUrl: string;
  results: Array<{
    id: string;
    thumbnailUrl: string;
    currentScore: number;
  }>;
}

interface RerankOutput {
  success: boolean;
  results: Array<{
    id: string;
    visualSimilarity: number;
    combinedScore: number;
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: RerankInput = await req.json();

    if (!input.queryImageUrl || !input.results?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'queryImageUrl and results are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[visual-rerank] Reranking ${input.results.length} results for user ${user.id}`);

    // Limit to 30 thumbnails max for cost efficiency
    const resultsToRank = input.results.slice(0, 30);
    
    // Filter out invalid thumbnail URLs
    const validResults = resultsToRank.filter(r => 
      r.thumbnailUrl && 
      (r.thumbnailUrl.startsWith('http://') || r.thumbnailUrl.startsWith('https://'))
    );

    if (validResults.length === 0) {
      console.log('[visual-rerank] No valid thumbnails to compare');
      return new Response(
        JSON.stringify({
          success: true,
          results: input.results.map(r => ({
            id: r.id,
            visualSimilarity: 0,
            combinedScore: r.currentScore,
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build batch comparison prompt
    const thumbnailList = validResults.map((r, i) => `[THUMBNAIL ${i + 1}]`).join(' ');
    
    // Build image content array for the message
    const imageContent: any[] = [
      {
        type: 'text',
        text: `You are comparing a query garment image to ${validResults.length} shopping result thumbnails.

QUERY IMAGE: The first image is the garment the user is searching for.

THUMBNAILS: The following ${validResults.length} images are shopping result thumbnails.

Rate each thumbnail's visual similarity to the query (0-10 scale):
- 10 = Exact same item or near-identical (same brand, style, pattern)
- 7-9 = Very similar (same style, similar pattern/color, could be the same product)
- 4-6 = Somewhat similar (same category, different details or colors)
- 1-3 = Not very similar (different style, only shares category)
- 0 = Completely different item

Consider: silhouette, pattern/print, color, style, and overall visual appearance.

Return ONLY a JSON object with scores array: {"scores": [8, 6, 3, ...]}`
      },
      {
        type: 'image_url',
        image_url: { url: input.queryImageUrl }
      }
    ];

    // Add thumbnail images (limit to avoid token limits)
    for (const result of validResults.slice(0, 20)) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: result.thumbnailUrl }
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: imageContent
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[visual-rerank] AI comparison failed:', aiResponse.status, errorText);
      throw new Error(`AI comparison failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{"scores":[]}';
    
    let scores: number[] = [];
    try {
      const parsed = JSON.parse(content);
      scores = parsed.scores || [];
    } catch (e) {
      console.error('[visual-rerank] Failed to parse AI response:', content);
      // Extract numbers from the response as fallback
      const matches = content.match(/\d+/g);
      if (matches) {
        scores = matches.map((m: string) => parseInt(m, 10)).filter((n: number) => n >= 0 && n <= 10);
      }
    }

    console.log(`[visual-rerank] Got ${scores.length} similarity scores`);

    // Map scores back to results (with fallback for missing scores)
    const output: RerankOutput = {
      success: true,
      results: input.results.map((result, index) => {
        const rawScore = scores[index] ?? 5; // Default to 5 if missing
        const visualSimilarity = Math.min(1, Math.max(0, rawScore / 10)); // Normalize to 0-1
        
        // Blend: 20% text score + 80% visual score (visual-first ranking)
        const combinedScore = (result.currentScore * 0.2) + (visualSimilarity * 0.8);
        
        return {
          id: result.id,
          visualSimilarity,
          combinedScore,
        };
      })
    };

    console.log(`[visual-rerank] Success: reranked ${output.results.length} results`);

    return new Response(
      JSON.stringify(output),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[visual-rerank] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
