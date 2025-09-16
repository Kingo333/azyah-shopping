import { useEffect, useCallback } from 'react';
import { useConnectionAware } from './useConnectionAware';

interface PerformanceOptimizationConfig {
  enableImageOptimization?: boolean;
  enableBundleSplitting?: boolean;
  enableRequestQueuing?: boolean;
  enableAnalyticsDeferral?: boolean;
}

export const usePerformanceOptimization = (config: PerformanceOptimizationConfig = {}) => {
  const {
    enableImageOptimization = true,
    enableBundleSplitting = true,
    enableRequestQueuing = true,
    enableAnalyticsDeferral = true
  } = config;

  const { connectionSpeed, saveData, shouldPreload } = useConnectionAware({
    slowConnectionFeatures: ['animations', 'autoplay'],
    deferredFeatures: ['analytics', 'tracking'],
    priorityFeatures: ['core', 'navigation']
  });

  // Request queue for mobile data optimization
  const requestQueue = useCallback(() => {
    const queue: (() => Promise<any>)[] = [];
    let processing = false;
    const maxConcurrent = connectionSpeed === 'slow' ? 2 : connectionSpeed === 'medium' ? 4 : 6;
    let activeRequests = 0;

    const processQueue = async () => {
      if (processing || activeRequests >= maxConcurrent || queue.length === 0) return;
      
      processing = true;
      
      while (queue.length > 0 && activeRequests < maxConcurrent) {
        const request = queue.shift();
        if (request) {
          activeRequests++;
          request().finally(() => {
            activeRequests--;
            setTimeout(processQueue, 10); // Small delay to prevent overwhelming
          });
        }
      }
      
      processing = false;
    };

    return {
      add: (request: () => Promise<any>) => {
        queue.push(request);
        processQueue();
      },
      clear: () => {
        queue.length = 0;
      }
    };
  }, [connectionSpeed]);

  // Defer analytics on slow connections
  useEffect(() => {
    if (!enableAnalyticsDeferral) return;

    const deferAnalytics = connectionSpeed === 'slow' || saveData;
    
    if (deferAnalytics) {
      // Delay analytics initialization
      const timer = setTimeout(() => {
        // Analytics initialization could go here
        console.log('🎯 Analytics deferred due to slow connection');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionSpeed, saveData, enableAnalyticsDeferral]);

  // Image preloading strategy
  const preloadImages = useCallback((urls: string[], priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (!enableImageOptimization || !shouldPreload(priority)) return;

    const imagesToPreload = urls.slice(0, connectionSpeed === 'slow' ? 2 : connectionSpeed === 'medium' ? 5 : 10);
    
    imagesToPreload.forEach((url) => {
      if (!url) return;
      
      const img = new Image();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = url;
    });
  }, [enableImageOptimization, shouldPreload, connectionSpeed]);

  // Bundle optimization hints
  const shouldLoadFeature = useCallback((feature: string) => {
    const heavyFeatures = ['voice', 'ar', 'ai-studio', 'analytics'];
    
    if (heavyFeatures.includes(feature)) {
      return connectionSpeed !== 'slow' && !saveData;
    }
    
    return true;
  }, [connectionSpeed, saveData]);

  // Performance monitoring
  const measurePerformance = useCallback((name: string, fn: () => void | Promise<void>) => {
    const start = performance.now();
    
    const finish = () => {
      const duration = performance.now() - start;
      if (duration > 100) { // Log slow operations
        console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
    };

    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(finish);
      } else {
        finish();
        return result;
      }
    } catch (error) {
      finish();
      throw error;
    }
  }, []);

  return {
    connectionSpeed,
    saveData,
    requestQueue: enableRequestQueuing ? requestQueue() : null,
    preloadImages,
    shouldLoadFeature,
    measurePerformance,
    shouldPreload,
    optimizationEnabled: {
      images: enableImageOptimization,
      bundleSplitting: enableBundleSplitting,
      requestQueuing: enableRequestQueuing,
      analyticsDeferral: enableAnalyticsDeferral
    }
  };
};