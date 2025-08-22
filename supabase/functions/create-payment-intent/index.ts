import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Get environment variables with validation
  const BASE = Deno.env.get("ZIINA_API_BASE");
  const TOKEN = Deno.env.get("ZIINA_API_TOKEN");
  const APP = Deno.env.get("APP_BASE_URL");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!BASE || !TOKEN || !APP || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return jsonResponse({ 
      error: "missing_env", 
      have: { BASE: !!BASE, TOKEN: !!TOKEN, APP: !!APP, SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY } 
    }, 500);
  }

  try {
    // Initialize Supabase client for user authentication
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get user from authorization header (JWT verification handled by Supabase)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return jsonResponse({ error: "missing_user_jwt" }, 401);
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      auth.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const { amountAed = 40, test = true, message = "Azyah Premium" } = await req.json();
    
    // Convert AED to fils (1 AED = 100 fils) and validate minimum amount (2 AED = 200 fils)
    const amount = Math.round(Number(amountAed) * 100);
    if (!Number.isFinite(amount) || amount < 200) {
      return jsonResponse({ error: "amount_invalid", message: "Minimum amount is 2 AED (200 fils)", amount }, 400);
    }

    console.log(`Creating payment intent for user: ${user.id}, amount: ${amount} fils, test: ${test}`);

    // Build proper URLs with APP_BASE_URL (matching the route structure)
    const successUrl = `${APP}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`;
    const cancelUrl = `${APP}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`;
    const failureUrl = `${APP}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`;

    // Create Ziina Payment Intent following the official documentation
    const payload = {
      amount,
      currency_code: "AED",
      message,
      success_url: successUrl,
      cancel_url: cancelUrl,
      failure_url: failureUrl,
      test: !!test,
      expiry: String(Date.now() + (30 * 60 * 1000)), // 30 minutes from now as string (Ziina requires string)
      allow_tips: false
    };

    console.log('Sending request to Ziina with payload:', {
      ...payload,
      expiry_type: typeof payload.expiry,
      expiry_value: payload.expiry,
      expiry_timestamp: new Date(parseInt(payload.expiry)).toISOString()
    });

    const res = await fetch(`${BASE}/payment_intent`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${TOKEN}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(payload)
    });

    const raw = await res.text(); 
    let out: any = null; 
    try { 
      out = raw ? JSON.parse(raw) : null; 
    } catch (parseError) {
      console.error('Failed to parse Ziina response:', parseError);
    }
    
    // Structured logging as per requirements
    console.log(JSON.stringify({ 
      stage: "ziina_create", 
      status: res.status, 
      req_keys: ["amount", "currency_code", "success_url", "cancel_url", "failure_url", "test", "expiry"],
      res_summary: {
        status: res.status,
        id: out?.id,
        redirect_url: out?.redirect_url,
        has_error: !!out?.error
      }
    }));
    
    if (!res.ok) {
      console.error('Ziina API error:', { status: res.status, response: out || raw });
      return jsonResponse({ 
        error: "ziina_create_failed", 
        upstream_status: res.status, 
        details: out || raw 
      }, 502);
    }

    // Initialize service role client for database operations  
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create payment record
    const paymentData = {
      user_id: user.id,
      amount_fils: amount,
      provider: 'ziina',
      payment_intent_id: out.id,
      product: 'consumer_premium',
      currency: 'AED',
      status: out.status || 'pending',
      operation_id: out.operation_id || out.id,
      redirect_url: out.redirect_url,
      success_url: successUrl,
      cancel_url: cancelUrl,
      failure_url: failureUrl
    };

    const { error: paymentError } = await supabaseService
      .from('payments')
      .insert(paymentData);

    if (paymentError) {
      console.error('Payment record creation error:', paymentError);
      return jsonResponse({ 
        error: 'payment_record_failed',
        details: paymentError.message,
        ziina_response: { id: out.id, redirect_url: out.redirect_url }
      }, 500);
    }

    // Create or update subscription record
    const subscriptionData = {
      user_id: user.id,
      plan: 'consumer_premium',
      status: 'pending',
      last_payment_intent_id: out.id,
      last_payment_status: out.status || 'pending',
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
      paymentIntentId: out.id,
      redirectUrl: out.redirect_url,
      status: out.status
    });

    // Return the redirect URL to client (standardized response format)
    return jsonResponse({ 
      redirectUrl: out.redirect_url, 
      pi: out.id 
    });

  } catch (e) {
    console.error('Unhandled error in create-payment-intent:', e);
    return jsonResponse({ error: "unhandled", message: String(e) }, 500);
  }
});