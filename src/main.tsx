import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from './utils/pwaHelpers'
import { initLoadingFailsafe, initVisualEditsDetection } from './utils/loadingManager'

// Initialize loading management and Visual Edits detection
initLoadingFailsafe();
initVisualEditsDetection();

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerSW();
}
