-- UGC Collaboration Feature Migration

-- Create enums for collaboration system
CREATE TYPE collab_comp_type AS ENUM ('PRODUCT_EXCHANGE', 'PRODUCT_AND_PAID');
CREATE TYPE collab_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- Create collaborations table
CREATE TABLE public.collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL, -- References brands.id or retailers.id
  title TEXT NOT NULL,
  brief TEXT,
  platforms TEXT[] DEFAULT '{}', -- Array of platform names
  deliverables JSONB DEFAULT '{}', -- Structure like {"instagram":{"reels":3,"stories":2},"tiktok":{"videos":2}}
  tone TEXT,
  talking_points TEXT[],
  comp_type collab_comp_type NOT NULL,
  currency TEXT,
  amount NUMERIC(12,2),
  visibility TEXT DEFAULT 'public',
  max_creators INTEGER,
  application_deadline TIMESTAMPTZ,
  status collab_status DEFAULT 'DRAFT',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collaboration applications table  
CREATE TABLE public.collab_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  shopper_id UUID NOT NULL,
  social_links JSONB DEFAULT '{}', -- Structure like {"instagram":"https://...","tiktok":"https://..."}
  note TEXT,
  status application_status DEFAULT 'PENDING',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collaboration status history table for audit
CREATE TABLE public.collab_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  old_status collab_status,
  new_status collab_status NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add social links to profiles (if not already exists)
-- Check if column exists first, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'social_links') THEN
        ALTER TABLE public.users ADD COLUMN social_links JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX idx_collaborations_status_deadline ON public.collaborations(status, application_deadline);
CREATE INDEX idx_collaborations_owner_org ON public.collaborations(owner_org_id, status);
CREATE INDEX idx_collab_applications_collab_status ON public.collab_applications(collab_id, status);
CREATE INDEX idx_collab_applications_shopper ON public.collab_applications(shopper_id, status);

-- Enable RLS
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborations
CREATE POLICY "Public can view active public collaborations" ON public.collaborations
  FOR SELECT USING (status = 'ACTIVE' AND visibility = 'public');

CREATE POLICY "Brand owners can manage their collaborations" ON public.collaborations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands 
      WHERE brands.id = collaborations.owner_org_id 
      AND brands.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Retailer owners can manage their collaborations" ON public.collaborations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.retailers 
      WHERE retailers.id = collaborations.owner_org_id 
      AND retailers.owner_user_id = auth.uid()
    )
  );

-- RLS Policies for collab_applications
CREATE POLICY "Shoppers can create applications" ON public.collab_applications
  FOR INSERT WITH CHECK (
    auth.uid() = shopper_id AND
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collab_id 
      AND c.status = 'ACTIVE'
      AND (c.application_deadline IS NULL OR c.application_deadline > NOW())
    ) AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'shopper'
    )
  );

CREATE POLICY "Shoppers can view and update their own applications" ON public.collab_applications
  FOR ALL USING (auth.uid() = shopper_id);

CREATE POLICY "Brand/Retailer owners can manage applications for their collaborations" ON public.collab_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collab_id AND (
        EXISTS (
          SELECT 1 FROM public.brands b
          WHERE b.id = c.owner_org_id AND b.owner_user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.retailers r
          WHERE r.id = c.owner_org_id AND r.owner_user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for collab_status_history  
CREATE POLICY "Only owners can view collaboration history" ON public.collab_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collab_id AND (
        EXISTS (
          SELECT 1 FROM public.brands b
          WHERE b.id = c.owner_org_id AND b.owner_user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.retailers r
          WHERE r.id = c.owner_org_id AND r.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Insert can only be done by system/triggers
CREATE POLICY "System can insert history" ON public.collab_status_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = changed_by);

-- Create trigger for updated_at on collaborations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collaborations_updated_at 
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for status history tracking
CREATE OR REPLACE FUNCTION track_collab_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.collab_status_history (collab_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_collaboration_status_changes
  AFTER UPDATE ON public.collaborations
  FOR EACH ROW EXECUTE FUNCTION track_collab_status_change();