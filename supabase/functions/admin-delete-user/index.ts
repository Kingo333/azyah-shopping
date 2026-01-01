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

    // If email provided, find user_id from public.users first
    if (email && !user_id) {
      const { data: publicUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', email)
        .single();

      if (publicUser) {
        targetUserId = publicUser.id;
      } else {
        // User not in public.users - try to find in auth.users by email
        console.log(`📧 User not in public.users, checking auth.users for email: ${email}`);
        const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (!listError && authUsers) {
          const authUser = authUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (authUser) {
            targetUserId = authUser.id;
            console.log(`✅ Found user in auth.users: ${targetUserId}`);
          }
        }
      }
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'User not found in public.users or auth.users', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const result: any = {
      user_id: targetUserId,
      email: email,
      deleted_from_public: false,
      deleted_from_auth: false,
      deleted_counts: {},
      errors: [],
      justification: justification || 'No justification provided'
    };

    // Step 1: Use the comprehensive delete_user_completely function
    console.log(`🗑️ Calling delete_user_completely for: ${targetUserId}`);
    const { data: deleteResult, error: deleteError } = await supabaseAdmin
      .rpc('delete_user_completely', { target_user_id: targetUserId });

    if (deleteError) {
      console.error('❌ delete_user_completely failed:', deleteError);
      result.errors.push(`Database deletion failed: ${deleteError.message}`);
    } else if (deleteResult) {
      console.log('✅ delete_user_completely result:', deleteResult);
      result.deleted_from_public = deleteResult.success;
      result.deleted_counts = deleteResult.deleted_counts || {};
      
      if (!deleteResult.success && deleteResult.error) {
        result.errors.push(`Database error: ${deleteResult.error}`);
      }
    }

    // Step 2: Delete from auth.users using Admin API (always attempt)
    console.log(`🗑️ Deleting from auth.users: ${targetUserId}`);
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      console.error('❌ Failed to delete from auth.users:', authDeleteError);
      result.errors.push(`Auth delete failed: ${authDeleteError.message}`);
    } else {
      result.deleted_from_auth = true;
      console.log('✅ Deleted from auth.users');
    }

    result.success = result.deleted_from_public || result.deleted_from_auth;

    // Verification: Check if user is fully deleted
    const { data: verifyPublic } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .single();
    
    const { data: verifyAuth } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    
    result.verification = {
      still_in_public: !!verifyPublic,
      still_in_auth: !!verifyAuth?.user,
      fully_deleted: !verifyPublic && !verifyAuth?.user
    };

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
