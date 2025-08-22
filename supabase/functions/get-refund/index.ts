
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RefundSchema = z.object({
  id: z.string(),
  payment_intent_id: z.string(),
  amount: z.number(),
  currency_code: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.string(),
  error: z.object({
    message: z.string(),
    code: z.string()
  }).nullable()
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const refundId = url.pathname.split('/').pop();

    if (!refundId) {
      return jsonResponse({ error: 'Refund ID required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE') || 'https://api-v2.ziina.com/api';
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN')!;

    // Initialize Supabase client for user authentication
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header required' }, 401);
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    // Check if user is admin (for refund access)
    if (authError || !user) {
      console.error('Auth error:', authError);
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // Check if user is admin
    const { data: userData, error: userError } = await supabaseService
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return jsonResponse({ error: 'Admin access required for refund data' }, 403);
    }

    console.log(`Fetching refund: ${refundId} for admin user: ${user.id}`);

    // Get refund details from Ziina
    const ziinaResponse = await fetch(`${ziinaApiBase}/refund/${refundId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!ziinaResponse.ok) {
      const errorData = await ziinaResponse.json();
      console.error('Ziina API error:', errorData);
      return jsonResponse({ 
        error: 'Failed to fetch refund details',
        details: errorData
      }, ziinaResponse.status);
    }

    const refundData = await ziinaResponse.json();
    const refund = RefundSchema.parse(refundData);

    console.log('Refund fetched successfully:', { 
      id: refund.id, 
      status: refund.status,
      amount: refund.amount 
    });

    return jsonResponse({
      id: refund.id,
      payment_intent_id: refund.payment_intent_id,
      amount: refund.amount,
      currency: refund.currency_code,
      status: refund.status,
      created_at: refund.created_at,
      error_message: refund.error?.message,
      error_code: refund.error?.code
    });

  } catch (error) {
    console.error('Error in get-refund:', error);
    
    if (error instanceof z.ZodError) {
      return jsonResponse({ 
        error: 'Validation error',
        details: error.errors 
      }, 400);
    }
    
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
