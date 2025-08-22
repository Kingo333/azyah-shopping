import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@2.39.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  deleted_assets_count: number;
  deleted_jobs_count: number;
  deleted_files_count: number;
  cleanup_summary: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting AI results cleanup process...');
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Get assets that will be deleted (for storage cleanup)
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    console.log(`Cleaning up assets older than: ${cutoffTime}`);
    
    const { data: assetsToDelete, error: fetchError } = await supabase
      .from('ai_assets')
      .select('asset_url')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      console.error('Error fetching assets to delete:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${assetsToDelete?.length || 0} assets to clean up`);

    // Step 2: Delete files from Supabase Storage
    let storageDeletedCount = 0;
    if (assetsToDelete && assetsToDelete.length > 0) {
      for (const asset of assetsToDelete) {
        if (asset.asset_url) {
          try {
            // Extract file path from URL for different storage buckets
            const url = new URL(asset.asset_url);
            const pathParts = url.pathname.split('/');
            
            // Handle different bucket structures
            let bucketName = 'tryon'; // default bucket
            let filePath = '';
            
            if (pathParts.includes('storage') && pathParts.includes('v1') && pathParts.includes('object')) {
              const objectIndex = pathParts.indexOf('object');
              if (objectIndex + 1 < pathParts.length) {
                bucketName = pathParts[objectIndex + 1];
                filePath = pathParts.slice(objectIndex + 2).join('/');
              }
            }
            
            if (filePath) {
              const { error: deleteError } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);
              
              if (deleteError) {
                console.error(`Error deleting file ${filePath} from bucket ${bucketName}:`, deleteError);
              } else {
                storageDeletedCount++;
                console.log(`Deleted file: ${bucketName}/${filePath}`);
              }
            }
          } catch (urlError) {
            console.error(`Error parsing asset URL ${asset.asset_url}:`, urlError);
          }
        }
      }
    }

    // Step 3: Run database cleanup function
    console.log('Running database cleanup function...');
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_old_ai_assets');

    if (cleanupError) {
      console.error('Error running cleanup function:', cleanupError);
      throw cleanupError;
    }

    const result = cleanupResult?.[0] as CleanupResult;
    console.log('Database cleanup completed:', result);

    // Step 4: Attempt BitStudio cleanup (if applicable)
    // Note: This would require BitStudio API documentation for delete endpoints
    let bitStudioCleanupAttempted = false;
    try {
      const bitStudioApiKey = Deno.env.get('BITSTUDIO_API_KEY');
      const bitStudioApiBase = Deno.env.get('BITSTUDIO_API_BASE');
      
      if (bitStudioApiKey && bitStudioApiBase && assetsToDelete) {
        // This is a placeholder for potential BitStudio cleanup
        // Would need actual API documentation for image deletion
        console.log('BitStudio cleanup capability detected but not implemented (API documentation needed)');
        bitStudioCleanupAttempted = true;
      }
    } catch (bitStudioError) {
      console.error('BitStudio cleanup error:', bitStudioError);
    }

    // Step 5: Log cleanup completion
    const cleanupSummary = {
      timestamp: new Date().toISOString(),
      database_assets_deleted: result?.deleted_assets_count || 0,
      database_jobs_deleted: result?.deleted_jobs_count || 0,
      storage_files_deleted: storageDeletedCount,
      bitstudio_cleanup_attempted: bitStudioCleanupAttempted,
      cleanup_summary: result?.cleanup_summary || 'No cleanup performed'
    };

    console.log('Cleanup completed successfully:', cleanupSummary);

    return new Response(JSON.stringify({
      success: true,
      ...cleanupSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cleanup process failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});