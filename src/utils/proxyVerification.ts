/**
 * Runtime verification utilities for proxy configuration
 */

export interface ProxyStatus {
  isUsingProxy: boolean;
  baseUrl: string;
  issues: string[];
  recommendations: string[];
}

export function verifyProxyConfiguration(): ProxyStatus {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const expectedProxy = 'https://api.azyahstyle.com';
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if base URL is correctly set
  if (!baseUrl) {
    issues.push('VITE_SUPABASE_URL environment variable is not set');
    recommendations.push('Add VITE_SUPABASE_URL=https://api.azyahstyle.com to your .env file');
  } else if (baseUrl !== expectedProxy) {
    issues.push(`VITE_SUPABASE_URL is set to "${baseUrl}" instead of "${expectedProxy}"`);
    recommendations.push(`Update VITE_SUPABASE_URL to "${expectedProxy}" in your .env file`);
  }
  
  // Check if publishable key is set
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    issues.push('VITE_SUPABASE_PUBLISHABLE_KEY environment variable is not set');
    recommendations.push('Add your Supabase publishable key to the .env file');
  }
  
  // Check if running in development mode
  if (import.meta.env.DEV) {
    recommendations.push('Running in development mode - proxy configuration will be verified on build');
  }
  
  return {
    isUsingProxy: baseUrl === expectedProxy,
    baseUrl: baseUrl || 'not set',
    issues,
    recommendations
  };
}

export function interceptNetworkRequests(): Promise<string[]> {
  return new Promise((resolve) => {
    const capturedUrls: string[] = [];
    const originalFetch = window.fetch;
    
    // Intercept fetch requests for 10 seconds
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      if (url.includes('supabase') || url.includes('api.azyahstyle.com')) {
        capturedUrls.push(url);
      }
      
      return originalFetch(input, init);
    };
    
    // Stop intercepting after 10 seconds
    setTimeout(() => {
      window.fetch = originalFetch;
      resolve([...new Set(capturedUrls)]); // Remove duplicates
    }, 10000);
  });
}

export function analyzeNetworkRequests(urls: string[]): {
  valid: string[];
  invalid: string[];
  summary: string;
} {
  const valid = urls.filter(url => url.includes('api.azyahstyle.com'));
  const invalid = urls.filter(url => url.includes('supabase.co'));
  
  let summary = '';
  if (invalid.length === 0 && valid.length > 0) {
    summary = `✅ All ${valid.length} Supabase requests are using the proxy correctly`;
  } else if (invalid.length > 0) {
    summary = `❌ Found ${invalid.length} requests still using *.supabase.co - proxy not working`;
  } else {
    summary = '⚠️ No Supabase requests detected - try navigating around the app';
  }
  
  return { valid, invalid, summary };
}