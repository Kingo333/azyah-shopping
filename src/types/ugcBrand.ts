export interface UGCBrand {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  instagram_handle?: string;
  country?: string;
  category?: 'fashion' | 'beauty';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UGCBrandStats {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  instagram_handle?: string;
  category?: 'fashion' | 'beauty';
  country?: string;
  is_verified: boolean;
  avg_rating: number;
  reviews_count: number;
  questions_count: number;
  scams_count: number;
  last_review_at?: string;
}

export interface BrandReview {
  id: string;
  brand_id: string;
  user_id: string;
  rating: number;
  payment_rating?: number;
  vibe_rating?: number;
  title: string;
  body?: string;
  work_type: 'UGC' | 'Affiliate' | 'Gifted' | 'Paid' | 'Event';
  deliverables?: string;
  payout?: number;
  currency: string;
  time_to_pay_days?: number;
  would_work_again?: boolean;
  evidence_urls: string[];
  status: string;
  report_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    avatar_url?: string;
  };
}

export interface BrandQuestion {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  body?: string;
  status: string;
  report_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    avatar_url?: string;
  };
  answers_count?: number;
}

export interface BrandAnswer {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  is_accepted: boolean;
  report_count: number;
  status: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    avatar_url?: string;
  };
}

export interface BrandScamReport {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  scam_type: 'nonpayment' | 'counterfeit' | 'phishing' | 'ghosting' | 'other';
  description: string;
  evidence_urls: string[];
  status: string;
  report_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    avatar_url?: string;
  };
}

export type ContentType = 'review' | 'question' | 'answer' | 'scam';
