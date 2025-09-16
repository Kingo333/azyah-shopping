// Fallback image helpers for mobile network issues
const DIRECT_SUPABASE = 'https://klwolsopucgswhtdlsps.supabase.co';

export function toDirectSupabase(u: string): string {
  return u.replace('https://api.azyahstyle.com', DIRECT_SUPABASE);
}

export function toPublicProxy(u: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(u)}`;
}

export function getImageFallbacks(originalUrl: string): string[] {
  const fallbacks = [originalUrl];
  
  // If using proxy, add direct Supabase as fallback
  if (originalUrl.startsWith('https://api.azyahstyle.com')) {
    fallbacks.push(toDirectSupabase(originalUrl));
  }
  
  // Add public proxy as final fallback (temporary safety net)
  fallbacks.push(toPublicProxy(originalUrl));
  
  return fallbacks;
}