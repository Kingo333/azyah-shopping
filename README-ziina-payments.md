
# Ziina Payment Integration

This document describes the complete Ziina payment integration for premium subscriptions.

## Overview

The system implements a secure payment flow using Ziina's Payment Intent API with the following features:

- Server-to-server payment intent creation
- Hosted checkout with Apple Pay / Google Pay support
- Webhook-based status updates with HMAC verification
- IP allowlist security
- Idempotent webhook processing
- Comprehensive test suite

## Environment Variables

Set these secrets in Supabase Edge Functions:

```bash
supabase secrets set \
  ZIINA_API_BASE="https://api-v2.ziina.com/api" \
  ZIINA_API_TOKEN="your_ziina_api_token_here" \
  ZIINA_WEBHOOK_SECRET="your_webhook_secret_here" \
  APP_BASE_URL="https://azyahstyle.com"
```

Required scopes for `ZIINA_API_TOKEN`:
- `write_payment_intents`
- `write_webhooks` 
- `write_refunds`

## Database Schema

### payments table
```sql
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'ziina',
  payment_intent_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('consumer_premium')),
  amount_fils int NOT NULL CHECK (amount_fils >= 200),
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL CHECK (status IN (
    'requires_payment_instrument','requires_user_action','pending','completed','failed','canceled'
  )),
  redirect_url text,
  success_url text,
  cancel_url text,
  fee_amount_fils int,
  tip_amount_fils int DEFAULT 0,
  latest_error_message text,
  latest_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### webhook_events table
```sql
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'ziina',
  event text NOT NULL,
  pi_id text NOT NULL,
  raw_body jsonb NOT NULL,
  signature text,
  ip inet,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## API Endpoints

### Edge Functions

1. **create-payment-intent** - Creates payment intents with Ziina
   - Method: POST
   - Auth: JWT required
   - Body: `{ amountAed: number, test?: boolean, message?: string }`
   - Returns: `{ redirectUrl: string, pi: string }`

2. **verify-payment** - Verifies payment status
   - Method: POST  
   - Auth: JWT required
   - Body: `{ pi: string }`
   - Returns: Payment status object

3. **payment-webhook** - Handles Ziina webhooks
   - Method: POST
   - Auth: None (IP + HMAC verified)
   - Verifies HMAC signature and IP allowlist
   - Updates payment status in database

4. **register-webhook** - Registers webhook with Ziina
   - Method: POST
   - Auth: JWT required
   - Returns: Registration status

## Payment Flow

### 1. Create Payment Intent
```typescript
const result = await supabase.functions.invoke('create-payment-intent', {
  body: { amountAed: 40, test: true },
  headers: { Authorization: `Bearer ${userJWT}` }
});

// Redirect user to result.redirectUrl
window.location.href = result.redirectUrl;
```

### 2. User Completes Payment
User is redirected to one of:
- `/payments/ziina/success?pi={PAYMENT_INTENT_ID}` - Success
- `/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}` - Canceled  
- `/payments/ziina/failure?pi={PAYMENT_INTENT_ID}` - Failed

### 3. Status Verification
Success page polls for status updates:
```typescript
const status = await supabase.functions.invoke('verify-payment', {
  body: { pi: paymentIntentId },
  headers: { Authorization: `Bearer ${userJWT}` }
});
```

### 4. Webhook Updates
Ziina sends status updates to `/functions/v1/payment-webhook`:
- IP allowlist verification: `3.29.184.186`, `3.29.190.95`, `20.233.47.127`
- HMAC verification using `X-Hmac-Signature` header
- Idempotent processing prevents duplicate updates

## Security Features

- **HMAC Verification**: All webhooks verified with SHA-256 HMAC
- **IP Allowlist**: Only Ziina IPs can send webhooks
- **JWT Authentication**: All user-facing endpoints require authentication
- **Secret Management**: API tokens never exposed to frontend
- **Idempotency**: Duplicate webhooks are ignored
- **Request Timeouts**: 10-second timeouts on external API calls

## Testing

### Unit Tests
- AED to fils conversion
- HMAC signature verification
- IP allowlist validation
- Zod schema validation

### Integration Tests
- Payment intent creation
- Payment verification
- Webhook simulation

### Run Tests
```typescript
import { runZiinaTests } from '@/utils/ziinaTests';

const results = await runZiinaTests();
console.log(`${results.filter(r => r.passed).length}/${results.length} tests passed`);
```

## cURL Examples

### Create Payment Intent
```bash
curl -X POST "https://api-v2.ziina.com/api/payment_intent" \
  -H "Authorization: Bearer $ZIINA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4000,
    "currency_code": "AED",
    "message": "Azyah Premium",
    "success_url": "https://azyahstyle.com/payments/ziina/success?pi={PAYMENT_INTENT_ID}",
    "cancel_url": "https://azyahstyle.com/payments/ziina/cancel?pi={PAYMENT_INTENT_ID}",
    "failure_url": "https://azyahstyle.com/payments/ziina/failure?pi={PAYMENT_INTENT_ID}",  
    "test": true,
    "expiry": '$(( $(date +%s%3N) + 1800000 ))',
    "allow_tips": false
  }'
```

### Fetch Payment Status
```bash
curl -X GET "https://api-v2.ziina.com/api/payment_intent/{id}" \
  -H "Authorization: Bearer $ZIINA_API_TOKEN"
```

### Register Webhook
```bash
curl -X POST "https://api-v2.ziina.com/api/webhook" \
  -H "Authorization: Bearer $ZIINA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://klwolsopucgswhtdlsps.supabase.co/functions/v1/payment-webhook",
    "secret": "your_webhook_secret_here"
  }'
```

## Deployment

1. **Set Secrets**: Configure all environment variables in Supabase
2. **Deploy Functions**: Functions auto-deploy when code changes
3. **Run Migrations**: Apply database schema changes
4. **Register Webhook**: Call register-webhook endpoint once
5. **Test**: Run test suite in both test and live modes
6. **Remove Maintenance Flag**: Set `FEATURES.PAYMENTS_MAINTENANCE = false`

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token and user authentication
2. **Environment Variables**: Verify all secrets are set in Supabase
3. **Webhook Failures**: Check IP allowlist and HMAC signature
4. **Payment Stuck**: Verify webhook registration and check logs

### Debug Commands
```bash
# Check webhook registration
curl -X GET "https://api-v2.ziina.com/api/webhook" \
  -H "Authorization: Bearer $ZIINA_API_TOKEN"

# View edge function logs
supabase functions logs create-payment-intent
supabase functions logs payment-webhook
```

### Monitoring
- Monitor edge function logs for errors
- Track payment success/failure rates
- Set up alerts for webhook processing failures
- Monitor IP allowlist violations

## Rollback Procedure

To rollback to maintenance mode:
1. Set `FEATURES.PAYMENTS_MAINTENANCE = true`
2. Delete webhook: `curl -X DELETE "https://api-v2.ziina.com/api/webhook" -H "Authorization: Bearer $ZIINA_API_TOKEN"`
3. Disable edge functions if needed

## Support

For production issues:
- Check edge function logs first
- Verify webhook delivery in Ziina dashboard
- Contact Ziina support for API issues
- Review payment records in database for status
