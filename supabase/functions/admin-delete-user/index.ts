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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 🔒 SECURITY: Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify user is authenticated
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 🔒 SECURITY: Verify admin role via database lookup
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userData?.role !== 'admin') {
      // Log unauthorized access attempt
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'unauthorized_admin_access_attempt',
          details: { attempted_action: 'user_deletion' },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ error: 'Admin privileges required', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { email, user_id, force_delete, justification, checkOnly } = await req.json();

    // Log admin action
    await supabaseAdmin
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: checkOnly ? 'admin_user_check' : 'admin_user_deletion',
        details: { target_email: email, target_user_id: user_id, justification },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    // If checkOnly is true, just return user status
    if (checkOnly) {
      let targetUserId = user_id;
      
      if (email && !user_id) {
        const { data: publicUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .ilike('email', email)
          .single();
        
        if (publicUser) {
          targetUserId = publicUser.id;
        }
      }

      const userFound = {
        inPublic: !!targetUserId,
        inAuth: false
      };

      if (targetUserId) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
        userFound.inAuth = !!authUser;
      }

      return new Response(
        JSON.stringify({ userFound }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗑️ Delete request for email: ${email}, user_id: ${user_id}, force: ${force_delete}`);

    let targetUserId = user_id;

    // If email provided, find user_id
    if (email && !user_id) {
      const { data: publicUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (publicUser) {
        targetUserId = publicUser.id;
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'User not found', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const result: any = {
      user_id: targetUserId,
      email: email,
      deleted_from_public: false,
      deleted_from_auth: false,
      errors: [],
      justification: justification || 'No justification provided'
    };

    // Step 1: Delete from public.users (triggers cascades)
    console.log(`🗑️ Deleting from public.users: ${targetUserId}`);
    const { error: publicError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (publicError) {
      console.error('❌ Failed to delete from public.users:', publicError);
      result.errors.push(`Public delete failed: ${publicError.message}`);
    } else {
      result.deleted_from_public = true;
      console.log('✅ Deleted from public.users');
    }

    // Step 2: Delete from auth.users using Admin API
    console.log(`🗑️ Deleting from auth.users: ${targetUserId}`);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error('❌ Failed to delete from auth.users:', authError);
      result.errors.push(`Auth delete failed: ${authError.message}`);
    } else {
      result.deleted_from_auth = true;
      console.log('✅ Deleted from auth.users');
    }

    result.success = result.deleted_from_public || result.deleted_from_auth;

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('💥 Error in admin-delete-user:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
