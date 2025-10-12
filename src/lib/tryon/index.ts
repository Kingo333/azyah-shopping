import { getProvider } from './providers/select';
import type { TryOnRequest, TryOnResult } from './types';

export * from './types';

export async function runTryOn(req: TryOnRequest): Promise<TryOnResult> {
  console.log('[TryOn] Starting with request:', req);
  
  const provider = await getProvider(req.productId);
  console.log('[TryOn] Using provider:', provider.name);
  
  return provider.tryOn(req);
}
