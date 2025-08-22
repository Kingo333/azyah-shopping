-- Create payments table for comprehensive payment tracking
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_fils INTEGER NOT NULL,
  fee_amount_fils INTEGER DEFAULT NULL,
  tip_amount_fils INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  provider TEXT NOT NULL DEFAULT 'ziina',
  payment_intent_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL DEFAULT 'consumer_premium',
  currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  redirect_url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  failure_url TEXT,
  latest_error_message TEXT,
  latest_error_code TEXT
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own payments
CREATE POLICY "Users can create their own payments" ON public.payments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service can manage all payments
CREATE POLICY "Service can manage all payments" ON public.payments
FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();