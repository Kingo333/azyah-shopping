// PWA utility functions

export const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
      return registration;
    } catch (error) {
      console.log('SW registration failed: ', error);
      return null;
    }
  }
  return null;
};

export const unregisterSW = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return registration.unregister();
    }
  }
  return false;
};

export const updateSW = (registration: ServiceWorkerRegistration) => {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
};

export const enableNotifications = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    return new Notification(title, options);
  }
  return null;
};

export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export const canInstall = () => {
  return !isStandalone() && 'serviceWorker' in navigator;
};

export const shareContent = async (data: ShareData) => {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.log('Error sharing:', error);
      return false;
    }
  }
  return false;
};

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.log('Error copying to clipboard:', error);
    return false;
  }
};

export const getNetworkStatus = () => {
  return {
    online: navigator.onLine,
    connection: (navigator as any).connection,
    saveData: (navigator as any).connection?.saveData || false
  };
};

export const addToHomeScreen = (deferredPrompt: any) => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    return deferredPrompt.userChoice;
  }
  return Promise.resolve({ outcome: 'dismissed' });
};

export const trackAppUsage = () => {
  const startTime = Date.now();
  
  return () => {
    const endTime = Date.now();
    const sessionDuration = endTime - startTime;
    
    // Store session data
    localStorage.setItem('lastSessionDuration', sessionDuration.toString());
    localStorage.setItem('lastSessionDate', new Date().toISOString());
    
    return sessionDuration;
  };
};