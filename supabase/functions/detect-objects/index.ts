import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedObject {
  label: 'garment' | 'person' | 'accessory' | 'footwear' | 'bag' | 'jewelry' | 'product';
  box: {
    x: number;      // 0-1 relative
    y: number;      // 0-1 relative
    width: number;  // 0-1 relative
    height: number; // 0-1 relative
  };
  confidence: number;
  description?: string;
}

interface DetectResponse {
  success: boolean;
  objects: DetectedObject[];
  primary_index: number;
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
        JSON.stringify({ success: false, error: 'Authorization required', objects: [], primary_index: 0 }),
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
        JSON.stringify({ success: false, error: 'Invalid token', objects: [], primary_index: 0 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required', objects: [], primary_index: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[detect-objects] Detecting objects for user ${user.id}`);

    // Use Gemini Vision to detect objects
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
            content: [
              {
                type: 'text',
                text: `Analyze this image and identify all distinct fashion items/products.

For EACH visible item (garment, bag, shoes, jewelry, accessory), provide:
1. label: one of "garment", "bag", "footwear", "accessory", "jewelry", "person"
2. box: bounding box as {x, y, width, height} in 0-1 coordinates (relative to image dimensions)
   - x, y: top-left corner
   - width, height: size of box
3. confidence: 0-1 score
4. description: brief description (e.g., "black floral abaya", "leather handbag")

Prioritize:
- Main garments/clothing items first
- Accessories (bags, shoes) second
- Include the full extent of each item in its bounding box

Return ONLY valid JSON:
{
  "objects": [
    {"label": "garment", "box": {"x": 0.1, "y": 0.15, "width": 0.8, "height": 0.7}, "confidence": 0.95, "description": "..."},
    {"label": "bag", "box": {"x": 0.7, "y": 0.5, "width": 0.25, "height": 0.3}, "confidence": 0.85, "description": "..."}
  ],
  "primary_index": 0
}

primary_index = the index of the most important/prominent item to search for.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[detect-objects] AI detection failed:', aiResponse.status, errorText);
      throw new Error(`AI detection failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{"objects":[],"primary_index":0}';
    
    let parsed: { objects: DetectedObject[]; primary_index: number };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[detect-objects] Failed to parse AI response:', content);
      // Return fallback
      parsed = {
        objects: [{
          label: 'product',
          box: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
          confidence: 0.5,
          description: 'Product region'
        }],
        primary_index: 0
      };
    }

    // Validate and sanitize boxes
    const validObjects: DetectedObject[] = (parsed.objects || [])
      .filter((obj: any) => obj.box && typeof obj.box.x === 'number')
      .map((obj: any) => ({
        label: obj.label || 'product',
        box: {
          x: Math.max(0, Math.min(1, obj.box.x)),
          y: Math.max(0, Math.min(1, obj.box.y)),
          width: Math.max(0.1, Math.min(1 - obj.box.x, obj.box.width)),
          height: Math.max(0.1, Math.min(1 - obj.box.y, obj.box.height)),
        },
        confidence: obj.confidence || 0.5,
        description: obj.description || '',
      }));

    // Ensure we have at least one object
    if (validObjects.length === 0) {
      validObjects.push({
        label: 'product',
        box: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        confidence: 0.5,
        description: 'Fallback product region'
      });
    }

    const primaryIndex = Math.max(0, Math.min(parsed.primary_index || 0, validObjects.length - 1));

    console.log(`[detect-objects] Detected ${validObjects.length} objects, primary=${primaryIndex}`);

    const response: DetectResponse = {
      success: true,
      objects: validObjects,
      primary_index: primaryIndex,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[detect-objects] Error:', error);
    
    // Return fallback on error
    return new Response(
      JSON.stringify({
        success: false,
        objects: [{
          label: 'product',
          box: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
          confidence: 0.5,
        }],
        primary_index: 0,
        error: error instanceof Error ? error.message : 'Detection failed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
