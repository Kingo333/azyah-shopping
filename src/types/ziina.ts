
import { z } from 'zod';

// Payment Intent Status Enum
export const PaymentIntentStatus = [
  'requires_payment_instrument',
  'requires_user_action', 
  'pending',
  'completed',
  'failed',
  'canceled'
] as const;

export type PaymentIntentStatus = typeof PaymentIntentStatus[number];

// Zod Schemas for API Validation
export const PaymentIntentSchema = z.object({
  id: z.string(),
  account_id: z.string().optional(),
  amount: z.number(),
  tip_amount: z.number().default(0),
  fee_amount: z.number().nullable(),
  currency_code: z.string(),
  created_at: z.string().optional(),
  status: z.enum(PaymentIntentStatus),
  operation_id: z.string(),
  message: z.string().nullable(),
  redirect_url: z.string(),
  success_url: z.string(),
  cancel_url: z.string(),
  latest_error: z.object({
    message: z.string(),
    code: z.string()
  }).nullable(),
  allow_tips: z.boolean().default(false),
  expiry: z.union([z.string(), z.number()]).optional()
});

export const RefundSchema = z.object({
  id: z.string(),
  payment_intent_id: z.string(),
  amount: z.number(),
  currency_code: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.string(),
  error: z.object({
    message: z.string(),
    code: z.string()
  }).nullable()
});

export const WebhookPayloadSchema = z.object({
  event: z.string(),
  data: PaymentIntentSchema
});

// TypeScript Types
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export type Refund = z.infer<typeof RefundSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// Database Types
export interface PaymentRecord {
  id: string;
  provider: string;
  payment_intent_id: string;
  user_id: string;
  product: string;
  amount_fils: number;
  currency: string;
  status: PaymentIntentStatus;
  operation_id: string;
  redirect_url?: string;
  success_url?: string;
  cancel_url?: string;
  fee_amount_fils?: number;
  tip_amount_fils: number;
  latest_error_message?: string;
  latest_error_code?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event: string;
  pi_id: string;
  raw_body: Record<string, any>;
  signature: string;
  ip?: string;
  processed: boolean;
  created_at: string;
}

// API Request/Response Types
export interface CreatePaymentIntentRequest {
  product: 'consumer_premium';
  amountAed: number;
  test?: boolean;
}

export interface CreatePaymentIntentResponse {
  redirectUrl: string;
  pi: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: PaymentIntentStatus;
  amount_fils: number;
  currency: string;
  fee_amount_fils?: number;
  tip_amount_fils: number;
  latest_error_message?: string;
  latest_error_code?: string;
  created_at: string;
  updated_at: string;
}
