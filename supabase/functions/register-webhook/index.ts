
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const ziinaApiBase = Deno.env.get('ZIINA_API_BASE');
    const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN');
    const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!ziinaApiBase || !ziinaApiToken || !webhookSecret || !supabaseUrl) {
      return jsonResponse({ 
        error: 'Missing environment variables',
        env_check: {
          ZIINA_API_BASE: !!ziinaApiBase,
          ZIINA_API_TOKEN: !!ziinaApiToken,
          ZIINA_WEBHOOK_SECRET: !!webhookSecret,
          SUPABASE_URL: !!supabaseUrl
        }
      }, 500);
    }

    // Extract project ID from Supabase URL
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectId) {
      return jsonResponse({ error: 'Could not extract project ID from Supabase URL' }, 500);
    }

    // Construct webhook URL
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/payment-webhook`;
    
    console.log('Registering webhook:', {
      url: webhookUrl,
      hasSecret: !!webhookSecret
    });

    // Register webhook with Ziina
    const webhookPayload = {
      url: webhookUrl,
      secret: webhookSecret
    };

    const ziinaResponse = await fetch(`${ziinaApiBase}/webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ziinaApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await ziinaResponse.json();
    
    console.log('Ziina webhook registration response:', { 
      status: ziinaResponse.status, 
      body: responseBody 
    });

    if (!ziinaResponse.ok) {
      return jsonResponse({ 
        error: 'Webhook registration failed',
        upstream_status: ziinaResponse.status,
        details: responseBody
      }, ziinaResponse.status);
    }

    return jsonResponse({
      success: true,
      webhook_url: webhookUrl,
      message: 'Webhook registered successfully with Ziina'
    });

  } catch (error) {
    console.error('Error in register-webhook:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
