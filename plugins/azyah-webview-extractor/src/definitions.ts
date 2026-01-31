/**
 * Options for opening WebView and extracting product data
 */
export interface OpenAndExtractOptions {
  /** The URL to load in the WebView */
  url: string;
  
  /** 
   * JavaScript to inject and execute after page loads.
   * Must return an object with { success, context, error, extraction_method }
   */
  script: string;
  
  /** Timeout in milliseconds before returning error (default: 15000) */
  timeoutMs?: number;
  
  /** Toolbar color in hex format (default: '#1f2937') */
  toolbarColor?: string;
  
  /** Whether to show the toolbar with URL and Done button (default: true) */
  showToolbar?: boolean;
}

/**
 * Extracted product context from the WebView
 */
export interface ExtractedContext {
  /** The URL that was loaded */
  page_url: string;
  
  /** Source identifier */
  extracted_from: 'azyah_webview';
  
  /** Product title */
  title?: string;
  
  /** Brand name */
  brand?: string;
  
  /** Numeric price */
  price?: number;
  
  /** Currency code (USD, AED, etc.) */
  currency?: string;
  
  /** Primary product image URL */
  main_image_url?: string;
  
  /** Additional image URLs */
  image_urls?: string[];
  
  /** Category hint for query locking */
  category_hint?: string;
  
  /** Product availability */
  availability?: string;
  
  /** How confident we are in the extraction */
  extraction_confidence?: 'high' | 'medium' | 'low';
}

/**
 * Result from the extraction operation
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  
  /** Extracted product context (if successful) */
  context?: ExtractedContext;
  
  /** Error message (if failed) */
  error?: string;
  
  /** How the data was extracted */
  extraction_method?: 'json_ld' | 'og_tags' | 'dom_fallback';
  
  /** Whether user cancelled by closing the WebView */
  cancelled?: boolean;
}

/**
 * Plugin interface for the Azyah WebView Extractor
 */
export interface AzyahWebViewExtractorPlugin {
  /**
   * Open a WebView, load the URL, inject extraction script, and return results.
   * 
   * iOS: Uses WKWebView with evaluateJavaScript
   * Android: Uses WebView with evaluateJavascript
   * Web: Returns fallback message (cross-origin prevents extraction)
   */
  openAndExtract(options: OpenAndExtractOptions): Promise<ExtractionResult>;
}
