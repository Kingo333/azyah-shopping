import { markImageLoaded, isImageLoaded } from '@/utils/imageLoadedCache';
import { generateImageSources } from '@/utils/imageOptimizer';
import { getPrimaryImageUrl, getProductImageUrls } from '@/utils/imageHelpers';

interface PreloadConfig {
  maxConcurrent: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  priorityThreshold: number;
}

interface PreloadJob {
  url: string;
  priority: number;
  productId: string;
  resolve: (success: boolean) => void;
  reject: (error: Error) => void;
  attempts: number;
}

interface PreloadProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

class ImagePreloaderService {
  private config: PreloadConfig = {
    maxConcurrent: 25,
    batchSize: 30,
    retryAttempts: 2,
    retryDelay: 1000,
    priorityThreshold: 100
  };

  private queue: PreloadJob[] = [];
  private activeJobs = new Set<string>();
  private preloadedUrls = new Set<string>();
  private abortController: AbortController | null = null;
  
  private progressCallback: ((progress: PreloadProgress) => void) | null = null;
  private completionCallback: (() => void) | null = null;

  setProgressCallback(callback: (progress: PreloadProgress) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: () => void) {
    this.completionCallback = callback;
  }

  private shouldPreload(): boolean {
    // Check network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return false;
      }
    }
    return true;
  }

  private createPreloadJob(url: string, priority: number, productId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        url,
        priority,
        productId,
        resolve,
        reject,
        attempts: 0
      });
    });
  }

  private async preloadSingleImage(job: PreloadJob): Promise<void> {
    const { url, resolve, reject } = job;
    
    if (isImageLoaded(url) || this.preloadedUrls.has(url)) {
      resolve(true);
      return;
    }

    if (this.abortController?.signal.aborted) {
      reject(new Error('Preloading cancelled'));
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const loadPromise = new Promise<void>((imgResolve, imgReject) => {
        img.onload = () => {
          markImageLoaded(url, img.naturalWidth, img.naturalHeight);
          this.preloadedUrls.add(url);
          imgResolve();
        };
        
        img.onerror = () => {
          imgReject(new Error(`Failed to load image: ${url}`));
        };
      });

      // Start loading
      img.src = url;
      
      // Add timeout
      const timeoutPromise = new Promise<never>((_, timeoutReject) => {
        setTimeout(() => timeoutReject(new Error('Image load timeout')), 10000);
      });

      await Promise.race([loadPromise, timeoutPromise]);
      resolve(true);

    } catch (error) {
      if (job.attempts < this.config.retryAttempts) {
        job.attempts++;
        setTimeout(() => {
          this.preloadSingleImage(job);
        }, this.config.retryDelay * job.attempts);
      } else {
        reject(error as Error);
      }
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.completionCallback?.();
      return;
    }

    this.sortQueue();
    
    const batch = this.queue.splice(0, Math.min(this.config.batchSize, this.queue.length));
    const promises: Promise<void>[] = [];

    for (const job of batch) {
      if (this.activeJobs.size >= this.config.maxConcurrent) {
        this.queue.unshift(job); // Put back in queue
        break;
      }

      this.activeJobs.add(job.url);
      
      const jobPromise = this.preloadSingleImage(job).finally(() => {
        this.activeJobs.delete(job.url);
        this.updateProgress();
      });
      
      promises.push(jobPromise);
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      
      if (this.queue.length > 0 && !this.abortController?.signal.aborted) {
        // Small delay between batches to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        this.processQueue();
      } else {
        this.completionCallback?.();
      }
    }
  }

  private updateProgress(): void {
    if (!this.progressCallback) return;

    const total = this.preloadedUrls.size + this.queue.length + this.activeJobs.size;
    const completed = this.preloadedUrls.size;
    const failed = Math.max(0, total - completed - this.queue.length - this.activeJobs.size);

    this.progressCallback({
      total,
      completed,
      failed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }

  async preloadProductImages(products: any[]): Promise<void> {
    if (!this.shouldPreload() || products.length === 0) {
      this.completionCallback?.();
      return;
    }

    this.abortController = new AbortController();
    this.queue = [];
    this.activeJobs.clear();

    const imageJobs: Promise<boolean>[] = [];

    // Extract all image URLs with priorities
    products.forEach((product, index) => {
      const priority = Math.max(0, 1000 - index); // Higher priority for earlier products
      
      // Primary image (highest priority)
      const primaryUrl = getPrimaryImageUrl(product);
      if (primaryUrl && primaryUrl !== '/placeholder.svg') {
        const sources = generateImageSources(primaryUrl, 'grid');
        imageJobs.push(this.createPreloadJob(sources.primary, priority + 100, product.id));
      }

      // Additional images (lower priority)
      const allImageUrls = getProductImageUrls(product);
      allImageUrls.slice(1).forEach((url, urlIndex) => {
        if (url && url !== '/placeholder.svg') {
          const sources = generateImageSources(url, 'grid');
          imageJobs.push(this.createPreloadJob(sources.primary, priority - urlIndex, product.id));
        }
      });
    });

    this.updateProgress();

    // Start processing queue
    this.processQueue();

    // Don't wait for all images, let them load in background
    return Promise.resolve();
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.queue = [];
    this.activeJobs.clear();
  }

  getPreloadedCount(): number {
    return this.preloadedUrls.size;
  }

  isImagePreloaded(url: string): boolean {
    return this.preloadedUrls.has(url) || isImageLoaded(url);
  }

  clear(): void {
    this.cancel();
    this.preloadedUrls.clear();
  }
}

export const imagePreloader = new ImagePreloaderService();