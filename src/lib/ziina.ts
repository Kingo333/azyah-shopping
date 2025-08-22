
import { PaymentIntent, PaymentIntentSchema, Refund, RefundSchema } from '@/types/ziina';

const ZIINA_API_BASE = 'https://api-v2.ziina.com/api';

interface CreatePaymentIntentParams {
  amount_fils: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl?: string;
  message?: string;
  test?: boolean;
  expiryMs?: number;
  allowTips?: boolean;
  operationId: string;
}

class ZiinaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ZiinaError';
  }
}

async function makeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  retries = 2
): Promise<T> {
  // This function is now primarily used on the client side for documentation
  // The actual API calls are handled by Edge Functions
  throw new Error('Direct API calls should use Edge Functions instead');
}

export function convertAedToFils(aed: number): number {
  const fils = Math.round(aed * 100);
  if (fils < 200) {
    throw new Error('Minimum amount is 2 AED (200 fils)');
  }
  console.log('[Ziina] Amount conversion:', { aed, fils });
  return fils;
}

export function convertFilsToAed(fils: number): number {
  return fils / 100;
}

// Client-side helper for webhook signature verification (for testing)
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const dataBytes = encoder.encode(rawBody);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('[Ziina Webhook] Signature verification:', {
      expected: expectedSignature.substring(0, 10) + '...',
      received: signature.substring(0, 10) + '...',
      match: signature === expectedSignature
    });
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('[Ziina Webhook] Signature verification failed:', error);
    return false;
  }
}

export function isAllowedIP(ip: string): boolean {
  const allowedIPs = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];
  const isAllowed = allowedIPs.includes(ip);
  
  console.log('[Ziina Webhook] IP check:', { ip, allowed: isAllowed });
  return isAllowed;
}
