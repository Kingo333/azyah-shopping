import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

// Configure iOS StatusBar for Snapchat-style behavior:
// Content extends behind status bar, dark scrim ensures white icons visible
async function configureStatusBar() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      // SNAPCHAT-STYLE: Let WebView extend behind status bar
      await StatusBar.setOverlaysWebView({ overlay: true });
      
      // Style.Light = WHITE icons - works with our dark gray scrim
      await StatusBar.setStyle({ style: Style.Light });
      
    } catch (error) {
      console.warn('StatusBar configuration skipped:', error);
    }
  }
}

configureStatusBar();

createRoot(document.getElementById("root")!).render(<App />);
