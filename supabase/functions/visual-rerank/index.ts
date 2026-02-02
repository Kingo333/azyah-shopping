import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RerankInput {
  queryImageUrl: string;
  isPatternMode: boolean;
  results: Array<{
    id: string;
    thumbnailUrl: string;
    currentScore: number;
  }>;
}

interface SubScores {
  overall: number;
  pattern: number;
  silhouette: number;
  color: number;
}

interface RerankResult {
  id: string;
  visualSimilarity: number;
  combinedScore: number;
  subScores?: SubScores;
  filtered?: boolean;
}

interface RerankOutput {
  success: boolean;
  results: RerankResult[];
  isPatternMode: boolean;
  thresholdsApplied: {
    minVisual: number;
    minPattern: number;
  };
  error?: string;
}

// Thresholds for filtering
const THRESHOLDS = {
  pattern: {
    minVisual: 0.45,      // Hard floor for overall visual similarity in pattern mode
    minPattern: 0.50,     // Hard floor for pattern sub-score specifically
    textWeight: 0.10,     // Reduce text influence in pattern mode
    visualWeight: 0.90,   // Visual dominates
    patternSubWeight: 0.55,  // Pattern sub-score weight within visual
    colorSubWeight: 0.25,    // Color sub-score weight
    silhouetteSubWeight: 0.20, // Silhouette matters less for pattern
  },
  normal: {
    minVisual: 0.35,      // More lenient floor for non-pattern
    minPattern: 0,        // No pattern gate
    textWeight: 0.25,     // Text matters more
    visualWeight: 0.75,
    patternSubWeight: 0.20,   // Reduced from 0.25
    colorSubWeight: 0.50,     // Increased from 0.35 - COLOR IS PRIMARY
    silhouetteSubWeight: 0.30, // Reduced from 0.40
  }
};

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
    const isPatternMode = input.isPatternMode ?? false;
    const thresholds = isPatternMode ? THRESHOLDS.pattern : THRESHOLDS.normal;

    if (!input.queryImageUrl || !input.results?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'queryImageUrl and results are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[visual-rerank] Reranking ${input.results.length} results for user ${user.id}, patternMode=${isPatternMode}`);

    // Limit to 25 thumbnails max for cost efficiency
    const resultsToRank = input.results.slice(0, 25);
    
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
            filtered: false,
          })),
          isPatternMode,
          thresholdsApplied: { minVisual: thresholds.minVisual, minPattern: thresholds.minPattern },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build image content array for Gemini with granular sub-score prompt
    const imageContent: unknown[] = [
      {
        type: 'text',
        text: `You are comparing a query garment image to ${validResults.length} shopping result thumbnails.

QUERY IMAGE: The first image is the garment the user is searching for.
THUMBNAILS: The following ${validResults.length} images are shopping result thumbnails (numbered 1 to ${validResults.length}).

For EACH thumbnail, provide THREE separate scores (0-10 scale):

1. PATTERN score: How similar is the print/pattern/texture?
   - 10 = Identical pattern (same print, embroidery, or surface design)
   - 7-9 = Very similar pattern (same style of print, similar motifs)
   - 4-6 = Related pattern category (both floral, both geometric, etc.)
   - 1-3 = Different pattern entirely
   - 0 = No pattern similarity (one is solid, one is printed)

2. SILHOUETTE score: How similar is the shape/cut/style?
   - 10 = Identical silhouette (same neckline, length, sleeve style)
   - 7-9 = Very similar shape (minor differences in hem or collar)
   - 4-6 = Same category, different style (both dresses but different cuts)
   - 1-3 = Different silhouette (A-line vs fitted)
   - 0 = Completely different garment type

3. COLOR score: How similar is the color/palette?
   - 10 = Exact same colors
   - 7-9 = Very similar palette (same base color, slight shade difference)
   - 4-6 = Related colors (both pastels, both earth tones)
   - 1-3 = Different colors
   - 0 = Opposite/contrasting colors

Return ONLY a valid JSON object with this exact structure:
{
  "scores": [
    {"pattern": 8, "silhouette": 7, "color": 9},
    {"pattern": 3, "silhouette": 8, "color": 7},
    ...
  ]
}

The scores array must have exactly ${validResults.length} objects, one for each thumbnail in order.`
      },
      {
        type: 'image_url',
        image_url: { url: input.queryImageUrl }
      }
    ];

    // Add thumbnail images (limit to 20 to avoid token limits)
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
    
    let rawScores: Array<{ pattern?: number; silhouette?: number; color?: number }> = [];
    try {
      const parsed = JSON.parse(content);
      rawScores = parsed.scores || [];
    } catch (e) {
      console.error('[visual-rerank] Failed to parse AI response:', content);
      // Fallback: try to extract any numbers as overall scores
      const matches = content.match(/\d+/g);
      if (matches) {
        const nums = matches.map((m: string) => parseInt(m, 10)).filter((n: number) => n >= 0 && n <= 10);
        // Group into triplets if possible
        for (let i = 0; i < nums.length; i += 3) {
          rawScores.push({
            pattern: nums[i] ?? 5,
            silhouette: nums[i + 1] ?? 5,
            color: nums[i + 2] ?? 5,
          });
        }
      }
    }

    console.log(`[visual-rerank] Got ${rawScores.length} sub-score sets, patternMode=${isPatternMode}`);

    // Map scores back to results with two-stage filtering + dynamic scoring
    const output: RerankOutput = {
      success: true,
      results: [],
      isPatternMode,
      thresholdsApplied: { minVisual: thresholds.minVisual, minPattern: thresholds.minPattern },
    };

    for (let index = 0; index < input.results.length; index++) {
      const result = input.results[index];
      const raw = rawScores[index] ?? { pattern: 5, silhouette: 5, color: 5 };
      
      // Normalize sub-scores to 0-1
      const patternScore = Math.min(1, Math.max(0, (raw.pattern ?? 5) / 10));
      const silhouetteScore = Math.min(1, Math.max(0, (raw.silhouette ?? 5) / 10));
      const colorScore = Math.min(1, Math.max(0, (raw.color ?? 5) / 10));
      
      // Compute weighted visual similarity based on mode
      const visualSimilarity = 
        (patternScore * thresholds.patternSubWeight) +
        (colorScore * thresholds.colorSubWeight) +
        (silhouetteScore * thresholds.silhouetteSubWeight);
      
      // Stage 1: Hard thresholds (filter bad matches)
      let filtered = false;
      
      // Overall visual threshold
      if (visualSimilarity < thresholds.minVisual) {
        filtered = true;
      }
      
      // Pattern-specific gate (only in pattern mode)
      if (isPatternMode && patternScore < thresholds.minPattern) {
        filtered = true;
      }
      
      // Stage 2: Compute combined score with dynamic weights
      const combinedScore = filtered 
        ? 0 // Filtered items get 0 to sink to bottom
        : (result.currentScore * thresholds.textWeight) + (visualSimilarity * thresholds.visualWeight);
      
      output.results.push({
        id: result.id,
        visualSimilarity,
        combinedScore,
        subScores: {
          overall: visualSimilarity,
          pattern: patternScore,
          silhouette: silhouetteScore,
          color: colorScore,
        },
        filtered,
      });
    }

    // Log summary
    const filteredCount = output.results.filter(r => r.filtered).length;
    const passedCount = output.results.length - filteredCount;
    console.log(`[visual-rerank] Success: ${passedCount} passed, ${filteredCount} filtered (mode=${isPatternMode ? 'pattern' : 'normal'})`);

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
        isPatternMode: false,
        thresholdsApplied: { minVisual: 0.35, minPattern: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
