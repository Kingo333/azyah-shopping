import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Global status bar scrim component.
 * Creates a dark gray overlay behind the iOS status bar area
 * so white icons are always visible regardless of page content.
 * 
 * This should be rendered at the App Shell level.
 */
export function StatusBarScrim() {
  // Set white status bar icons globally on iOS
  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        // Style.Light = WHITE icons (for dark backgrounds/scrims)
        StatusBar.setStyle({ style: Style.Light });
      }).catch(err => {
        console.warn('StatusBar style change skipped:', err);
      });
    }
  }, []);

  // Only render on native iOS
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{
        height: 'env(safe-area-inset-top, 44px)',
        background: 'linear-gradient(to bottom, rgba(30, 30, 30, 0.85) 0%, rgba(30, 30, 30, 0.6) 60%, transparent 100%)',
      }}
      aria-hidden="true"
    />
  );
}
