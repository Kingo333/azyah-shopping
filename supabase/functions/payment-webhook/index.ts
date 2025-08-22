
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
    tip_amount: z.number().default(0),
    latest_error: z.object({
      message: z.string(),
      code: z.string()
    }).nullable()
  })
});

// FIXED: Synchronous HMAC verification using built-in crypto
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const dataBytes = encoder.encode(rawBody);
    
    // Create HMAC using Web Crypto API synchronously
    const keyPromise = crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // This is still async, but we handle it properly
    return keyPromise.then(key => 
      crypto.subtle.sign('HMAC', key, dataBytes)
    ).then(signatureBuffer => {
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log('[Ziina Webhook] Signature verification:', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...',
        rawBodyLength: rawBody.length,
        secretLength: secret.length
      });
      
      return signature === expectedSignature;
    }).catch(error => {
      console.error('[Ziina Webhook] Signature verification failed:', error);
      return false;
    });
  } catch (error) {
    console.error('[Ziina Webhook] Signature verification error:', error);
    return false;
  }
}

function isAllowedIP(ip: string): boolean {
  const allowedIPs = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];
  const isAllowed = allowedIPs.includes(ip);
  
  console.log('[Ziina Webhook] IP verification:', { 
    ip, 
    allowed: isAllowed,
    allowedIPs 
  });
  
  return isAllowed;
}

async function createBodyHash(rawBody: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawBody);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('[Ziina Webhook] Invalid method:', req.method);
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('[Ziina Webhook] ZIINA_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Get raw body and headers
    const rawBody = await req.text();
    const signature = req.headers.get('X-Hmac-Signature') || '';
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || '';

    console.log('[Ziina Webhook] Received webhook:', { 
      signature: signature.substring(0, 10) + '...', 
      ip: clientIP,
      bodyLength: rawBody.length,
      timestamp: new Date().toISOString()
    });

    // Verify IP allowlist (enhanced security)
    if (clientIP && !isAllowedIP(clientIP)) {
      console.error('[Ziina Webhook] Unauthorized IP:', clientIP);
      return new Response('Unauthorized IP', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Verify HMAC signature (FIXED: proper async handling)
    const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('[Ziina Webhook] Invalid signature verification failed');
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Parse and validate payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[Ziina Webhook] JSON parse error:', parseError);
      return new Response('Invalid JSON', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const validatedPayload = WebhookPayloadSchema.parse(payload);

    console.log('[Ziina Webhook] Valid payload received:', {
      event: validatedPayload.event,
      payment_intent_id: validatedPayload.data.id,
      status: validatedPayload.data.status,
      operation_id: validatedPayload.data.operation_id
    });

    // Only process payment_intent.status.updated events
    if (validatedPayload.event !== 'payment_intent.status.updated') {
      console.log('[Ziina Webhook] Ignoring non-payment-intent event:', validatedPayload.event);
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Create unique hash for idempotency (enhanced)
    const bodyHash = await createBodyHash(rawBody);

    // Check if we've already processed this webhook (idempotency)
    const { data: existingEvent } = await supabaseService
      .from('webhook_events')
      .select('id, processed')
      .eq('signature', bodyHash)
      .single();

    if (existingEvent?.processed) {
      console.log('[Ziina Webhook] Already processed webhook, skipping:', bodyHash);
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Store/update webhook event
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
      console.error('[Ziina Webhook] Failed to store webhook event:', eventError);
      return new Response('Database error storing event', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Update payment status with enhanced error handling
    const { data: existingPayment, error: fetchError } = await supabaseService
      .from('payments')
      .select('id, status, user_id')
      .eq('payment_intent_id', validatedPayload.data.id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('[Ziina Webhook] Payment not found:', {
        payment_intent_id: validatedPayload.data.id,
        error: fetchError
      });
      
      // Mark webhook as processed even if payment not found
      await supabaseService
        .from('webhook_events')
        .update({ processed: true })
        .eq('signature', bodyHash);
        
      return new Response('Payment not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Update payment with all relevant fields
    const { error: updateError } = await supabaseService
      .from('payments')
      .update({
        status: validatedPayload.data.status,
        fee_amount_fils: validatedPayload.data.fee_amount,
        tip_amount_fils: validatedPayload.data.tip_amount || 0,
        latest_error_message: validatedPayload.data.latest_error?.message,
        latest_error_code: validatedPayload.data.latest_error?.code,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', validatedPayload.data.id);

    if (updateError) {
      console.error('[Ziina Webhook] Failed to update payment:', updateError);
      return new Response('Database error updating payment', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Mark webhook as processed
    await supabaseService
      .from('webhook_events')
      .update({ processed: true })
      .eq('signature', bodyHash);

    const processingTime = Date.now() - startTime;
    
    console.log('[Ziina Webhook] Successfully processed:', {
      payment_intent_id: validatedPayload.data.id,
      old_status: existingPayment.status,
      new_status: validatedPayload.data.status,
      user_id: existingPayment.user_id,
      processing_time_ms: processingTime
    });

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Ziina Webhook] Processing error:', {
      error: error.message,
      stack: error.stack,
      processing_time_ms: processingTime
    });
    
    if (error instanceof z.ZodError) {
      console.error('[Ziina Webhook] Validation errors:', error.errors);
      return new Response('Invalid payload structure', { 
        status: 400,
        headers: corsHeaders 
      });
    }
    
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
