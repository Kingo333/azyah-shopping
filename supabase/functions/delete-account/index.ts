import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { removeAllUserFiles, type StoredFile } from './storageCleanup.ts';

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

    // Step 1: Delete the account's data with the comprehensive delete_user_completely RPC
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

    if (result.deleted_from_public) {
      // Step 2: Delete this user's stored files (all folders: AI Studio,
      // closet, outfits, events, Live Cam snapshots, ...). Runs AFTER the
      // database deletion, so files still used by rows that remain (starter
      // items in other closets, products that outlive a store, other people's
      // outfits) are kept by list_user_storage_objects. The storage API removes
      // them (SQL can't delete storage files).
      // The list comes back in pages (about 1000 rows), so this repeats until
      // nothing is left.
      const cleanup = await removeAllUserFiles(
        async () => {
          try {
            const { data: files, error: listError } = await supabaseAdmin
              .rpc('list_user_storage_objects', { target_user_id: userId });
            if (listError || !Array.isArray(files)) {
              console.warn('⚠️ Could not list stored files:', listError?.message);
              return null;
            }
            return files as StoredFile[];
          } catch (listException) {
            console.warn('⚠️ Stored file listing failed:', listException);
            return null;
          }
        },
        async (bucket, paths) => {
          const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
          if (removeError) {
            console.warn(`⚠️ Storage cleanup warning for ${bucket}:`, removeError.message);
            (result.errors as string[]).push(`Storage cleanup failed for ${bucket}`);
            return false;
          }
          return true;
        },
      );
      const listedAll = cleanup.listed;
      result.storage_files_removed = cleanup.removed;
      if (cleanup.listed && !cleanup.complete) {
        (result.errors as string[]).push('Some stored files could not be removed');
      }

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

    } else {
      // The account data is still there: keep the files too.
      console.warn('⚠️ Database deletion did not finish; stored files kept');
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
