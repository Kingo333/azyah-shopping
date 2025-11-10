-- UGC Brand System Tables

-- Brands/Agencies directory
CREATE TABLE ugc_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  country TEXT,
  category TEXT CHECK (category IN ('fashion', 'beauty')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX ON ugc_brands (LOWER(name));

-- Brand Reviews
CREATE TABLE brand_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES ugc_brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT,
  work_type TEXT CHECK (work_type IN ('UGC','Affiliate','Gifted','Paid','Event')),
  deliverables TEXT,
  payout NUMERIC,
  currency TEXT DEFAULT 'AED',
  time_to_pay_days INTEGER,
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  fairness_rating INTEGER CHECK (fairness_rating BETWEEN 1 AND 5),
  would_work_again BOOLEAN,
  evidence_urls TEXT[] DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',
  report_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Brand Questions
CREATE TABLE brand_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES ugc_brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'published',
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Question Answers
CREATE TABLE brand_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES brand_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_accepted BOOLEAN DEFAULT false,
  report_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scam Reports
CREATE TABLE brand_scam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES ugc_brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scam_type TEXT CHECK (scam_type IN ('nonpayment', 'counterfeit', 'phishing', 'ghosting', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published',
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Votes (helpful/not helpful)
CREATE TABLE ugc_brand_votes (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT CHECK (content_type IN ('review','answer')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value INTEGER CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (content_type, content_id, user_id)
);

-- Reports (for 3-strike auto-hide)
CREATE TABLE ugc_brand_reports (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT CHECK (content_type IN ('review','question','answer','scam')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (content_type, content_id, user_id)
);

-- Brand stats view
CREATE VIEW ugc_brand_stats AS
SELECT
  b.id,
  b.name,
  b.logo_url,
  b.website_url,
  b.instagram_handle,
  b.category,
  b.country,
  b.is_verified,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'published') AS reviews_count,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'published') AS questions_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'published') AS scams_count,
  MAX(r.created_at) AS last_review_at
FROM ugc_brands b
LEFT JOIN brand_reviews r ON r.brand_id = b.id
LEFT JOIN brand_questions q ON q.brand_id = b.id
LEFT JOIN brand_scam_reports s ON s.brand_id = b.id
GROUP BY b.id;

-- RLS Policies

-- ugc_brands
ALTER TABLE ugc_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view brands" ON ugc_brands FOR SELECT USING (true);
CREATE POLICY "Authenticated can create brands" ON ugc_brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update brands they created" ON ugc_brands FOR UPDATE USING (true);

-- brand_reviews
ALTER TABLE brand_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published reviews" ON brand_reviews FOR SELECT USING (status = 'published');
CREATE POLICY "Users can create reviews" ON brand_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON brand_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON brand_reviews FOR DELETE USING (auth.uid() = user_id);

-- brand_questions
ALTER TABLE brand_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published questions" ON brand_questions FOR SELECT USING (status = 'published');
CREATE POLICY "Users can create questions" ON brand_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON brand_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON brand_questions FOR DELETE USING (auth.uid() = user_id);

-- brand_answers
ALTER TABLE brand_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published answers" ON brand_answers FOR SELECT USING (status = 'published');
CREATE POLICY "Users can create answers" ON brand_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own answers" ON brand_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own answers" ON brand_answers FOR DELETE USING (auth.uid() = user_id);

-- brand_scam_reports
ALTER TABLE brand_scam_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published scam reports" ON brand_scam_reports FOR SELECT USING (status = 'published');
CREATE POLICY "Users can create scam reports" ON brand_scam_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scam reports" ON brand_scam_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scam reports" ON brand_scam_reports FOR DELETE USING (auth.uid() = user_id);

-- ugc_brand_votes
ALTER TABLE ugc_brand_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own votes" ON ugc_brand_votes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view votes" ON ugc_brand_votes FOR SELECT USING (true);

-- ugc_brand_reports
ALTER TABLE ugc_brand_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON ugc_brand_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reports" ON ugc_brand_reports FOR SELECT USING (auth.uid() = user_id);

-- Trigger for auto-hide on 3 reports
CREATE OR REPLACE FUNCTION auto_hide_ugc_content()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  -- Count total reports for this content
  SELECT COUNT(*) INTO report_count
  FROM ugc_brand_reports 
  WHERE content_type = NEW.content_type 
  AND content_id = NEW.content_id;
  
  -- Auto-hide at 3 reports
  IF report_count >= 3 THEN
    IF NEW.content_type = 'review' THEN
      UPDATE brand_reviews 
      SET status = 'hidden', report_count = report_count 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'question' THEN
      UPDATE brand_questions 
      SET status = 'hidden', report_count = report_count 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'answer' THEN
      UPDATE brand_answers 
      SET status = 'hidden', report_count = report_count 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'scam' THEN
      UPDATE brand_scam_reports 
      SET status = 'hidden', report_count = report_count 
      WHERE id = NEW.content_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_hide_ugc_trigger
AFTER INSERT ON ugc_brand_reports
FOR EACH ROW
EXECUTE FUNCTION auto_hide_ugc_content();

-- Update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_type = 'review' THEN
      UPDATE brand_reviews 
      SET helpful_count = helpful_count + NEW.value 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'answer' THEN
      UPDATE brand_answers 
      SET helpful_count = helpful_count + NEW.value 
      WHERE id = NEW.content_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.content_type = 'review' THEN
      UPDATE brand_reviews 
      SET helpful_count = helpful_count - OLD.value + NEW.value 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'answer' THEN
      UPDATE brand_answers 
      SET helpful_count = helpful_count - OLD.value + NEW.value 
      WHERE id = NEW.content_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_type = 'review' THEN
      UPDATE brand_reviews 
      SET helpful_count = helpful_count - OLD.value 
      WHERE id = OLD.content_id;
    ELSIF OLD.content_type = 'answer' THEN
      UPDATE brand_answers 
      SET helpful_count = helpful_count - OLD.value 
      WHERE id = OLD.content_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_helpful_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON ugc_brand_votes
FOR EACH ROW
EXECUTE FUNCTION update_helpful_count();