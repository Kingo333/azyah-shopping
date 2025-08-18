interface AxessoResponse {
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

interface AxessoClientConfig {
  primaryKey: string;
  secondaryKey: string;
  timeout?: number;
  cacheExpiry?: number;
}

class AxessoClient {
  private readonly baseUrl = 'http://api.axesso.de/aso/lookup-product-details';
  private readonly config: AxessoClientConfig;
  private cache = new Map<string, { data: AxessoResponse; timestamp: number }>();

  constructor(config: AxessoClientConfig) {
    this.config = {
      timeout: 8000,
      cacheExpiry: 12 * 60 * 60 * 1000, // 12 hours
      ...config,
    };
  }

  private isValidCacheEntry(entry: { data: AxessoResponse; timestamp: number }): boolean {
    return Date.now() - entry.timestamp < this.config.cacheExpiry!;
  }

  private async fetchWithKey(url: string, apiKey: string, signal?: AbortSignal): Promise<AxessoResponse> {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api.axesso.de',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Axesso API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchProductDetails(productUrl: string): Promise<AxessoResponse | null> {
    const cacheKey = productUrl;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCacheEntry(cached)) {
      return cached.data;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const url = `${this.baseUrl}?url=${encodeURIComponent(productUrl)}`;
      
      // Try primary key first
      try {
        const data = await this.fetchWithKey(url, this.config.primaryKey, controller.signal);
        
        // Cache successful response
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (primaryError) {
        console.warn('Primary key failed, trying secondary:', primaryError);
        
        // Try secondary key
        const data = await this.fetchWithKey(url, this.config.secondaryKey, controller.signal);
        
        // Cache successful response
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle 404 gracefully (product not found)
        if (error.message.includes('404')) {
          console.log('Product not found (404):', productUrl);
          return null;
        }
        
        console.error('Axesso API error:', error.message);
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Method to clear expired cache entries
  clearExpiredCache(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCacheEntry(entry)) {
        this.cache.delete(key);
      }
    }
  }
}

export { AxessoClient, type AxessoResponse };