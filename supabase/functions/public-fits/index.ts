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
        user_id,
        title,
        render_path,
        image_preview,
        like_count,
        created_at
      `)
      .eq('is_public', true)
      .range(offset, offset + limit - 1);

    if (sort === 'popular') {
      query = query.order('like_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: fitsData, error: fitsError } = await query;

    if (fitsError) throw fitsError;

    // Get unique user IDs and fetch their public profiles
    const userIds = [...new Set(fitsData?.map(f => f.user_id) || [])];
    
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseClient
        .from('users_public')
        .select('id, username, name, avatar_url')
        .in('id', userIds);
      
      if (usersData) {
        usersMap = usersData.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Transform data
    const fits = (fitsData || []).map(fit => {
      const user = usersMap[fit.user_id];
      return {
        id: fit.id,
        user_id: fit.user_id,
        title: fit.title,
        render_path: fit.render_path,
        image_preview: fit.image_preview,
        like_count: fit.like_count,
        created_at: fit.created_at,
        creator_username: user?.username || null,
        creator_name: user?.name || null,
        creator_avatar: user?.avatar_url || null,
      };
    });

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
