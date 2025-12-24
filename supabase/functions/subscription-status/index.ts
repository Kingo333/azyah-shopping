import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: Return current subscription (using safe view to exclude sensitive columns)
    if (req.method === 'GET') {
      const { data: subscription, error } = await supabaseClient
        .from('subscriptions_safe')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Update subscription plan
    if (req.method === 'POST') {
      const { plan } = await req.json();

      if (!plan || !['free', 'monthly', 'yearly'].includes(plan)) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const planConfig = {
        free: { price_cents: 0, duration_days: 30 },
        monthly: { price_cents: 3000, duration_days: 30 }, // AED 30
        yearly: { price_cents: 20000, duration_days: 365 }, // AED 200
      };

      const config = planConfig[plan as keyof typeof planConfig];
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + config.duration_days);

      const features = plan === 'free' ? {} : {
        ugc_collaboration: true,
        ai_tryon_limit: 10,
        early_access: true,
        premium_support: true
      };

      // Upsert subscription
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_tier: plan,
          status: 'active',
          currency: 'AED',
          price_cents: config.price_cents,
          features_granted: features,
          renewal_at: plan !== 'free' ? renewalDate.toISOString() : null,
          plan: plan, // Keep for backward compatibility
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, subscription: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in subscription-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
