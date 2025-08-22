
import crypto from 'crypto';
import { PaymentIntent, PaymentIntentSchema, Refund, RefundSchema } from '@/types/ziina';

const ZIINA_API_BASE = process.env.ZIINA_API_BASE || 'https://api-v2.ziina.com/api';
const ZIINA_API_TOKEN = process.env.ZIINA_API_TOKEN;
const APP_BASE_URL = process.env.APP_DASHBOARD_URL || 'https://klwolsopucgswhtdlsps.supabase.co';

if (!ZIINA_API_TOKEN) {
  throw new Error('ZIINA_API_TOKEN environment variable is required');
}

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
  const url = `${ZIINA_API_BASE}${endpoint}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[Ziina API] ${method} ${url}`, { attempt: attempt + 1, body });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${ZIINA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const data = await response.json();
      
      console.log(`[Ziina API] Response ${response.status}:`, data);

      if (!response.ok) {
        throw new ZiinaError(
          data.message || `HTTP ${response.status}`,
          response.status,
          data.code,
          data
        );
      }

      return data;
    } catch (error) {
      console.error(`[Ziina API] Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries || !(error instanceof Error) || !error.message.includes('5')) {
        throw error;
      }
      
      // Exponential backoff with jitter for 5xx errors
      const delay = (Math.pow(2, attempt) * 1000) + (Math.random() * 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
  const body = {
    amount: params.amount_fils,
    currency_code: params.currency,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    failure_url: params.failureUrl,
    message: params.message,
    test: params.test || false,
    expiry: params.expiryMs,
    allow_tips: params.allowTips || false,
    operation_id: params.operationId,
  };

  const response = await makeRequest<any>('/payment_intent', 'POST', body);
  
  // Validate response with Zod
  const validatedResponse = PaymentIntentSchema.parse(response);
  return validatedResponse;
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent> {
  const response = await makeRequest<any>(`/payment_intent/${id}`);
  
  // Validate response with Zod
  const validatedResponse = PaymentIntentSchema.parse(response);
  return validatedResponse;
}

export async function createOrUpdateWebhook(url: string, secret: string): Promise<{success: boolean, error?: string}> {
  try {
    const body = {
      url,
      secret,
      events: ['payment_intent.status.updated']
    };

    await makeRequest('/webhook', 'POST', body);
    console.log(`[Ziina API] Webhook registered successfully:`, { url });
    return { success: true };
  } catch (error) {
    console.error('[Ziina API] Failed to create/update webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getRefund(id: string): Promise<Refund> {
  const response = await makeRequest<any>(`/refund/${id}`);
  
  // Validate response with Zod
  const validatedResponse = RefundSchema.parse(response);
  return validatedResponse;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    
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
