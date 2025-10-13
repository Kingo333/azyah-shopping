import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({ 
          available: false, 
          error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if username exists (case-insensitive)
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check username availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const available = !data;

    // Generate suggestions if username is taken
    let suggestions: string[] = [];
    if (!available) {
      suggestions = [
        `${username}_${Math.floor(Math.random() * 100)}`,
        `${username}${new Date().getFullYear()}`,
        `${username}_official`
      ];
    }

    return new Response(
      JSON.stringify({ available, suggestions: available ? undefined : suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in username-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
