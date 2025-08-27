import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  renderTime: number;
  lastCheck: number;
}

export const usePerformanceMonitor = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  const metricsRef = useRef<PerformanceMetrics>({
    frameRate: 60,
    memoryUsage: 0,
    renderTime: 0,
    lastCheck: Date.now()
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationId: number;
    let intervalId: NodeJS.Timeout;

    // Frame rate monitoring
    const measureFrameRate = () => {
      frameCountRef.current++;
      const now = performance.now();
      
      if (now - lastFrameTimeRef.current >= 1000) {
        metricsRef.current.frameRate = frameCountRef.current;
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;

        // Log performance warning if frame rate drops significantly
        if (metricsRef.current.frameRate < 30) {
          console.warn('Performance warning: Frame rate dropped to', metricsRef.current.frameRate, 'fps');
        }
      }
      
      animationId = requestAnimationFrame(measureFrameRate);
    };

    // Memory usage monitoring (if available)
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Log memory warning if usage exceeds threshold
        if (metricsRef.current.memoryUsage > 100) { // 100MB threshold
          console.warn('Memory warning: JS heap size is', metricsRef.current.memoryUsage.toFixed(2), 'MB');
        }
      }
    };

    // Start monitoring
    animationId = requestAnimationFrame(measureFrameRate);
    intervalId = setInterval(measureMemory, 5000); // Check memory every 5 seconds

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
    };
  }, [enabled]);

  const logMetrics = () => {
    if (enabled) {
      console.log('Performance Metrics:', {
        frameRate: metricsRef.current.frameRate,
        memoryUsage: `${metricsRef.current.memoryUsage.toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }
  };

  return {
    metrics: metricsRef.current,
    logMetrics
  };
};