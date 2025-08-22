import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Ziina webhook source IP addresses for security (from documentation)
const ALLOWED_IPS = [
  '3.29.184.186',
  '3.29.190.95', 
  '20.233.47.127'
];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// HMAC verification helper following Ziina documentation
async function verifyHmacSignature(body: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !signature) return false;
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedHex;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET') || '';

    // Get client IP for security validation
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Webhook received from IP:', clientIP);

    // Validate source IP (following Ziina documentation)
    if (clientIP !== 'unknown' && !ALLOWED_IPS.includes(clientIP)) {
      console.warn('Webhook from unauthorized IP:', clientIP);
      // Note: You may want to disable this check in development
      // return jsonResponse({ error: 'Unauthorized IP' }, 403);
    }

    const body = await req.text();
    console.log('Webhook payload received:', body);

    // Verify HMAC signature if secret is provided
    if (webhookSecret) {
      const signature = req.headers.get('X-Hmac-Signature');
      if (!signature) {
        console.error('Missing HMAC signature');
        return jsonResponse({ error: 'Missing signature' }, 401);
      }

      const isValidSignature = await verifyHmacSignature(body, signature, webhookSecret);
      if (!isValidSignature) {
        console.error('Invalid HMAC signature');
        return jsonResponse({ error: 'Invalid signature' }, 401);
      }
      console.log('HMAC signature verified successfully');
    }

    const event = JSON.parse(body);
    console.log('Parsed webhook event:', event);

    // Validate event structure following Ziina documentation
    if (!event?.event || !event?.data?.id || !event?.data?.status) {
      console.error('Invalid webhook payload structure:', event);
      return jsonResponse({ error: 'Invalid payload structure' }, 400);
    }

    // Only handle payment intent status updates
    if (event.event !== 'payment_intent.status.updated') {
      console.log('Ignoring event type:', event.event);
      return jsonResponse({ ok: true, note: 'Event type not handled' });
    }

    const paymentIntent = event.data;
    console.log('Processing payment intent update:', {
      id: paymentIntent.id,
      status: paymentIntent.status
    });

    // Initialize Supabase service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for idempotency - store webhook event
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('processed')
      .eq('pi_id', paymentIntent.id)
      .eq('event', event.event)
      .eq('processed', true)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Webhook already processed for PI: ${paymentIntent.id}`);
      return jsonResponse({ ok: true, note: 'Already processed' });
    }

    // Store webhook event for idempotency
    await supabase
      .from('webhook_events')
      .insert({
        provider: 'ziina',
        event: event.event,
        pi_id: paymentIntent.id,
        raw_body: event,
        signature: req.headers.get('X-Hmac-Signature'),
        ip: clientIP,
        processed: false
      });

    // Find subscription by payment intent ID
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('last_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching subscription:', fetchError);
      return jsonResponse({ error: 'Database error' }, 500);
    }

    if (!subscription) {
      console.log('No matching subscription found for payment intent:', paymentIntent.id);
      return jsonResponse({ ok: true, note: 'No matching subscription found' });
    }

    console.log('Found subscription:', subscription.id, 'for user:', subscription.user_id);

    const now = new Date();
    let updates: Record<string, unknown> = {
      last_payment_status: paymentIntent.status,
      updated_at: now.toISOString(),
    };

    // Handle different payment statuses following Ziina documentation
    if (paymentIntent.status === 'completed') {
      // Payment successful - activate premium for 30 days
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      updates = {
        ...updates,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      };

      console.log('Activating premium subscription until:', periodEnd.toISOString());
    } else if (['failed', 'canceled'].includes(paymentIntent.status)) {
      // Payment failed or canceled
      updates = {
        ...updates,
        status: 'inactive',
      };

      console.log('Payment failed/canceled, setting status to inactive');
    } else {
      console.log('Payment status update:', paymentIntent.status, 'no action needed');
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return jsonResponse({ error: 'Failed to update subscription' }, 500);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('pi_id', paymentIntent.id)
      .eq('event', event.event);

    console.log('Subscription updated successfully:', {
      subscriptionId: subscription.id,
      status: updates.status,
      userId: subscription.user_id
    });

    return jsonResponse({ ok: true, status: 'processed' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});