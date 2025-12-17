/**
 * RevenueCat Webhook Handler
 * 
 * This edge function receives webhook events from RevenueCat
 * and syncs subscription status to the profiles table.
 * 
 * Setup in RevenueCat Dashboard:
 * 1. Go to Project Settings > Integrations > Webhooks
 * 2. Add webhook URL: https://klwolsopucgswhtdlsps.supabase.co/functions/v1/revenuecat-webhook
 * 3. Set authorization header: Bearer YOUR_WEBHOOK_SECRET
 * 4. Enable events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE
 * 
 * Required secrets:
 * - REVENUECAT_WEBHOOK_SECRET: Secret for validating webhook requests
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    entitlement_id?: string;
    expiration_at_ms?: number;
    purchased_at_ms?: number;
    original_app_user_id?: string;
  };
  api_version: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const authHeader = req.headers.get("authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error("[RC Webhook] Invalid authorization");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RevenueCatEvent = await req.json();
    const { event } = body;
    
    console.log("[RC Webhook] Received event:", event.type, "for user:", event.app_user_id);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID (RevenueCat app_user_id should be the Supabase user ID)
    const userId = event.app_user_id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("[RC Webhook] Invalid user ID format:", userId);
      return new Response(JSON.stringify({ error: "Invalid user ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan type from product ID
    const planType: 'monthly' | 'yearly' | null = 
      event.product_id?.includes('yearly') ? 'yearly' : 
      event.product_id?.includes('monthly') ? 'monthly' : null;

    // Calculate expiration date
    const expiresAt = event.expiration_at_ms 
      ? new Date(event.expiration_at_ms).toISOString() 
      : null;

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        // User gained/renewed premium
        console.log("[RC Webhook] Activating premium for user:", userId);
        
        const { error: activateError } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            plan_type: planType,
            premium_expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (activateError) {
          console.error("[RC Webhook] Error activating premium:", activateError);
          throw activateError;
        }
        break;

      case 'CANCELLATION':
        // User canceled but may still have access until period end
        console.log("[RC Webhook] Subscription canceled for user:", userId);
        // Don't remove premium yet - they have access until expiration
        // Just log for now, expiration will handle removal
        break;

      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        // User lost access
        console.log("[RC Webhook] Removing premium for user:", userId);
        
        const { error: deactivateError } = await supabase
          .from('profiles')
          .update({
            is_premium: false,
            plan_type: null,
            premium_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (deactivateError) {
          console.error("[RC Webhook] Error deactivating premium:", deactivateError);
          throw deactivateError;
        }
        break;

      default:
        console.log("[RC Webhook] Unhandled event type:", event.type);
    }

    // Also sync to subscriptions table for consistency
    if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'].includes(event.type)) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: planType,
          plan_tier: planType,
          status: 'active',
          currency: 'AED',
          price_cents: planType === 'yearly' ? 20000 : 3000,
          current_period_end: expiresAt,
          apple_product_id: event.product_id,
          features_granted: {
            ugc_collaboration: true,
            ai_tryon_limit: 10,
            early_access: true,
            premium_support: true
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subError) {
        console.error("[RC Webhook] Error syncing subscription:", subError);
      }
    } else if (['EXPIRATION', 'BILLING_ISSUE'].includes(event.type)) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: event.type === 'EXPIRATION' ? 'expired' : 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (subError) {
        console.error("[RC Webhook] Error updating subscription status:", subError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[RC Webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
