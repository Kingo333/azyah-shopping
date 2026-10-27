import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { planStorageRemoval, type StoredFile } from './storageCleanup.ts';

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

    // 🔒 Authenticate the caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

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

    const userId = user.id;
    console.log(`🗑️ Self-delete requested by user: ${userId}`);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const result: Record<string, unknown> = {
      user_id: userId,
      deleted_from_public: false,
      deleted_from_auth: false,
      storage_cleanup: false,
      errors: [] as string[],
    };

    // Step 1: Delete every stored file of this user (all folders: AI Studio,
    // closet, outfits, events, Live Cam snapshots, ...). The database lists
    // them; the storage API removes them (SQL can't delete storage files).
    let filesRemoved = 0;
    let listedAll = false;
    try {
      const { data: files, error: listError } = await supabaseAdmin
        .rpc('list_user_storage_objects', { target_user_id: userId });
      if (listError || !Array.isArray(files)) {
        console.warn('⚠️ Could not list stored files, using the old folder list:', listError?.message);
      } else {
        listedAll = true;
        for (const batch of planStorageRemoval(files as StoredFile[])) {
          const { error: removeError } = await supabaseAdmin.storage.from(batch.bucket).remove(batch.paths);
          if (removeError) {
            console.warn(`⚠️ Storage cleanup warning for ${batch.bucket}:`, removeError.message);
            (result.errors as string[]).push(`Storage cleanup failed for ${batch.bucket}`);
          } else {
            filesRemoved += batch.paths.length;
          }
        }
      }
    } catch (listException) {
      console.warn('⚠️ Stored file listing failed, using the old folder list:', listException);
    }
    result.storage_files_removed = filesRemoved;

    // Fallback (older database without list_user_storage_objects): first-level files only.
    const storageBuckets = listedAll ? [] : ['wardrobe', 'tryon', 'avatars', 'fits', 'post-images'];
    for (const bucket of storageBuckets) {
      try {
        const { data: files } = await supabaseAdmin.storage
          .from(bucket)
          .list(userId, { limit: 1000 });

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);
          const { error: removeError } = await supabaseAdmin.storage
            .from(bucket)
            .remove(filePaths);

          if (removeError) {
            console.warn(`⚠️ Storage cleanup warning for ${bucket}:`, removeError.message);
          } else {
            console.log(`✅ Cleaned ${files.length} files from ${bucket}/${userId}`);
          }
        }
      } catch (storageError) {
        // Bucket may not exist — that's fine
        console.warn(`⚠️ Bucket ${bucket} cleanup skipped:`, storageError);
      }
    }
    result.storage_cleanup = true;

    // Step 2: Use the comprehensive delete_user_completely RPC
    // This function is SECURITY DEFINER, granted only to service_role,
    // and cascades deletion through 25+ tables safely.
    console.log(`🗑️ Calling delete_user_completely for: ${userId}`);
    const { data: deleteResult, error: deleteError } = await supabaseAdmin
      .rpc('delete_user_completely', { target_user_id: userId });

    if (deleteError) {
      console.error('❌ delete_user_completely failed:', deleteError);
      (result.errors as string[]).push(`Database deletion failed: ${deleteError.message}`);
    } else if (deleteResult) {
      console.log('✅ delete_user_completely result:', deleteResult);
      result.deleted_from_public = deleteResult.success;
      result.deleted_counts = deleteResult.deleted_counts || {};

      if (!deleteResult.success && deleteResult.error) {
        (result.errors as string[]).push(`Database error: ${deleteResult.error}`);
      }
    }

    // Step 3: Delete the auth user
    console.log(`🗑️ Deleting auth user: ${userId}`);
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('❌ Auth user deletion failed:', authDeleteError);
      (result.errors as string[]).push(`Auth delete failed: ${authDeleteError.message}`);
    } else {
      result.deleted_from_auth = true;
      console.log('✅ Auth user deleted');
    }

    result.success = result.deleted_from_public || result.deleted_from_auth;

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    );

  } catch (error: any) {
    console.error('💥 Error in delete-account:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
