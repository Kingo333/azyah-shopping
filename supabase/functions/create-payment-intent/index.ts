
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request validation
const CreatePaymentRequestSchema = z.object({
  amountAed: z.number().min(2, 'Minimum amount is 2 AED'),
  test: z.boolean().optional().default(false),
  message: z.string().optional()
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Environment validation
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE');
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const envCheck = {
      ZIINA_API_BASE: !!ziinaApiBase,
      ZIINA_API_TOKEN: !!ziinaApiToken,
      APP_BASE_URL: !!appBaseUrl
    };

    console.log('Environment check:', envCheck);

    if (!ziinaApiBase || !ziinaApiToken || !appBaseUrl) {
      return jsonResponse({ 
        error: 'Missing environment variables',
        env_check: envCheck
      }, 500);
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
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    // Parse request
    const body = await req.json();
    const validatedBody = CreatePaymentRequestSchema.parse(body);

    // Convert amount
    const amount_fils = convertAedToFils(validatedBody.amountAed);

    // Build URLs with placeholder
    const success_url = `${appBaseUrl}/payments/ziina/success?pi={PAYMENT_INTENT_ID}`;
    const cancel_url = `${appBaseUrl}/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}`;
    const failure_url = `${appBaseUrl}/payments/ziina/failure?pi={PAYMENT_INTENT_ID}`;

    // Create payment intent with Ziina
    const ziinaPayload = {
      amount: amount_fils,
      currency_code: 'AED',
      message: validatedBody.message || 'Azyah Premium',
      success_url,
      cancel_url,
      failure_url,
      test: validatedBody.test,
      expiry: Date.now() + 30 * 60 * 1000, // 30 minutes
      allow_tips: false
    };

    console.log('Creating Ziina payment intent:', {
      amount: amount_fils,
      test: validatedBody.test,
      message: ziinaPayload.message
    });

    const ziinaResponse = await fetch(`${ziinaApiBase}/payment_intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ziinaPayload),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await ziinaResponse.text();
    let ziinaData;
    
    try {
      ziinaData = JSON.parse(responseText);
    } catch {
      ziinaData = responseText;
    }

    console.log('Ziina response:', {
      status: ziinaResponse.status,
      data: typeof ziinaData === 'object' ? { id: ziinaData.id, status: ziinaData.status } : ziinaData
    });

    if (!ziinaResponse.ok) {
      return jsonResponse({ 
        error: 'ziina_create_failed',
        upstream_status: ziinaResponse.status,
        details: ziinaData
      }, 502);
    }

    // Store payment record
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error: dbError } = await supabaseService
      .from('payments')
      .insert({
        payment_intent_id: ziinaData.id,
        user_id: user.id,
        product: 'consumer_premium',
        amount_fils: ziinaData.amount,
        currency: ziinaData.currency_code,
        status: ziinaData.status,
        redirect_url: ziinaData.redirect_url,
        success_url: ziinaData.success_url,
        cancel_url: ziinaData.cancel_url,
        fee_amount_fils: ziinaData.fee_amount,
        tip_amount_fils: ziinaData.tip_amount || 0,
        latest_error_message: ziinaData.latest_error?.message,
        latest_error_code: ziinaData.latest_error?.code
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return jsonResponse({ error: 'Failed to save payment record' }, 500);
    }

    return jsonResponse({
      redirectUrl: ziinaData.redirect_url,
      pi: ziinaData.id
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
