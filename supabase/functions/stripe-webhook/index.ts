import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
      console.error('❌ Stripe secrets not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500 }
      );
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No Stripe signature header');
      return new Response('No signature', { status: 400 });
    }

    const body = await req.text();
    
    // 🔒 SECURITY: Verify Stripe webhook signature
    console.log('🎫 Stripe webhook received, verifying signature...');
    
    // Import Stripe SDK
    const Stripe = (await import('https://esm.sh/stripe@13.11.0?target=deno')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      console.log('✅ Stripe signature verified, event type:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400 }
      );
    }
    
    // Handle subscription events
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log(`📋 Handling ${event.type} event`);
        // TODO: Implement subscription management logic
        // Update user subscription status in database
        break;
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in stripe-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
