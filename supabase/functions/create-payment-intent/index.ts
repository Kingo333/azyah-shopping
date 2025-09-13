import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE') || 'https://api-v2.ziina.com/api';
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://klwolsopucgswhtdlsps.supabase.co';

    if (!ziinaApiToken) {
      throw new Error('ZIINA_API_TOKEN not configured');
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Parse request body
    const { amountAed, test = false, message = "Azyah Premium" } = await req.json();
    
    if (!amountAed || amountAed <= 0) {
      throw new Error('Valid amount in AED required');
    }

    // Convert AED to fils (multiply by 100)
    const amountFils = Math.round(amountAed * 100);

    // Create payment intent with Ziina
    const paymentIntentData = {
      amount: amountFils,
      currency_code: "AED",
      message: message,
      success_url: `${appBaseUrl}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`,
      cancel_url: `${appBaseUrl}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`,
      failure_url: `${appBaseUrl}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`,
      expiry: String(Date.now() + (30 * 60 * 1000)), // 30 minutes as string
      test: test
    };

    console.log('Creating payment intent:', { 
      stage: 'REQUEST',
      user_id: user.id,
      amount_fils: amountFils,
      test_mode: test 
    });

    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentIntentData),
    });

    if (!ziinaResponse.ok) {
      const errorText = await ziinaResponse.text();
      console.error('Ziina API error:', { status: ziinaResponse.status, error: errorText });
      throw new Error(`Ziina API error: ${errorText}`);
    }

    const ziinaData = await ziinaResponse.json();
    const paymentIntentId = ziinaData.payment_intent.id;

    // Generate actual URLs with payment intent ID
    const successUrl = `${appBaseUrl}/payment-success?payment_intent_id=${paymentIntentId}`;
    const cancelUrl = `${appBaseUrl}/payment-cancel?payment_intent_id=${paymentIntentId}`;
    const failureUrl = `${appBaseUrl}/payment-failed?payment_intent_id=${paymentIntentId}`;

    // Store payment record in database
    const { error: dbError } = await supabase.from('payments').insert({
      user_id: user.id,
      payment_intent_id: paymentIntentId,
      operation_id: ziinaData.payment_intent.operation_id,
      amount_fils: amountFils,
      currency: 'AED',
      status: ziinaData.payment_intent.status,
      provider: 'ziina',
      product: 'consumer_premium',
      success_url: successUrl,
      cancel_url: cancelUrl,
      failure_url: failureUrl,
      redirect_url: ziinaData.payment_intent.url
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store payment record');
    }

    console.log('Payment intent created successfully:', {
      stage: 'SUCCESS',
      payment_intent_id: paymentIntentId,
      status: ziinaData.payment_intent.status
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntentId,
        url: ziinaData.payment_intent.url,
        status: ziinaData.payment_intent.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});