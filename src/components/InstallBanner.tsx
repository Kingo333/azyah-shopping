import { useEffect, useState } from 'react';
import { setupPWAInstallListeners, triggerPWAInstall, isStandalone, isIOS } from '@/lib/pwa';

type Props = { className?: string };

export default function InstallBanner({ className = '' }: Props) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [justInstalled, setJustInstalled] = useState(false);

  // Hide inside webviews / capacitors (future native shells)
  const inWebView = /; wv\)/.test(navigator.userAgent) || (window as any).Capacitor;
  if (inWebView || installed) return null;

  useEffect(() => {
    setupPWAInstallListeners(() => setCanInstall(true));
  }, []);

  const onInstall = async () => {
    const res = await triggerPWAInstall();
    if (res === 'accepted') {
      setJustInstalled(true);
      setTimeout(() => setInstalled(true), 1500);
    }
  };

  const sharedClasses = 'rounded-2xl w-full flex items-center justify-between px-4 py-3';
  // Match Premium banner styling with glass panel look
  const premiumMatch = 'bg-background/40 backdrop-blur-xl border border-white/10 text-foreground shadow-md';

  if (isIOS()) {
    return (
      <div className={`${sharedClasses} ${premiumMatch} ${className}`}>
        <div className="flex flex-col">
          <span className="font-semibold text-base">Install Azyah</span>
          <span className="text-xs opacity-80">
            On iPhone: <span className="font-medium">Share</span> → <span className="font-medium">Add to Home Screen</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sharedClasses} ${premiumMatch} ${className}`}>
      <div className="flex flex-col">
        <span className="font-semibold text-base">
          {justInstalled ? 'Installed! Opening new app…' : 'Install Azyah'}
        </span>
        <span className="text-xs opacity-80">Faster loads. Push reminders. Fullscreen.</span>
      </div>
      <button
        onClick={onInstall}
        disabled={!canInstall}
        className={`text-sm font-medium rounded-xl px-3 py-1.5 border border-white/20 ${canInstall ? 'opacity-100 hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
        aria-label="Install Azyah"
      >
        {canInstall ? 'Install' : 'Not available'}
      </button>
    </div>
  );
}