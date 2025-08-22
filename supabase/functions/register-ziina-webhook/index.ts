import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ziinaApiBase = Deno.env.get('ZIINA_API_BASE')!;
const ziinaApiToken = Deno.env.get('ZIINA_API_TOKEN')!;
const webhookSecret = Deno.env.get('ZIINA_WEBHOOK_SECRET')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('Registering Ziina webhook...');

    // Extract project ID from Supabase URL
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectId) {
      throw new Error('Could not extract project ID from Supabase URL');
    }

    // Construct webhook URL
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/ziina-webhook`;
    
    console.log('Webhook URL:', webhookUrl);
    console.log('Using webhook secret:', webhookSecret ? 'Set' : 'Not set');

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
    });

    const responseBody = await ziinaResponse.json();
    console.log('Ziina webhook registration response:', { 
      status: ziinaResponse.status, 
      body: responseBody 
    });

    if (!ziinaResponse.ok) {
      console.error('Ziina webhook registration failed:', responseBody);
      return jsonResponse({ 
        error: responseBody?.error || 'Webhook registration failed',
        details: responseBody
      }, ziinaResponse.status);
    }

    return jsonResponse({
      success: true,
      webhook_url: webhookUrl,
      webhook_id: responseBody.id,
      message: 'Webhook registered successfully'
    });

  } catch (error) {
    console.error('Error in register-ziina-webhook:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});