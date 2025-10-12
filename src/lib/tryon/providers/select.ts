import { supabase } from '@/integrations/supabase/client';
import { geminiProvider } from './gemini';
import { bitstudioProvider } from './bitstudio';
import type { ITryOnProvider, TryOnProvider } from '../types';

export async function getProvider(productId: string): Promise<ITryOnProvider> {
  const { data: product } = await supabase
    .from('event_brand_products')
    .select('try_on_provider')
    .eq('id', productId)
    .single();
  
  const providerName = (product?.try_on_provider as TryOnProvider) || 'gemini';
  
  if (providerName === 'bitstudio') {
    return bitstudioProvider;
  }
  
  return geminiProvider; // Default to Gemini
}
