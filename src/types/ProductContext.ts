// Phia-style ProductContext schema for in-session extraction
// Used by extensions (Chrome/Safari), WebView extractor, and photo uploads

export type ExtractionSource = 
  | 'chrome_ext' 
  | 'safari_ext' 
  | 'azyah_webview' 
  | 'photo_upload'
  | 'url_paste';

export interface ProductContext {
  // Required: where the product was found
  page_url: string;
  
  // Extraction source
  extracted_from: ExtractionSource;
  
  // Product metadata (optional, from extraction)
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  
  // Images (critical for visual similarity)
  main_image_url?: string;
  image_urls?: string[];
  
  // Category hints for query locking
  category_hint?: string;
  
  // Additional metadata
  availability?: string;
  variants?: ProductVariant[];
  
  // Extraction quality indicator
  extraction_confidence?: 'high' | 'medium' | 'low';
}

export interface ProductVariant {
  label: string;
  value: string;
}

// Response from deals-from-context endpoint
export interface DealsFromContextResponse {
  success: boolean;
  input_context: ProductContext;
  visual_matches: VisualMatch[];
  shopping_results: ShoppingResult[];
  price_stats: PriceStats;
  deals_found: number;
  pipeline_log?: PipelineLog;
  cached?: boolean;
  error?: string;
  suggestion?: string;
}

export interface VisualMatch {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
}

export interface ShoppingResult {
  title: string;
  link: string;
  thumbnail: string;
  source: string;
  price: string;
  extracted_price: number | null;
  rating?: number;
  reviews?: number;
  position: number;
  // Visual similarity score (0-1, higher = more similar)
  similarity_score?: number;
}

export interface PriceStats {
  low: number | null;
  median: number | null;
  high: number | null;
  valid_count: number;
}

export interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
  visual_rerank_applied?: boolean;
}

// JS injection extraction result (from WebView)
export interface WebViewExtractionResult {
  success: boolean;
  context?: ProductContext;
  error?: string;
  extraction_method?: 'json_ld' | 'og_tags' | 'dom_fallback';
}
