
-- Fix database schema constraints and add proper enums
-- Add payment status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status') THEN
        CREATE TYPE payment_intent_status AS ENUM (
            'requires_payment_instrument',
            'requires_user_action', 
            'pending',
            'completed',
            'failed',
            'canceled'
        );
    END IF;
END $$;

-- Update payments table to use proper enum and add constraints
ALTER TABLE payments 
    ALTER COLUMN status TYPE payment_intent_status USING status::payment_intent_status;

-- Add unique constraint on payment_intent_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_payment_intent_id_unique'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT payments_payment_intent_id_unique UNIQUE (payment_intent_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id_status ON payments(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Ensure webhook_events table exists with proper structure
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'ziina',
    event TEXT NOT NULL,
    pi_id TEXT NOT NULL,
    raw_body JSONB NOT NULL,
    signature TEXT NOT NULL,
    ip TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on signature for idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'webhook_events_signature_unique'
    ) THEN
        ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_signature_unique UNIQUE (signature);
    END IF;
END $$;

-- Create index on webhook_events for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_pi_id ON webhook_events(pi_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
