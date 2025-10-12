export type TryOnProvider = 'gemini' | 'bitstudio';

export interface TryOnRequest {
  eventId: string;
  userId: string;
  productId: string;
  personImagePath: string;  // Storage path or URL
  outfitImagePath: string;  // Storage path or URL
}

export interface TryOnResult {
  ok: boolean;
  jobId?: string;
  outputPath?: string;
  error?: string;
}

export interface ITryOnProvider {
  name: TryOnProvider;
  
  /**
   * Validate and prepare product assets (optional pre-step)
   */
  prepareProduct?(productId: string): Promise<boolean>;
  
  /**
   * Execute virtual try-on
   */
  tryOn(req: TryOnRequest): Promise<TryOnResult>;
}
