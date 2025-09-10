export const clearAllCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
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