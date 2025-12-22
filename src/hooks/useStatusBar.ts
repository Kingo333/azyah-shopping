import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to dynamically control iOS status bar style.
 * 
 * @param style - 'light' for white icons (dark backgrounds), 'dark' for black icons (light backgrounds)
 */
export function useStatusBar(style: 'light' | 'dark' = 'dark') {
  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ 
          style: style === 'light' ? Style.Light : Style.Dark 
        });
      }).catch(err => {
        console.warn('StatusBar style change skipped:', err);
      });
    }
    
    // Cleanup: restore default (dark icons for light backgrounds) on unmount
    return () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          StatusBar.setStyle({ style: Style.Dark });
        }).catch(() => {});
      }
    };
  }, [style]);
}
