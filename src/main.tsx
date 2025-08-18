import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from './utils/pwaHelpers'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerSW();
}
