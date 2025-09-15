// Display source logic with URL-specific optimizations
import { isAsosUrl, isSupabaseAbsoluteUrl } from './urlGuards';
import { upgradeAsosImageUrl, buildAsosSrcSet } from '../utils/asosImageUtils';
import { extractSupabasePath, imageUrlFrom } from './imageUrl';

export function displaySrc(u: string): string {
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
  if (isAsosUrl(u)) return buildAsosSrcSet(u);
  
  // For Supabase URLs, we don't need srcset since we're handling the URL conversion
  if (isSupabaseAbsoluteUrl(u)) return undefined;
  
  return undefined; // no srcset for other URLs
}