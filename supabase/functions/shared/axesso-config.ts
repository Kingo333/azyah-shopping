// Standardized Axesso configuration with env var compatibility
export const AXESSO = {
  primary: Deno.env.get('AXESSO_PRIMARY_KEY') || Deno.env.get('AXESSO_KEY_PRIMARY') || '',
  secondary: Deno.env.get('AXESSO_SECONDARY_KEY') || Deno.env.get('AXESSO_KEY_SECONDARY') || '',
  base: 'https://api.axesso.de/aso',
  timeoutMs: Number(Deno.env.get('AXESSO_TIMEOUT_MS') || 30000), // Increased to 30s
  maxRpm: Number(Deno.env.get('AXESSO_MAX_RPM') || 50),
  maxConcurrency: Number(Deno.env.get('AXESSO_MAX_CONCURRENCY') || 3), // Reduced concurrency
  searchCacheExpiry: 5 * 60 * 1000, // 5 minutes
  detailsCacheExpiry: 30 * 60 * 1000, // 30 minutes
};

if (!AXESSO.primary && !AXESSO.secondary) {
  throw new Error('Missing AXESSO_PRIMARY_KEY / AXESSO_SECONDARY_KEY');
}

// Domain code mapping: convert any variations to valid API values
// Only markets confirmed working with search API
const SUPPORTED_MARKETS = new Set(['us', 'de', 'co.uk']);

export function normalizeMarket(market: string): 'us' | 'de' | 'co.uk' | null {
  const m = market.toLowerCase().trim();
  if (m === 'gb' || m === 'uk') return 'co.uk';
  if (SUPPORTED_MARKETS.has(m)) return m as any;
  
  // Log unsupported markets for debugging
  console.warn('[ASOS] Skipping unsupported market:', market);
  return null; // Skip unsupported markets
}