import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

// Configure iOS StatusBar to not overlay WebView content
async function configureStatusBar() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
    } catch (error) {
      console.warn('StatusBar configuration skipped:', error);
    }
  }
}

configureStatusBar();

createRoot(document.getElementById("root")!).render(<App />);
