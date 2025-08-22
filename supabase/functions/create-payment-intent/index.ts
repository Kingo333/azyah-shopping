
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
  // Step 1: Validate environment variables first
  const ziinaApiBase = Deno.env.get('ZIINA_API_BASE');
  const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');
  const appBaseUrl = Deno.env.get('APP_DASHBOARD_URL');

  if (!ziinaApiBase) {
    throw new Error('ZIINA_API_BASE environment variable is missing');
  }
  if (!ziinaApiToken) {
    throw new Error('ZIINA_API_TOKEN environment variable is missing');
  }
  if (!appBaseUrl) {
    throw new Error('APP_DASHBOARD_URL environment variable is missing');
  }

  const paymentMessage = params.message || 'Azyah Premium';

  // Step 2: Create correct request body (no operation_id, numeric expiry)
  const body = {
    amount: params.amount_fils,
    currency_code: params.currency,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    failure_url: params.failureUrl,
    message: paymentMessage,
    test: params.test || false,
    expiry: Date.now() + 30 * 60 * 1000, // numeric timestamp (30 minutes from now)
    allow_tips: false,
    // REMOVED: operation_id - not sent to Ziina API, kept only for local DB
  };

  console.log('Creating Ziina payment intent:', { 
    amount: params.amount_fils, 
    test: params.test,
    local_operation_id: params.operationId, // Log but don't send
    message: paymentMessage,
    expiry: body.expiry,
    urls: {
      success: params.successUrl,
      cancel: params.cancelUrl,
      failure: params.failureUrl
    }
  });

  const response = await fetch(`${ziinaApiBase}/payment_intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ziinaApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const responseText = await response.text();
  let data;
  
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    data = responseText;
  }

  // Step 3: Enhanced diagnostic logging
  console.error(JSON.stringify({
    stage: 'ziina_create',
    status: response.status,
    req: body,
    res: data,
  }));

  if (!response.ok) {
    console.error('Ziina API error:', { status: response.status, data });
    throw new Error(data.message || `HTTP ${response.status}: ${responseText}`);
  }

  console.log('Ziina payment intent created:', { id: data.id, status: data.status });
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
    const successUrl = `${appBaseUrl}/payments/ziina/success?pi={PAYMENT_INTENT_ID}`;
    const cancelUrl = `${appBaseUrl}/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}`;
    const failureUrl = `${appBaseUrl}/payments/ziina/failure?pi={PAYMENT_INTENT_ID}`;

    console.log('Creating payment intent for user:', user.id, {
      amount_fils,
      amount_aed: validatedBody.amountAed,
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
      message: 'Azyah Premium',
      test: validatedBody.test,
      operationId // Keep for local DB storage only
    });

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Upsert payment record in database with local operation_id
    const { error: dbError } = await supabaseService
      .from('payments')
      .upsert({
        payment_intent_id: paymentIntent.id,
        user_id: user.id,
        product: validatedBody.product,
        amount_fils: paymentIntent.amount,
        currency: paymentIntent.currency_code,
        status: paymentIntent.status,
        operation_id: operationId, // Store locally for idempotency
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
      redirect_url: paymentIntent.redirect_url,
      operation_id: operationId
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
    
    // Step 4: Map upstream failures to clear status codes
    if (error instanceof Error) {
      if (error.message.includes('environment variable is missing')) {
        return jsonResponse({ 
          error: 'Configuration error',
          details: error.message 
        }, 500);
      }
      
      if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
        return jsonResponse({ 
          error: 'Ziina authentication failed',
          details: error.message 
        }, 502);
      }
      
      if (error.message.includes('HTTP 422')) {
        return jsonResponse({ 
          error: 'Ziina validation failed',
          details: error.message 
        }, 502);
      }
    }
    
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
