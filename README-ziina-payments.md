
# Ziina Payment Integration

This document provides comprehensive information about the Ziina payment integration implementation in the Azyah platform.

## Overview

The Ziina payment integration handles premium subscription payments for consumers. It uses a hosted checkout flow where users are redirected to Ziina's payment page and then returned to our platform upon completion.

**Premium Features:**
- 40 AED/month subscription
- 20 AI Try-ons daily
- Unlimited replica generation
- UGC collaboration access

## Environment Variables

The following environment variables must be configured in Supabase Edge Functions:

```bash
# Ziina API Configuration
ZIINA_API_BASE=https://api-v2.ziina.com/api
ZIINA_API_TOKEN=<your-ziina-api-token>
ZIINA_WEBHOOK_SECRET=<your-webhook-secret>

# Application Configuration
APP_BASE_URL=https://your-production-domain.com

# Supabase Configuration (auto-configured)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Setting Environment Variables

```bash
# Set secrets in Supabase
supabase secrets set ZIINA_API_TOKEN=your_token_here
supabase secrets set ZIINA_WEBHOOK_SECRET=your_webhook_secret_here
supabase secrets set APP_BASE_URL=https://your-domain.com

# Deploy functions after setting secrets
supabase functions deploy
```

## API Endpoints

### Edge Functions

1. **create-payment-intent**
   - **URL:** `https://your-project.supabase.co/functions/v1/create-payment-intent`
   - **Method:** POST
   - **Auth:** Required (Bearer token)
   - **Body:**
     ```json
     {
       "product": "consumer_premium",
       "amountAed": 40,
       "test": false
     }
     ```
   - **Response:**
     ```json
     {
       "redirectUrl": "https://checkout.ziina.com/...",
       "pi": "pi_123456789"
     }
     ```

2. **verify-payment**
   - **URL:** `https://your-project.supabase.co/functions/v1/verify-payment`
   - **Method:** POST
   - **Auth:** Required (Bearer token)
   - **Body:**
     ```json
     {
       "payment_intent_id": "pi_123456789"
     }
     ```

3. **payment-webhook**
   - **URL:** `https://your-project.supabase.co/functions/v1/payment-webhook`
   - **Method:** POST
   - **Auth:** None (HMAC verified)
   - **Headers:** `X-Hmac-Signature: <hmac-signature>`

## Frontend Flow

### 1. Payment Initiation

```typescript
import { useSubscription } from '@/hooks/useSubscription';

const { createPaymentIntent } = useSubscription();

// Initiate payment
await createPaymentIntent(false); // false = production, true = test mode
```

### 2. Payment Pages

- **Success:** `/payments/ziina/success?pi={PAYMENT_INTENT_ID}`
- **Cancel:** `/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}`  
- **Failure:** `/payments/ziina/failure?pi={PAYMENT_INTENT_ID}`

The success page automatically polls the payment status and grants premium access when completed.

### 3. Premium Access Check

```typescript
import { useSubscription } from '@/hooks/useSubscription';

const { isPremium } = useSubscription();

if (isPremium) {
  // Grant access to premium features
}
```

## Database Schema

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'ziina',
  payment_intent_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  product TEXT NOT NULL DEFAULT 'consumer_premium',
  amount_fils INTEGER NOT NULL,
  currency TEXT DEFAULT 'AED',
  status payment_intent_status NOT NULL,
  operation_id TEXT NOT NULL,
  redirect_url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  fee_amount_fils INTEGER,
  tip_amount_fils INTEGER DEFAULT 0,
  latest_error_message TEXT,
  latest_error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Webhook Events Table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'ziina',
  event TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  raw_body JSONB NOT NULL,
  signature TEXT UNIQUE NOT NULL,
  ip TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Webhook Configuration

### Register Webhook

```bash
curl -X POST https://api-v2.ziina.com/api/webhook \
  -H "Authorization: Bearer YOUR_ZIINA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project.supabase.co/functions/v1/payment-webhook",
    "secret": "YOUR_WEBHOOK_SECRET"
  }'
```

### Delete Webhook

```bash
curl -X DELETE https://api-v2.ziina.com/api/webhook \
  -H "Authorization: Bearer YOUR_ZIINA_API_TOKEN"
```

## Testing

### Test Payment Creation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-payment-intent \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "consumer_premium",
    "amountAed": 40,
    "test": true
  }'
```

### Test Webhook Signature

```typescript
import { verifyWebhookSignature } from '@/lib/ziina';

const isValid = await verifyWebhookSignature(
  rawBody,
  signature,
  webhookSecret
);
```

## Security

### HMAC Verification

All webhook requests are verified using HMAC-SHA256:

```typescript
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

const isValid = signature === expectedSignature;
```

### IP Allowlist

Webhook requests are only accepted from these Ziina IP addresses:
- `3.29.184.186`
- `3.29.190.95`
- `20.233.47.127`

### Row Level Security

- Users can only view their own payment records
- Webhook updates use service role permissions
- Admin panel requires admin role

## Error Handling

### Common Error Responses

1. **Configuration Error (500)**
   ```json
   {
     "error": "Configuration error",
     "details": "APP_BASE_URL environment variable is missing"
   }
   ```

2. **Ziina API Error (502)**
   ```json
   {
     "error": "ziina_create_failed",
     "upstream_status": 400,
     "details": "Invalid request parameters"
   }
   ```

3. **Authentication Error (401)**
   ```json
   {
     "error": "Invalid authentication",
     "details": "User not found"
   }
   ```

## Monitoring and Logs

### Structured Logging

All API calls include structured JSON logs:

```json
{
  "stage": "ziina_create",
  "status": 200,
  "reqKeys": ["amount", "currency_code", "test"],
  "resSummary": {
    "id": "pi_123456789",
    "status": "requires_user_action",
    "hasRedirectUrl": true
  }
}
```

### Admin Panel

Access the payment admin panel at `/admin` (admin users only) to:
- View recent payments and their status
- Monitor webhook events
- Check refund status
- Debug payment issues

## Operations Runbook

### Rotating API Tokens

1. Generate new token in Ziina dashboard
2. Update Supabase secret:
   ```bash
   supabase secrets set ZIINA_API_TOKEN=new_token_here
   ```
3. Deploy functions:
   ```bash
   supabase functions deploy
   ```

### Rotating Webhook Secret

1. Generate new secret (use strong random string)
2. Update Supabase secret:
   ```bash
   supabase secrets set ZIINA_WEBHOOK_SECRET=new_secret_here
   ```
3. Re-register webhook with new secret
4. Deploy functions

### Troubleshooting Common Issues

1. **Payment stuck in pending**
   - Check webhook events in admin panel
   - Verify webhook is registered correctly
   - Check Ziina API logs

2. **Webhook signature failures**
   - Verify ZIINA_WEBHOOK_SECRET is correct
   - Check IP allowlist configuration
   - Ensure raw body is used for signature

3. **Environment variable issues**
   - Use `APP_BASE_URL` consistently (not `APP_DASHBOARD_URL`)
   - Ensure all required secrets are set
   - Re-deploy functions after changing secrets

## Support

For payment-related issues:
1. Check the admin panel for payment status
2. Review Edge Function logs in Supabase dashboard
3. Verify webhook registration with Ziina
4. Contact Ziina support for API-related issues
