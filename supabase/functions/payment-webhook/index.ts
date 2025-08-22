
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
    fee_amount: z.number().nullable().optional(),
    tip_amount: z.number().optional().default(0),
    latest_error: z.object({
      message: z.string(),
      code: z.string()
    }).nullable().optional()
  })
});

// Verify HMAC signature
async function verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const dataBytes = encoder.encode(rawBody);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBytes);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

function isAllowedIP(ip: string): boolean {
  const allowedIPs = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];
  return allowedIPs.includes(ip);
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
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('ZIINA_WEBHOOK_SECRET not configured');
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

    console.log('Webhook received:', { 
      signature: signature.substring(0, 10) + '...', 
      ip: clientIP,
      bodyLength: rawBody.length
    });

    // Verify IP allowlist
    if (clientIP && !isAllowedIP(clientIP)) {
      console.error('Unauthorized IP:', clientIP);
      return new Response('Unauthorized IP', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Verify HMAC signature
    const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('Invalid signature');
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response('Invalid JSON', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const validatedPayload = WebhookPayloadSchema.parse(payload);

    console.log('Valid webhook payload:', {
      event: validatedPayload.event,
      payment_intent_id: validatedPayload.data.id,
      status: validatedPayload.data.status
    });

    // Only process payment_intent.status.updated events
    if (validatedPayload.event !== 'payment_intent.status.updated') {
      console.log('Ignoring non-payment-intent event:', validatedPayload.event);
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Create unique hash for idempotency
    const bodyHash = await createBodyHash(rawBody);

    // Check if already processed
    const { data: existingEvent } = await supabaseService
      .from('webhook_events')
      .select('id, processed')
      .eq('signature', bodyHash)
      .single();

    if (existingEvent?.processed) {
      console.log('Already processed webhook, skipping:', bodyHash);
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
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
      return new Response('Database error storing event', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Update payment status
    const { data: existingPayment, error: fetchError } = await supabaseService
      .from('payments')
      .select('id, status, user_id')
      .eq('payment_intent_id', validatedPayload.data.id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('Payment not found:', {
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

    // Update payment
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
      console.error('Failed to update payment:', updateError);
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
    
    console.log('Successfully processed webhook:', {
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
    
    console.error('Webhook processing error:', {
      error: error.message,
      processing_time_ms: processingTime
    });
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
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
