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
  primaryKey: string;
  secondaryKey: string;
  maxRpm: number;
  maxConcurrency: number;
  timeout: number;
  searchCacheExpiry: number;
  detailsCacheExpiry: number;
}

interface CircuitBreaker {
  failureCount: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export class EnhancedAxessoClient {
  private readonly searchUrl = 'https://api.axesso.de/aso/search-by-keyword';
  private readonly detailsUrl = 'https://api.axesso.de/aso/lookup-product-details';
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
      'axesso-api-key': this.config.primaryKey,
    };

    const secondaryHeaders = {
      'axesso-api-key': this.config.secondaryKey,
    };

    let lastError: Error;

    // Try primary key
    try {
      const response = await fetch(url, { headers, signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      lastError = error as Error;
      console.warn('Primary key failed, trying secondary:', error);
    }

    // Try secondary key
    try {
      const response = await fetch(url, { headers: secondaryHeaders, signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
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
    const cacheKey = `${market}:${keyword}:${page}:${limit}`;
    
    // Check cache
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.searchCacheExpiry) {
      return cached.data;
    }

    return this.executeWithRateLimit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const params = new URLSearchParams({
          domainCode: market,
          keyword,
          page: page.toString(),
          sortBy: 'freshness'
        });

        const url = `${this.searchUrl}?${params.toString()}`;
        const data = await this.fetchWithRetry(url, controller.signal);
        
        // Cache successful response
        this.searchCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          console.log('Search not found (404):', keyword);
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
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const url = `${this.detailsUrl}?url=${encodeURIComponent(productUrl)}`;
        const data = await this.fetchWithRetry(url, controller.signal);
        
        // Cache successful response
        this.detailsCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          console.log('Product not found (404):', productUrl);
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
    const metrics = {
      searchRequests: 0,
      detailRequests: 0,
      productsFound: 0,
      errors: 0,
      startTime: Date.now()
    };

    const allProducts: AxessoProductDetails[] = [];
    const uniqueUrls = new Set<string>();

    // Search phase
    for (const market of markets) {
      for (const keyword of keywords) {
        for (let page = 1; page <= pagesPerKeyword; page++) {
          try {
            metrics.searchRequests++;
            const searchResult = await this.searchProducts(market, keyword, page);
            
            if (searchResult?.searchProductDetails) {
              for (const product of searchResult.searchProductDetails) {
                if (product.dpUrl && !uniqueUrls.has(product.dpUrl)) {
                  uniqueUrls.add(product.dpUrl);
                }
              }
            }
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

    for (const url of urls) {
      try {
        metrics.detailRequests++;
        const details = await this.fetchProductDetails(url);
        if (details) {
          allProducts.push(details);
        }
      } catch (error) {
        metrics.errors++;
        console.error(`Details failed for ${url}:`, error);
      }
    }

    return {
      products: allProducts,
      metrics: {
        ...metrics,
        duration: Date.now() - metrics.startTime,
        successRate: metrics.detailRequests > 0 ? ((metrics.detailRequests - metrics.errors) / metrics.detailRequests) * 100 : 0
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