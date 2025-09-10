import { clearImageCache } from './imageLoadedCache';

export const clearAllCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      // Also clear in-memory image cache
      clearImageCache();
      
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }
  return false;
};

// Clear only image caches (both browser and memory)
export const clearImageCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      const imageCacheNames = cacheNames.filter(name => name.startsWith('img-'));
      await Promise.all(
        imageCacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      // Clear in-memory image cache
      clearImageCache();
      
      console.log('Image caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear image caches:', error);
      return false;
    }
  }
  return false;
};

export const forceReload = () => {
  window.location.reload();
};

export const clearCacheAndReload = async () => {
  await clearAllCaches();
  forceReload();
};