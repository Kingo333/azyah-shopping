import { WebPlugin } from '@capacitor/core';

import type { 
  AzyahWebViewExtractorPlugin, 
  OpenAndExtractOptions, 
  ExtractionResult 
} from './definitions';

/**
 * Web implementation of the WebView Extractor plugin.
 * 
 * On web, cross-origin restrictions prevent JavaScript injection
 * into other sites. This fallback opens the URL in a new tab
 * and guides the user to use the mobile app or Photo tab.
 */
export class AzyahWebViewExtractorWeb 
  extends WebPlugin 
  implements AzyahWebViewExtractorPlugin {
  
  async openAndExtract(options: OpenAndExtractOptions): Promise<ExtractionResult> {
    console.log('[AzyahWebViewExtractor] Web fallback - opening URL in new tab');
    
    // On web, we cannot inject JavaScript into third-party sites
    // Open the URL and inform the user about the limitation
    window.open(options.url, '_blank', 'noopener,noreferrer');
    
    return {
      success: false,
      error: 'Extraction requires the mobile app. For best results, use the Photo tab or copy the product image URL.',
      cancelled: true,
    };
  }
}
