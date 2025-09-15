// Environment-aware image URL builder for Supabase Storage
const DIRECT_SUPABASE = 'https://klwolsopucgswhtdlsps.supabase.co';
const PROXY_SUPABASE = 'https://api.azyahstyle.com';

export const isPreview = () =>
  typeof window !== 'undefined' && /\.lovable\.app$/i.test(window.location.hostname);

export const isSupabasePublicPath = (s: string) =>
  /^[^/]+\/.+$/.test(s); // e.g. "product-images/folder/file.jpg"

export function imageUrlFrom(bucketOrUrl: string, maybePath?: string): string {
  // If a full external URL was passed (ASOS etc), return as-is
  if (!maybePath && /^https?:\/\//i.test(bucketOrUrl)) return bucketOrUrl;

  // Build from relative path (recommended)
  const bucket = bucketOrUrl;
  const path = maybePath!;
  const base = isPreview() ? DIRECT_SUPABASE : PROXY_SUPABASE;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

// Extract relative path from absolute Supabase URL
export function extractSupabasePath(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}