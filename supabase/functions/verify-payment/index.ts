
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency_code: z.string(),
  status: z.enum(['requires_payment_instrument', 'requires_user_action', 'pending', 'completed', 'failed', 'canceled']),
  operation_id: z.string(),
  fee_amount: z.number().nullable(),
  latest_error: z.object({
    message: z.string(),
    code: z.string()
  }).nullable()
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE') || 'https://api-v2.ziina.com/api';
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

    if (!ziinaResponse.ok) {
      const errorData = await ziinaResponse.json();
      console.error('Ziina API error:', errorData);
      return jsonResponse({ 
        error: 'Failed to verify payment intent',
        details: errorData
      }, ziinaResponse.status);
    }

    const paymentIntentData = await ziinaResponse.json();
    const paymentIntent = PaymentIntentSchema.parse(paymentIntentData);

    console.log('Ziina payment intent response:', { 
      id: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Check if this payment intent belongs to the user and update it
    const { data: payment, error: fetchError } = await supabaseService
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('payment_intent_id', payment_intent_id)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', fetchError);
      return jsonResponse({ 
        error: 'Payment intent not found for this user' 
      }, 404);
    }

    // Update payment status in database
    const { error: updateError } = await supabaseService
      .from('payments')
      .update({
        status: paymentIntent.status,
        fee_amount_fils: paymentIntent.fee_amount,
        latest_error_message: paymentIntent.latest_error?.message,
        latest_error_code: paymentIntent.latest_error?.code,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', payment_intent_id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return jsonResponse({ error: 'Failed to update payment status' }, 500);
    }

    // Return verification result
    const isCompleted = paymentIntent.status === 'completed';

    return jsonResponse({
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency_code,
      is_completed: isCompleted,
      is_active: isCompleted,
      subscription_status: isCompleted ? 'active' : 'pending',
      current_period_end: isCompleted ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
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
