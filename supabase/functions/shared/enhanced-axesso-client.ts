import { AXESSO, normalizeMarket } from './axesso-config.ts';

interface AxessoSearchResponse {
  responseStatus: string;
  resultCount: number;
  searchProductDetails: Array<{
    productId: string;
    dpUrl: string;
    productTitle: string;
    price: number;
    retailPrice?: number;
    imgUrl?: string;
    manufacturer?: string;
  }>;
  nextPage?: number;
  lastPage?: number;
}

interface AxessoProductDetails {
  responseStatus: string;
  productTitle: string;
  manufacturer: string;
  productId: string;
  url: string;
  imageUrlList: string[];
  mainImage?: { imageUrl: string };
  price: number;
  retailPrice?: number;
  available: boolean;
  productDescription: string;
  features: string[];
  domainCode: string;
  variations?: Array<{
    size?: string;
    color?: string;
    available: boolean;
  }>;
}

interface BulkImportConfig {
  primary: string;
  secondary: string;
  maxRpm: number;
  maxConcurrency: number;
  timeoutMs: number;
  searchCacheExpiry: number;
  detailsCacheExpiry: number;
}

interface CircuitBreaker {
  failureCount: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export class EnhancedAxessoClient {
  private readonly config: BulkImportConfig;
  private searchCache = new Map<string, { data: AxessoSearchResponse; timestamp: number }>();
  private detailsCache = new Map<string, { data: AxessoProductDetails; timestamp: number }>();
  private rateLimitQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private circuitBreaker: CircuitBreaker = {
    failureCount: 0,
    lastFailureTime: 0,
    state: 'closed'
  };

  constructor(config: BulkImportConfig) {
    this.config = config;
  }

  private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    // Simple rate limiting - wait if too many active requests
    while (this.activeRequests >= this.config.maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.activeRequests++;
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= 5) {
      this.circuitBreaker.state = 'open';
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitBreaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure > 120000) { // 2 minutes
        this.circuitBreaker.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  private async fetchWithRetry(url: string, signal?: AbortSignal): Promise<any> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open');
    }

    const headers = {
      'axesso-api-key': this.config.primary,
      'Cache-Control': 'no-cache',
    };

    const secondaryHeaders = {
      'axesso-api-key': this.config.secondary,
      'Cache-Control': 'no-cache',
    };

    let lastError: Error;

    // Try primary key
    try {
      const response = await fetch(url, { headers, signal });
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`AXESSO_ERR Primary - Status: ${response.status}, URL: ${url}, Body: ${responseText.slice(0, 200)}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error (primary):', parseError, 'Response:', responseText.slice(0, 200));
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      lastError = error as Error;
      console.warn('Primary key failed, trying secondary:', error);
    }

    // Try secondary key
    try {
      const response = await fetch(url, { headers: secondaryHeaders, signal });
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`AXESSO_ERR Secondary - Status: ${response.status}, URL: ${url}, Body: ${responseText.slice(0, 200)}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error (secondary):', parseError, 'Response:', responseText.slice(0, 200));
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error('Both keys failed:', error);
      throw lastError;
    }
  }

  async searchProducts(
    market: string,
    keyword: string,
    page = 1,
    limit = 50
  ): Promise<AxessoSearchResponse | null> {
    // Normalize market to valid domainCode
    const validMarket = normalizeMarket(market);
    const cacheKey = `${validMarket}:${keyword}:${page}:${limit}`;
    
    // Check cache
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.searchCacheExpiry) {
      return cached.data;
    }

    return this.executeWithRateLimit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const params = new URLSearchParams({
          domainCode: validMarket,
          keyword,
          page: page.toString(),
          sortBy: 'freshness'
        });

        const url = `${AXESSO.base}/search-by-keyword?${params.toString()}`;
        console.log(`AXESSO Search: ${url}`);
        const data = await this.fetchWithRetry(url, controller.signal);
        
        const resultCount = data?.searchProductDetails?.length || 0;
        console.log(`Search result for ${validMarket}:${keyword}:${page} - Found ${resultCount} products`);
        
        if (resultCount === 0) {
          console.warn('[AXESSO] Empty search result', {
            market: validMarket,
            keyword,
            page,
            response: JSON.stringify(data).slice(0, 300)
          });
        }
        
