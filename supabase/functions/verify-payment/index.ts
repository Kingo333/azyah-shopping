
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VerifyPaymentRequestSchema = z.object({
  pi: z.string()
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE');
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    if (!ziinaApiBase || !ziinaApiToken) {
      return jsonResponse({ error: 'Missing environment variables' }, 500);
    }

    // Authentication
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header required' }, 401);
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const body = await req.json();
    const { pi } = VerifyPaymentRequestSchema.parse(body);

    console.log(`Verifying payment intent: ${pi} for user: ${user.id}`);

    // Get payment intent from Ziina
    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent/${pi}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!ziinaResponse.ok) {
      const errorData = await ziinaResponse.json();
      return jsonResponse({ 
        error: 'Failed to verify payment intent',
        upstream_status: ziinaResponse.status,
        details: errorData
      }, ziinaResponse.status);
    }

    const paymentIntentData = await ziinaResponse.json();

    // Update payment record
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: payment, error: fetchError } = await supabaseService
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('payment_intent_id', pi)
      .single();

    if (fetchError || !payment) {
      return jsonResponse({ 
        error: 'Payment intent not found for this user' 
      }, 404);
    }

    const { error: updateError } = await supabaseService
      .from('payments')
      .update({
        status: paymentIntentData.status,
        fee_amount_fils: paymentIntentData.fee_amount,
        tip_amount_fils: paymentIntentData.tip_amount || 0,
        latest_error_message: paymentIntentData.latest_error?.message,
        latest_error_code: paymentIntentData.latest_error?.code,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', pi);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return jsonResponse({ error: 'Failed to update payment status' }, 500);
    }

    const isCompleted = paymentIntentData.status === 'completed';

    return jsonResponse({
      id: paymentIntentData.id,
      status: paymentIntentData.status,
      amount_fils: paymentIntentData.amount,
      currency: paymentIntentData.currency_code,
      fee_amount_fils: paymentIntentData.fee_amount,
      tip_amount_fils: paymentIntentData.tip_amount || 0,
      latest_error_message: paymentIntentData.latest_error?.message,
      latest_error_code: paymentIntentData.latest_error?.code,
      is_completed: isCompleted,
      created_at: payment.created_at,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in verify-payment:', error);
    
    if (error instanceof z.ZodError) {
      return jsonResponse({ 
        error: 'Validation error',
        details: error.errors 
      }, 400);
    }
    
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
