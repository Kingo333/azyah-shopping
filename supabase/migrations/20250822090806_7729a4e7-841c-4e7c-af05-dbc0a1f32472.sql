
-- Drop existing subscriptions table and create the new payments and webhook_events tables as per spec
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Create payments table as per specification
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'ziina',
  payment_intent_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL DEFAULT 'consumer_premium',
  amount_fils INTEGER NOT NULL,
  currency TEXT DEFAULT 'AED',
  status TEXT NOT NULL CHECK (status IN ('requires_payment_instrument', 'requires_user_action', 'pending', 'completed', 'failed', 'canceled')),
  operation_id TEXT NOT NULL,
  redirect_url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  fee_amount_fils INTEGER,
  tip_amount_fils INTEGER DEFAULT 0,
  latest_error_message TEXT,
  latest_error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create webhook_events table as per specification
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'ziina',
  event TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  raw_body JSONB NOT NULL,
  signature TEXT NOT NULL,
  ip INET,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX idx_payments_operation_id ON public.payments(operation_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_webhook_events_pi_id ON public.webhook_events(pi_id);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);

-- Enable RLS on both tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage all payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for webhook_events table (admin only)
CREATE POLICY "Only service can manage webhook events" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
