
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WebhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    currency_code: z.string(),
    status: z.enum(['requires_payment_instrument', 'requires_user_action', 'pending', 'completed', 'failed', 'canceled']),
    operation_id: z.string(),
    fee_amount: z.number().nullable(),
    latest_error: z.object({
      message: z.string(),
      code: z.string()
    }).nullable()
  })
});

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(rawBody);
  
  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => 
    crypto.subtle.sign('HMAC', cryptoKey, data)
  ).then(signature_buffer => {
    const expectedSignature = Array.from(new Uint8Array(signature_buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return signature === expectedSignature;
  }).catch(() => false);
}

function isAllowedIP(ip: string): boolean {
  const allowedIPs = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];
  return allowedIPs.includes(ip);
}

function createBodyHash(rawBody: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawBody);
  return crypto.subtle.digest('SHA-256', data).then(hash => 
    Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('ZIINA_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Get raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get('X-Hmac-Signature') || '';
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || '';

    console.log('Webhook received:', { 
      signature: signature.substring(0, 10) + '...', 
      ip: clientIP,
      bodyLength: rawBody.length 
    });

    // Verify IP allowlist
    if (clientIP && !isAllowedIP(clientIP)) {
      console.error('Webhook from unauthorized IP:', clientIP);
      return new Response('Unauthorized IP', { status: 403 });
    }

    // Verify HMAC signature
    const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse and validate payload
    const payload = JSON.parse(rawBody);
    const validatedPayload = WebhookPayloadSchema.parse(payload);

    console.log('Valid webhook payload:', {
      event: validatedPayload.event,
      payment_intent_id: validatedPayload.data.id,
      status: validatedPayload.data.status
    });

    // Only process payment_intent.status.updated events
    if (validatedPayload.event !== 'payment_intent.status.updated') {
      console.log('Ignoring non-payment-intent event:', validatedPayload.event);
      return new Response('OK', { status: 200 });
    }

    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Create unique hash for idempotency
    const bodyHash = await createBodyHash(rawBody);

    // Check if we've already processed this webhook
    const { data: existingEvent } = await supabaseService
      .from('webhook_events')
      .select('id')
      .eq('signature', bodyHash)
      .eq('processed', true)
      .single();

    if (existingEvent) {
      console.log('Webhook already processed, skipping');
      return new Response('OK', { status: 200 });
    }

    // Store webhook event
    const { error: eventError } = await supabaseService
      .from('webhook_events')
      .upsert({
        provider: 'ziina',
        event: validatedPayload.event,
        pi_id: validatedPayload.data.id,
        raw_body: payload,
        signature: bodyHash,
        ip: clientIP,
        processed: false
      }, {
        onConflict: 'signature'
      });

    if (eventError) {
      console.error('Failed to store webhook event:', eventError);
      return new Response('Database error', { status: 500 });
    }

    // Update payment status
    const { error: updateError } = await supabaseService
      .from('payments')
      .update({
        status: validatedPayload.data.status,
        fee_amount_fils: validatedPayload.data.fee_amount,
        latest_error_message: validatedPayload.data.latest_error?.message,
        latest_error_code: validatedPayload.data.latest_error?.code,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', validatedPayload.data.id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return new Response('Database error', { status: 500 });
    }

    // Mark webhook as processed
    await supabaseService
      .from('webhook_events')
      .update({ processed: true })
      .eq('signature', bodyHash);

    console.log('Webhook processed successfully:', {
      payment_intent_id: validatedPayload.data.id,
      new_status: validatedPayload.data.status
    });

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return new Response('Invalid payload', { status: 400 });
    }
    
    return new Response('Internal error', { status: 500 });
  }
});
