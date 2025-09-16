// Fallback image helpers for mobile network issues
const DIRECT_SUPABASE = 'https://klwolsopucgswhtdlsps.supabase.co';
const PROXY_SUPABASE = 'https://api.azyahstyle.com';

export function toDirectSupabase(u: string): string {
  return u.replace(PROXY_SUPABASE, DIRECT_SUPABASE);
}

export function toPublicProxy(u: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(u)}`;
}

export function getImageFallbacks(originalUrl: string): string[] {
  const fallbacks = [originalUrl];
  
  // For ASOS images, try without optimization first
  if (originalUrl.includes('asos-media.com') && originalUrl.includes('?')) {
    const baseUrl = originalUrl.split('?')[0];
    fallbacks.push(`${baseUrl}?wid=800&fmt=jpg`);
  }
  
  // If using proxy, add direct Supabase as fallback
  if (originalUrl.startsWith(PROXY_SUPABASE)) {
    fallbacks.push(toDirectSupabase(originalUrl));
  }
  
  // Add public proxy as final fallback for external URLs only
  if (!originalUrl.includes('supabase.co') && !originalUrl.startsWith(PROXY_SUPABASE)) {
    fallbacks.push(toPublicProxy(originalUrl));
  }
  
  return fallbacks;
}