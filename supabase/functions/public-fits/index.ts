import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const sort = url.searchParams.get('sort') || 'popular';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseClient
      .from('fits')
      .select(`
        id,
        title,
        render_path,
        like_count,
        created_at,
        users!fits_user_id_fkey (
          username,
          name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .range(offset, offset + limit - 1);

    if (sort === 'popular') {
      query = query.order('like_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data
    const fits = data.map(fit => ({
      id: fit.id,
      title: fit.title,
      render_path: fit.render_path,
      like_count: fit.like_count,
      created_at: fit.created_at,
      creator_username: fit.users?.username || 'Unknown',
      creator_name: fit.users?.name,
      creator_avatar: fit.users?.avatar_url,
    }));

    return new Response(JSON.stringify({ fits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
