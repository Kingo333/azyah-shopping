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

  // Require user JWT (Supabase will also gate before this if verify_jwt=true)
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing_user_jwt" }, 401);
  }

  // Get environment variables
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

    // Get user from authorization header
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      auth.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const { amountAed = 40, test = true, message = "Azyah Premium" } = await req.json();
    const amount = Math.round(Number(amountAed) * 100);
    if (!Number.isFinite(amount) || amount < 200) {
      return jsonResponse({ error: "amount_invalid", amount }, 400);
    }

    console.log(`Creating payment intent for user: ${user.id}, test: ${test}`);

    // Create Ziina Payment Intent following the documentation
    const payload = {
      amount,
      currency_code: "AED",
      message,
      success_url: `${APP}/payment-success?payment_intent_id={PAYMENT_INTENT_ID}`,
      cancel_url: `${APP}/payment-cancel?payment_intent_id={PAYMENT_INTENT_ID}`,
      failure_url: `${APP}/payment-failed?payment_intent_id={PAYMENT_INTENT_ID}`,
      test: !!test,
      expiry: Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString(), // 30 minutes from now in seconds as string
      allow_tips: false
    };

    const res = await fetch(`${BASE}/payment_intent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const raw = await res.text(); 
    let out: any = null; 
    try { 
      out = raw ? JSON.parse(raw) : null; 
    } catch {}
    
    // Structured logging as requested
    console.error(JSON.stringify({ 
      stage: "ziina_create", 
      status: res.status, 
      req: { amount, currency_code: 'AED', has_urls: true, test: !!test, expiry_type: typeof payload.expiry }, 
      res: out ?? raw 
    }));
    
    if (!res.ok) {
      return jsonResponse({ 
        error: "ziina_create_failed", 
        upstream_status: res.status, 
        details: out ?? raw 
      }, 502);
    }

    // Initialize service role client for database operations  
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create or update subscription record
    const subscriptionData = {
      user_id: user.id,
      plan: 'consumer_premium',
      status: 'pending',
      last_payment_intent_id: out.id,
      last_payment_status: out.status,
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
      redirectUrl: out.redirect_url
    });

    // Return the redirect URL to client (standardized response format)
    return jsonResponse({ 
      redirectUrl: out.redirect_url, 
      pi: out.id 
    });

  } catch (e) {
    return jsonResponse({ error: "unhandled", message: String(e) }, 500);
  }
});