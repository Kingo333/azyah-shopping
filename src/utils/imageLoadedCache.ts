// Global singleton cache for image loading states
// Prevents re-rendering loading states when navigating back to pages

interface ImageCacheEntry {
  loaded: boolean;
  w?: number;
  h?: number;
  ts: number;
}

class ImageLoadedCache {
  private cache = new Map<string, ImageCacheEntry>();
  private readonly maxItems = 250;
  private readonly maxSizeBytes = 48 * 1024 * 1024; // 48MB
  private currentSize = 0;

  // Normalize URL by removing transient parameters
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove cache-busting and transient params
      urlObj.searchParams.delete('t');
      urlObj.searchParams.delete('cache');
      urlObj.searchParams.delete('timestamp');
      urlObj.searchParams.delete('_t');
      return urlObj.toString();
    } catch {
      return url; // Fallback for relative URLs
    }
  }

  // Estimate memory usage of an entry
  private estimateEntrySize(url: string): number {
    return url.length * 2 + 32; // Rough estimate: string + object overhead
  }

  // Evict least recently used items
  private evictLRU(): void {
    if (this.cache.size <= this.maxItems && this.currentSize <= this.maxSizeBytes) {
      return;
    }

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.ts - b.ts);

    // Remove oldest 25% to avoid frequent evictions
    const toRemove = Math.max(1, Math.floor(entries.length * 0.25));
    
    for (let i = 0; i < toRemove; i++) {
      const [url] = entries[i];
      this.currentSize -= this.estimateEntrySize(url);
      this.cache.delete(url);
    }
  }

  // Check if image is already loaded
  isLoaded(url: string): boolean {
    const normalized = this.normalizeUrl(url);
    const entry = this.cache.get(normalized);
    
    if (entry) {
      // Update timestamp (LRU)
      entry.ts = Date.now();
      return entry.loaded;
    }
    
    return false;
  }

  // Mark image as loaded with optional dimensions
  markLoaded(url: string, width?: number, height?: number): void {
    const normalized = this.normalizeUrl(url);
    const entrySize = this.estimateEntrySize(normalized);
    
    this.cache.set(normalized, {
      loaded: true,
      w: width,
      h: height,
      ts: Date.now()
    });

    this.currentSize += entrySize;
    this.evictLRU();
  }

  // Get cached dimensions
  getDimensions(url: string): { width?: number; height?: number } | null {
    const normalized = this.normalizeUrl(url);
    const entry = this.cache.get(normalized);
    
    if (entry && entry.loaded) {
      // Update timestamp (LRU)
      entry.ts = Date.now();
      return { width: entry.w, height: entry.h };
    }
    
    return null;
  }

  // Get cache stats for debugging
  getStats(): { size: number; memoryUsage: number; maxItems: number } {
    return {
      size: this.cache.size,
      memoryUsage: this.currentSize,
      maxItems: this.maxItems
    };
  }

  // Clear cache (for refresh functionality)
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  // Remove specific URL from cache
  evict(url: string): void {
    const normalized = this.normalizeUrl(url);
    if (this.cache.has(normalized)) {
      this.currentSize -= this.estimateEntrySize(normalized);
      this.cache.delete(normalized);
    }
  }
}

// Export singleton instance
export const imageLoadedCache = new ImageLoadedCache();

// Export convenience functions with proper this binding
export const isImageLoaded = (url: string): boolean => imageLoadedCache.isLoaded(url);
export const markImageLoaded = (url: string, width?: number, height?: number): void => 
  imageLoadedCache.markLoaded(url, width, height);
export const getImageDimensions = (url: string): { width?: number; height?: number } | null => 
  imageLoadedCache.getDimensions(url);
export const getImageCacheStats = () => imageLoadedCache.getStats();
export const clearImageCache = (): void => imageLoadedCache.clear();
export const evictImageFromCache = (url: string): void => imageLoadedCache.evict(url);