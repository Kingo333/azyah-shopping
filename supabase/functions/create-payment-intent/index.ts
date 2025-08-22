
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const CreatePaymentRequestSchema = z.object({
  product: z.literal('consumer_premium'),
  amountAed: z.number().min(2, 'Minimum amount is 2 AED'),
  test: z.boolean().optional().default(false)
});

const PaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency_code: z.string(),
  status: z.enum(['requires_payment_instrument', 'requires_user_action', 'pending', 'completed', 'failed', 'canceled']),
  operation_id: z.string(),
  redirect_url: z.string(),
  success_url: z.string(),
  cancel_url: z.string(),
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

function convertAedToFils(aed: number): number {
  const fils = Math.round(aed * 100);
  if (fils < 200) {
    throw new Error('Minimum amount is 2 AED (200 fils)');
  }
  return fils;
}

async function createPaymentIntent(params: {
  amount_fils: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl?: string;
  message?: string;
  test?: boolean;
  operationId: string;
}) {
  const ziinaApiBase = Deno.env.get('ZIINA_API_BASE') || 'https://api-v2.ziina.com/api';
  const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');

  if (!ziinaApiToken) {
    throw new Error('ZIINA_API_TOKEN not configured');
  }

  const body = {
    amount: params.amount_fils,
    currency_code: params.currency,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    failure_url: params.failureUrl,
    message: params.message || 'Premium Subscription Payment',
    test: params.test || false,
    allow_tips: false,
    operation_id: params.operationId,
  };

  console.log('Creating Ziina payment intent:', { 
    amount: params.amount_fils, 
    test: params.test,
    operation_id: params.operationId 
  });

  const response = await fetch(`${ziinaApiBase}/payment_intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ziinaApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Ziina API error:', { status: response.status, data });
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return PaymentIntentSchema.parse(data);
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
    const appBaseUrl = Deno.env.get('APP_DASHBOARD_URL') || 'https://klwolsopucgswhtdlsps.supabase.co';

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

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = CreatePaymentRequestSchema.parse(body);

    // Convert AED to fils
    const amount_fils = convertAedToFils(validatedBody.amountAed);
    const operationId = crypto.randomUUID();

    // Build callback URLs with placeholder for payment intent ID
    const successUrl = `${appBaseUrl}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`;
    const cancelUrl = `${appBaseUrl}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`;
    const failureUrl = `${appBaseUrl}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`;

    console.log('Creating payment intent for user:', user.id, {
      amount_fils,
      test: validatedBody.test,
      operation_id: operationId
    });

    // Create payment intent with Ziina
    const paymentIntent = await createPaymentIntent({
      amount_fils,
      currency: 'AED',
      successUrl,
      cancelUrl,
      failureUrl,
      message: 'Unlock Premium Access — 40 AED/month • 20 AI Try-ons daily • Unlimited replica • UGC collabs',
      test: validatedBody.test,
      operationId
    });

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Upsert payment record in database
    const { error: dbError } = await supabaseService
      .from('payments')
      .upsert({
        payment_intent_id: paymentIntent.id,
        user_id: user.id,
        product: validatedBody.product,
        amount_fils: paymentIntent.amount,
        currency: paymentIntent.currency_code,
        status: paymentIntent.status,
        operation_id: paymentIntent.operation_id,
        redirect_url: paymentIntent.redirect_url,
        success_url: paymentIntent.success_url,
        cancel_url: paymentIntent.cancel_url,
        fee_amount_fils: paymentIntent.fee_amount,
        tip_amount_fils: 0,
        latest_error_message: paymentIntent.latest_error?.message,
        latest_error_code: paymentIntent.latest_error?.code
      }, {
        onConflict: 'operation_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return jsonResponse({ error: 'Failed to save payment record' }, 500);
    }

    console.log('Payment intent created successfully:', {
      pi: paymentIntent.id,
      status: paymentIntent.status,
      redirect_url: paymentIntent.redirect_url
    });

    return jsonResponse({
      redirectUrl: paymentIntent.redirect_url,
      pi: paymentIntent.id
    });

  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    
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
