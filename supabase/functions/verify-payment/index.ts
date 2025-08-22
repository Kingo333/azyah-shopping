import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE')!;
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN')!;

    // Initialize Supabase client for user authentication
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header required' }, 401);
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const { payment_intent_id } = await req.json();

    if (!payment_intent_id) {
      return jsonResponse({ error: 'Payment intent ID required' }, 400);
    }

    console.log(`Verifying payment intent: ${payment_intent_id} for user: ${user.id}`);

    // Get payment intent details from Ziina
    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent/${payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const paymentIntent = await ziinaResponse.json();
    console.log('Ziina payment intent response:', { status: ziinaResponse.status, data: paymentIntent });

    if (!ziinaResponse.ok) {
      console.error('Ziina API error:', paymentIntent);
      return jsonResponse({ 
        error: 'Failed to verify payment intent',
        details: paymentIntent
      }, ziinaResponse.status);
    }

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Check if this payment intent belongs to the user
    const { data: subscription, error: fetchError } = await supabaseService
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('last_payment_intent_id', payment_intent_id)
      .single();

    if (fetchError || !subscription) {
      console.error('Subscription not found:', fetchError);
      return jsonResponse({ 
        error: 'Payment intent not found for this user' 
      }, 404);
    }

    // Return verification result
    const isCompleted = paymentIntent.status === 'completed';
    const isActive = isCompleted && subscription.status === 'active';

    return jsonResponse({
      payment_intent_id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency_code,
      is_completed: isCompleted,
      is_active: isActive,
      subscription_status: subscription.status,
      current_period_end: subscription.current_period_end,
    });

  } catch (error) {
    console.error('Error in verify-payment:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});