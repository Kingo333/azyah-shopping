import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

// Configure iOS StatusBar for Safari-style behavior:
// iOS handles the black status bar automatically, content starts below it
async function configureStatusBar() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      // SAFARI-STYLE: Don't overlay - iOS handles status bar automatically
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Style.Dark = BLACK icons on light background (iOS default)
      await StatusBar.setStyle({ style: Style.Dark });
      
    } catch (error) {
      console.warn('StatusBar configuration skipped:', error);
    }
  }
}

configureStatusBar();

createRoot(document.getElementById("root")!).render(<App />);
