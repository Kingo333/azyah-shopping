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
    const { payment_intent_id } = await req.json();
    
    if (!payment_intent_id) {
      throw new Error('payment_intent_id required');
    }

    console.log('Verifying payment:', { 
      stage: 'REQUEST',
      user_id: user.id,
      payment_intent_id 
    });

    // Get payment status from Ziina
    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent/${payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ziinaResponse.ok) {
      const errorText = await ziinaResponse.text();
      console.error('Ziina API error:', { status: ziinaResponse.status, error: errorText });
      throw new Error(`Ziina verification failed: ${errorText}`);
    }

    const ziinaData = await ziinaResponse.json();
    const paymentStatus = ziinaData.payment_intent.status;

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', payment_intent_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // If payment is successful, activate subscription
    if (paymentStatus === 'succeeded') {
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      periodEnd.setDate(periodEnd.getDate() + 30); // 30-day subscription

      // Check if user already has a subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSubscription) {
        // Update existing subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_payment_intent_id: payment_intent_id,
            last_payment_status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (subError) {
          console.error('Failed to update subscription:', subError);
        }
      } else {
        // Create new subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            provider: 'ziina',
            plan: 'consumer_premium',
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_payment_intent_id: payment_intent_id,
            last_payment_status: paymentStatus
          });

        if (subError) {
          console.error('Failed to create subscription:', subError);
        }
      }

      console.log('Payment verified and subscription activated:', {
        stage: 'SUCCESS',
        payment_intent_id,
        status: paymentStatus,
        period_end: periodEnd.toISOString()
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id,
        status: paymentStatus,
        subscription_active: paymentStatus === 'succeeded'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
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