import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PWAInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAUpdateAvailable {
  waiting: ServiceWorker | null;
  update: () => Promise<void>;
}

export const usePWA = () => {
  const { toast } = useToast();
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState<PWAUpdateAvailable | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstallStatus = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running in PWA context
      const isPWA = (window.navigator as any).standalone || isStandalone;
      setIsInstalled(isPWA);
    };

    checkInstallStatus();
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as PWAInstallPrompt);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: "App installed!",
        description: "Azyah has been installed on your device.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "Back online!",
        description: "Your connection has been restored.",
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "You're offline",
        description: "Some features may be limited while offline.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Handle service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable({
                  waiting: newWorker,
                  update: () => updateServiceWorker(newWorker)
                });
              }
            });
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable({
            waiting: event.data.waiting,
            update: () => updateServiceWorker(event.data.waiting)
          });
        }
      });
    }
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      toast({
        title: "Installation failed",
        description: "Failed to install the app. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateServiceWorker = async (worker: ServiceWorker) => {
    return new Promise<void>((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          toast({
            title: "Update failed",
            description: "Failed to update the app. Please refresh manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "App updated!",
            description: "The app has been updated to the latest version.",
          });
        }
        resolve();
      };

      worker.postMessage({ type: 'SKIP_WAITING' }, [messageChannel.port2]);
    });
  };

  const refreshApp = () => {
    window.location.reload();
  };

  // Register service worker
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast({
                  title: "Update available",
                  description: "A new version of the app is available.",
                });
              }
            });
          }
        });

        console.log('Service Worker registered successfully:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll receive updates about new fashion items and trends.",
        });
        return true;
      } else if (permission === 'denied') {
        toast({
          title: "Notifications blocked", 
          description: "You can enable notifications in your browser settings.",
        });
      }
      return false;
    }
    return false;
  };

  // Store data for offline sync
  const storeOfflineData = async (key: string, data: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_OFFLINE_DATA',
        key,
        data
      });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    updateAvailable,
    installApp,
    refreshApp,
    registerServiceWorker,
    requestNotificationPermission,
    storeOfflineData
  };
};