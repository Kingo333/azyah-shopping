import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Target currencies we need rates for
const TARGET_CURRENCIES = ['AED', 'SAR', 'EUR', 'GBP', 'QAR', 'KWD', 'BHD', 'OMR'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for database writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch rates from frankfurter.app (free, no API key needed)
    // Base USD to get all conversion rates
    const apiUrl = `https://api.frankfurter.app/latest?from=USD&to=${TARGET_CURRENCIES.join(',')}`;
    
    console.log('[refresh-fx-rates] Fetching rates from:', apiUrl);
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[refresh-fx-rates] Received rates:', data);

    // Prepare upsert data
    const ratesToUpsert: Array<{
      base_currency: string;
      quote_currency: string;
      rate: number;
      updated_at: string;
      source: string;
    }> = [];
    const now = new Date().toISOString();
    
    // USD to each target currency
    for (const [currency, rate] of Object.entries(data.rates)) {
      ratesToUpsert.push({
        base_currency: 'USD',
        quote_currency: currency,
        rate: rate as number,
        updated_at: now,
        source: 'frankfurter.app'
      });
      
      // Also add reverse rate (currency to USD)
      ratesToUpsert.push({
        base_currency: currency,
        quote_currency: 'USD',
        rate: 1 / (rate as number),
        updated_at: now,
        source: 'frankfurter.app'
      });
    }
    
    // Add key cross-rates (AED <-> SAR, etc.)
    const aedRate = (data.rates['AED'] as number) || 3.67;
    const sarRate = (data.rates['SAR'] as number) || 3.75;
    const eurRate = (data.rates['EUR'] as number) || 0.92;
    const gbpRate = (data.rates['GBP'] as number) || 0.79;
    
    // AED <-> SAR
    ratesToUpsert.push({
      base_currency: 'AED',
      quote_currency: 'SAR',
      rate: sarRate / aedRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    ratesToUpsert.push({
      base_currency: 'SAR',
      quote_currency: 'AED',
      rate: aedRate / sarRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    
    // AED <-> EUR
    ratesToUpsert.push({
      base_currency: 'AED',
      quote_currency: 'EUR',
      rate: eurRate / aedRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    ratesToUpsert.push({
      base_currency: 'EUR',
      quote_currency: 'AED',
      rate: aedRate / eurRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    
    // AED <-> GBP
    ratesToUpsert.push({
      base_currency: 'AED',
      quote_currency: 'GBP',
      rate: gbpRate / aedRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    ratesToUpsert.push({
      base_currency: 'GBP',
      quote_currency: 'AED',
      rate: aedRate / gbpRate,
      updated_at: now,
      source: 'frankfurter.app'
    });

    // EUR <-> GBP
    ratesToUpsert.push({
      base_currency: 'EUR',
      quote_currency: 'GBP',
      rate: gbpRate / eurRate,
      updated_at: now,
      source: 'frankfurter.app'
    });
    ratesToUpsert.push({
      base_currency: 'GBP',
      quote_currency: 'EUR',
      rate: eurRate / gbpRate,
      updated_at: now,
      source: 'frankfurter.app'
    });

    // Upsert all rates
    const { error: upsertError } = await supabaseAdmin
      .from('fx_rates')
      .upsert(ratesToUpsert, { 
        onConflict: 'base_currency,quote_currency' 
      });

    if (upsertError) {
      console.error('[refresh-fx-rates] Upsert error:', upsertError);
      throw upsertError;
    }

    console.log(`[refresh-fx-rates] Successfully updated ${ratesToUpsert.length} rates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: ratesToUpsert.length,
        rates: data.rates,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[refresh-fx-rates] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
