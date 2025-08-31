let deferredPrompt: any = null;

export function setupPWAInstallListeners(onReady: () => void) {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    // @ts-ignore
    deferredPrompt = e;
    onReady(); // enable Install button
  });
}

export async function triggerPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice?.outcome ?? 'dismissed';
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator?.standalone === true;
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}