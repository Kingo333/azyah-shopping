import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ziina allowed IPs for webhook verification
const ALLOWED_IPS = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];

async function verifyHmacSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('HMAC verification failed:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('ZIINA_WEBHOOK_SECRET not configured');
    }

    // Get client IP (in development, skip IP validation)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Verify IP allowlist for production security
    if (!ALLOWED_IPS.includes(clientIP)) {
      console.error('Unauthorized IP:', clientIP);
      return new Response('Unauthorized', { status: 403 });
    }

    // Get raw body for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-hmac-signature');

    if (!signature) {
      console.error('Missing HMAC signature');
      return new Response('Missing signature', { status: 400 });
    }

    // Verify HMAC signature
    const isValidSignature = await verifyHmacSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('Invalid HMAC signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse webhook payload
    const webhookData = JSON.parse(rawBody);
    const paymentIntentId = webhookData.payment_intent?.id;
    const eventType = webhookData.event;
    const status = webhookData.payment_intent?.status;

    if (!paymentIntentId || !eventType) {
      console.error('Invalid webhook payload:', { paymentIntentId, eventType });
      return new Response('Invalid payload', { status: 400 });
    }

    console.log('Webhook received:', {
      stage: 'WEBHOOK',
      event: eventType,
      payment_intent_id: paymentIntentId,
      status,
      ip: clientIP
    });

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for idempotency
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('pi_id', paymentIntentId)
      .eq('event', eventType)
      .single();

    if (existingEvent) {
      console.log('Webhook already processed (idempotent)');
      return new Response('OK', { status: 200 });
    }

    // Store webhook event for idempotency
    await supabase.from('webhook_events').insert({
      provider: 'ziina',
      event: eventType,
      pi_id: paymentIntentId,
      raw_body: webhookData,
      signature,
      ip: clientIP,
      processed: false
    });

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
    }

    // Handle successful payment
    if (status === 'succeeded') {
      // Get payment record to find user
      const { data: payment } = await supabase
        .from('payments')
        .select('user_id')
        .eq('payment_intent_id', paymentIntentId)
        .single();

      if (payment?.user_id) {
        const currentDate = new Date();
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 30);

        // Check if user has existing subscription
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', payment.user_id)
          .single();

        if (existingSubscription) {
          // Update existing subscription
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: currentDate.toISOString(),
              current_period_end: periodEnd.toISOString(),
              last_payment_intent_id: paymentIntentId,
              last_payment_status: status,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);
        } else {
          // Create new subscription
          await supabase
            .from('subscriptions')
            .insert({
              user_id: payment.user_id,
              provider: 'ziina',
              plan: 'consumer_premium',
              status: 'active',
              current_period_start: currentDate.toISOString(),
              current_period_end: periodEnd.toISOString(),
              last_payment_intent_id: paymentIntentId,
              last_payment_status: status
            });
        }

        console.log('Subscription activated via webhook:', {
          stage: 'SUCCESS',
          user_id: payment.user_id,
          payment_intent_id: paymentIntentId
        });
      }
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('pi_id', paymentIntentId)
      .eq('event', eventType);

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});