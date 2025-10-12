// Display source logic with URL-specific optimizations
import { isAsosUrl, isSupabaseAbsoluteUrl } from './urlGuards';
import { upgradeAsosImageUrl, buildAsosSrcSet } from '../utils/asosImageUtils';
import { extractSupabasePath, imageUrlFrom } from './imageUrl';

// Detect signed Supabase URLs (have authentication tokens)
function isSignedSupabaseUrl(u: string): boolean {
  return u.includes('/storage/v1/object/sign/') && u.includes('token=');
}

export function displaySrc(u: string): string {
  // Preserve signed URLs - they already have authentication tokens
  if (isSignedSupabaseUrl(u)) return u;
  
  if (isAsosUrl(u)) return upgradeAsosImageUrl(u, 800);
  
  // Convert absolute Supabase URLs to environment-aware URLs
  if (isSupabaseAbsoluteUrl(u)) {
    const pathData = extractSupabasePath(u);
    if (pathData) {
      return imageUrlFrom(pathData.bucket, pathData.path);
    }
  }
  
  return u; // leave others alone
}

export function displaySrcSet(u: string): string | undefined {
  // No srcset for signed URLs
  if (isSignedSupabaseUrl(u)) return undefined;
  
  if (isAsosUrl(u)) return buildAsosSrcSet(u);
  
  // For Supabase URLs, we don't need srcset since we're handling the URL conversion
  if (isSupabaseAbsoluteUrl(u)) return undefined;
  
  return undefined; // no srcset for other URLs
}