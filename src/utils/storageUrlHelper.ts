// Hybrid storage URL helper - direct Supabase for storage, custom proxy for API
const DIRECT_SUPABASE_URL = "https://klwolsopucgswhtdlsps.supabase.co";
const CUSTOM_API_URL = "https://api.azyahstyle.com";

/**
 * Determines if a request should use direct Supabase URLs (for storage) 
 * or the custom proxy (for API calls)
 */
export function shouldUseDirectSupabase(path: string): boolean {
  // Storage-related paths should use direct Supabase
  const storagePaths = [
    '/storage/v1/',
    '/rest/v1/storage/',
    'storage/buckets',
    'storage/objects'
  ];
  
  return storagePaths.some(storagePath => path.includes(storagePath));
}

/**
 * Gets the appropriate base URL for a given request path
 */
export function getSupabaseUrl(path: string = ''): string {
  if (shouldUseDirectSupabase(path)) {
    return DIRECT_SUPABASE_URL;
  }
  return CUSTOM_API_URL;
}

/**
 * Creates a storage-specific Supabase URL (always direct)
 */
export function getStorageUrl(bucketName: string, filePath: string): string {
  return `${DIRECT_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}

/**
 * Checks if a URL is a Supabase storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  
  return url.includes('/storage/v1/object/') || 
         url.includes('storage/buckets/') ||
         (url.includes('supabase.co') && url.includes('/storage/'));
}

/**
 * Converts a proxy storage URL back to direct Supabase storage URL
 */
export function ensureDirectStorageUrl(url: string): string {
  if (!url || !isSupabaseStorageUrl(url)) {
    return url;
  }
  
  // If it's already using the direct URL, return as-is
  if (url.startsWith(DIRECT_SUPABASE_URL)) {
    return url;
  }
  
  // If it's using the custom proxy, convert to direct
  if (url.startsWith(CUSTOM_API_URL)) {
    return url.replace(CUSTOM_API_URL, DIRECT_SUPABASE_URL);
  }
  
  return url;
}