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
    const appDashboardUrl = Deno.env.get('APP_DASHBOARD_URL')!;

    // Validate required environment variables
    if (!supabaseUrl || !ziinaApiBase || !ziinaApiToken || !appDashboardUrl) {
      console.error('Missing required environment variables');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

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

    const { test = false } = await req.json().catch(() => ({ test: false }));

    console.log(`Creating payment intent for user: ${user.id}, test: ${test}`);

    // Create Ziina Payment Intent following the documentation
    const paymentPayload = {
      amount: 4000, // 40 AED in fils (smallest currency unit)
      currency_code: "AED",
      message: "Premium Subscription - 40 AED / month",
      success_url: `${appDashboardUrl}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`,
      cancel_url: `${appDashboardUrl}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`,
      failure_url: `${appDashboardUrl}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`,
      test: !!test
    };

    console.log('Creating payment intent with Ziina API:', JSON.stringify(paymentPayload, null, 2));

    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const responseData = await ziinaResponse.json();
    console.log('Ziina API response:', { status: ziinaResponse.status, data: responseData });

    if (!ziinaResponse.ok) {
      console.error('Ziina API error:', responseData);
      return jsonResponse({ 
        error: responseData?.error || 'Payment intent creation failed' 
      }, ziinaResponse.status);
    }

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Create or update subscription record
    const subscriptionData = {
      user_id: user.id,
      plan: 'premium',
      status: 'pending',
      last_payment_intent_id: responseData.id,
      last_payment_status: responseData.status,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseService
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Subscription upsert error:', upsertError);
      return jsonResponse({ error: 'Failed to create subscription record' }, 500);
    }

    console.log('Payment intent created successfully:', {
      paymentIntentId: responseData.id,
      redirectUrl: responseData.redirect_url
    });

    // Return the redirect URL to client
    return jsonResponse({
      redirect_url: responseData.redirect_url,
      payment_intent_id: responseData.id,
    });

  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});