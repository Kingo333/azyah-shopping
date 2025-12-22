import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

// Configure iOS StatusBar for Snapchat-style behavior:
// Content extends behind status bar, icons always visible
async function configureStatusBar() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      // SNAPCHAT-STYLE: Let WebView extend behind status bar
      // This allows content to bleed behind the notch area
      await StatusBar.setOverlaysWebView({ overlay: true });
      
      // Default to Dark style (black icons) for pages with light backgrounds
      // Pages with dark backgrounds should use useStatusBar('light') hook
      await StatusBar.setStyle({ style: Style.Dark });
      
    } catch (error) {
      console.warn('StatusBar configuration skipped:', error);
    }
  }
}

configureStatusBar();

createRoot(document.getElementById("root")!).render(<App />);
