import { registerPlugin } from '@capacitor/core';

import type { AzyahWebViewExtractorPlugin } from './definitions';

/**
 * Azyah WebView Extractor Plugin
 * 
 * Provides true in-session product extraction using native WebView
 * with JavaScript injection (not system browser).
 * 
 * This enables "Phia-style" extraction on blocked sites like ASOS, Zara, Nike.
 */
const AzyahWebViewExtractor = registerPlugin<AzyahWebViewExtractorPlugin>(
  'AzyahWebViewExtractor',
  {
    web: () => import('./web').then(m => new m.AzyahWebViewExtractorWeb()),
  }
);

export * from './definitions';
export { AzyahWebViewExtractor };
