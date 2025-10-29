import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { message, region = 'UAE', mode = 'chat', image, product_image, skin_image } = await req.json();

    console.log('Beauty consultation request:', { user_id: user.id, mode, region });

    // Check and get current credits
    const { data: creditsData, error: creditsError } = await supabase.rpc('get_user_credits', {
      target_user_id: user.id
    });

    if (creditsError || !creditsData || creditsData.length === 0) {
      console.error('Error fetching credits:', creditsError);
      throw new Error('Failed to fetch credits');
    }

    const currentCredits = creditsData[0];
    
    if (currentCredits.beauty_credits < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient beauty credits. You need at least 1 credit to use the Beauty Consultant.',
          beauty_credits: 0,
          is_premium: currentCredits.is_premium
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Deduct credit BEFORE processing
    const { data: deductResult, error: deductError } = await supabase.rpc('deduct_beauty_credit', {
      target_user_id: user.id
    });

    if (deductError || !deductResult) {
      console.error('Error deducting credit:', deductError);
      throw new Error('Failed to deduct credit');
    }

    console.log('Credit deducted successfully, remaining:', currentCredits.beauty_credits - 1);

    // Build AI messages based on mode
    let systemPrompt = `You are Azyah, a warm and knowledgeable ${region} beauty consultant. 
You provide personalized beauty advice, product recommendations, shade matching, and styling tips.
IMPORTANT: Keep responses concise and friendly - maximum 2-3 sentences unless detailed analysis is requested.
You have deep knowledge of beauty trends popular in ${region} and the Middle East.
Always consider skin tone, undertone, and regional climate in your recommendations.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (mode === 'product_analysis' && (product_image || skin_image)) {
      const analysisPrompt = `Analyze the compatibility between this product and the user's skin.
Product image: ${product_image ? 'provided' : 'not provided'}
Skin/selfie image: ${skin_image || image ? 'provided' : 'not provided'}
User question: ${message}

Provide a compatibility score (0-100) and specific recommendations for this ${region} customer.`;
      
      messages.push({
        role: 'user',
        content: analysisPrompt
      });
    } else {
      // Chat mode
      if (image) {
        messages.push({
          role: 'user',
          content: `${message}\n\nUser has provided a selfie for personalized analysis.`
        });
      } else {
        messages.push({
          role: 'user',
          content: message
        });
      }
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Refund the credit since AI call failed
      await supabase.from('user_credits')
        .update({ beauty_credits: currentCredits.beauty_credits })
        .eq('user_id', user.id);

      if (aiResponse.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service payment required. Please contact support.');
      }
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const consultationText = aiData.choices?.[0]?.message?.content || 'I apologize, I could not generate a response at this time.';

    console.log('Beauty consultation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        consultation: {
          text: consultationText,
          voice_summary: consultationText.substring(0, 200) + '...',
          beauty_credits: currentCredits.beauty_credits - 1,
          is_premium: currentCredits.is_premium
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in beauty-consultation function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