        // Cache successful response
        this.searchCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        console.error(`Search failed for ${validMarket}:${keyword}:${page}:`, error);
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  async fetchProductDetails(productUrl: string): Promise<AxessoProductDetails | null> {
    const cacheKey = productUrl;
    
    // Check cache
    const cached = this.detailsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.detailsCacheExpiry) {
      return cached.data;
    }

    return this.executeWithRateLimit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs * 1.5); // Longer timeout for details

      try {
        const url = `${AXESSO.base}/lookup-product-details?url=${encodeURIComponent(productUrl)}`;
        console.log(`AXESSO Details: ${productUrl}`);
        const data = await this.fetchWithRetry(url, controller.signal);
        
        console.log(`Details result for ${productUrl} - Title: ${data?.productTitle || 'N/A'}`);
        
        // Cache successful response
        this.detailsCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        console.error(`Details failed for ${productUrl}:`, error);
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  async bulkSearchAndHydrate(
    markets: string[],
    keywords: string[],
    pagesPerKeyword = 5
  ): Promise<{ products: AxessoProductDetails[]; metrics: any }> {
    const startTime = Date.now();
    
    // Filter out unsupported markets
    const validMarkets = markets
      .map(m => normalizeMarket(m))
      .filter((m): m is NonNullable<typeof m> => m !== null);
    
    if (validMarkets.length === 0) {
      console.warn('[AXESSO] No valid markets provided:', markets);
      return { 
        products: [], 
        metrics: { 
          searchRequests: 0, 
          detailRequests: 0, 
          productsFound: 0, 
          duration: Date.now() - startTime 
        } 
      };
    }
    
    const metrics = {
      searchRequests: 0,
      detailRequests: 0,
      productsFound: 0,
      errors: 0,
      searchedPages: 0,
      startTime
    };

    const allProducts: AxessoProductDetails[] = [];
    const uniqueUrls = new Set<string>();

    console.log(`Starting bulk import: ${validMarkets.length} markets, ${keywords.length} keywords, ${pagesPerKeyword} pages each`);

    
    // Search phase
    for (const market of validMarkets) {
      for (const keyword of keywords) {
        for (let page = 1; page <= pagesPerKeyword; page++) {
          try {
            metrics.searchRequests++;
            metrics.searchedPages++;
            
            console.log(`Searching: ${market}:${keyword}:${page}`);
            const searchResult = await this.searchProducts(market, keyword, page);
            
            if (searchResult?.searchProductDetails) {
              const newUrls = searchResult.searchProductDetails
                .filter(product => product.dpUrl && !uniqueUrls.has(product.dpUrl))
                .map(product => product.dpUrl);
              
              newUrls.forEach(url => uniqueUrls.add(url));
              console.log(`Added ${newUrls.length} new URLs from ${market}:${keyword}:${page}`);
            } else {
              console.log(`No products found for ${market}:${keyword}:${page}`);
            }
            
            // Basic rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
          } catch (error) {
            metrics.errors++;
            console.error(`Search failed for ${market}:${keyword}:${page}:`, error);
          }
        }
      }
    }

    // Details phase
    const urls = Array.from(uniqueUrls);
    metrics.productsFound = urls.length;
    console.log(`Found ${urls.length} unique product URLs, fetching details...`);

    for (const url of urls) {
      try {
        metrics.detailRequests++;
        const details = await this.fetchProductDetails(url);
        if (details) {
          allProducts.push(details);
        }
        
        // Basic rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay
      } catch (error) {
        metrics.errors++;
        console.error(`Details failed for ${url}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const successRate = metrics.detailRequests > 0 ? ((metrics.detailRequests - metrics.errors) / metrics.detailRequests) * 100 : 0;
    
    console.log(`Bulk import completed: ${allProducts.length} products hydrated in ${duration}ms, ${successRate}% success rate`);

    return {
      products: allProducts,
      metrics: {
        ...metrics,
        duration,
        successRate
      }
    };
  }

  getStatus() {
    return {
      circuitBreaker: this.circuitBreaker,
      activeRequests: this.activeRequests,
      cacheStats: {
        searchCacheSize: this.searchCache.size,
        detailsCacheSize: this.detailsCache.size
      }
    };
  }
}

export type { AxessoSearchResponse, AxessoProductDetails, BulkImportConfig };