// Display source logic with URL-specific optimizations
import { isAsosUrl, isSupabaseAbsoluteUrl } from './urlGuards';
import { upgradeAsosImageUrl, buildAsosSrcSet } from '../utils/asosImageUtils';
import { extractSupabasePath, imageUrlFrom } from './imageUrl';

// Detect signed Supabase URLs (have authentication tokens)
function isSignedSupabaseUrl(u: string): boolean {
  return u.includes('/storage/v1/object/sign/') && u.includes('token=');
}

// Detect relative Supabase paths like "product-images/folder/file.jpg"
function isRelativeSupabasePath(u: string): boolean {
  return !u.startsWith('http') && u.includes('/') && !u.startsWith('/');
}

export function displaySrc(u: string): string {
  // Handle null/undefined
  if (!u) return '/placeholder.svg';
  
  // Preserve signed URLs - they already have authentication tokens
  if (isSignedSupabaseUrl(u)) return u;
  
  // Handle relative Supabase paths (e.g., "product-images/folder/file.jpg")
  if (isRelativeSupabasePath(u)) {
    const parts = u.split('/');
    if (parts.length >= 2) {
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      return imageUrlFrom(bucket, path);
    }
  }
  
  // Handle ASOS URLs
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