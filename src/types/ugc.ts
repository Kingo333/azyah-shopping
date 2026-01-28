export type CollabCompType = 'PRODUCT_EXCHANGE' | 'PRODUCT_AND_PAID';
export type CollabStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'WAITLISTED';
export type DeliverableStatus = 'submitted' | 'under_review' | 'approved' | 'revision_requested' | 'rejected';
export type PayoutStatus = 'pending_approval' | 'owed' | 'hold' | 'confirmed' | 'paid' | 'unpaid_issue';

export interface Collaboration {
  id: string;
  owner_org_id: string;
  title: string;
  brief?: string;
  platforms: string[];
  deliverables: Record<string, any>;
  tone?: string;
  talking_points?: string[];
  comp_type: CollabCompType;
  currency?: string;
  amount?: number;
  visibility: string;
  max_creators?: number;
  application_deadline?: string;
  status: CollabStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // New campaign fields
  total_budget?: number;
  slots_total?: number;
  posts_per_creator?: number;
  acceptance_mode?: string;
  payout_hold_days?: number;
  bonus_pool?: number;
  // Computed fields (from view)
  slots_filled?: number;
  slots_remaining?: number;
  waitlist_count?: number;
  base_payout_per_slot?: number;
  // Relations
  brands?: {
    name: string;
    logo_url?: string;
  };
  retailers?: {
    name: string;
    logo_url?: string;
  };
  applications_count?: number;
}

export interface CollabApplication {
  id: string;
  collab_id: string;
  shopper_id: string;
  social_links: Record<string, string>;
  note?: string;
  status: ApplicationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  // Relations
  users?: {
    name: string;
    avatar_url?: string;
  };
  collaborations?: {
    title: string;
  };
}

export interface CreatorDeliverable {
  id: string;
  collab_id: string;
  application_id: string;
  creator_id: string;
  platform: string;
  post_url: string;
  screenshot_path: string;
  status: DeliverableStatus;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatorPayout {
  id: string;
  collab_id: string;
  deliverable_id: string;
  creator_id: string;
  amount: number;
  currency: string;
  payout_type: 'base' | 'bonus';
  status: PayoutStatus;
  marked_unpaid_reason?: string;
  approved_at?: string;
  hold_until?: string;
  paid_at?: string;
  marked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  platform: string;
  type: string;
  count: number;
}

export const PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'snapchat', label: 'Snapchat', icon: '👻' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '📺' }
];

export const DELIVERABLE_TYPES = {
  facebook: ['Post', 'Story', 'Reel'],
  instagram: ['Post', 'Story', 'Reel', 'IGTV'],
  snapchat: ['Snap', 'Story', 'Spotlight'],
  tiktok: ['Video'],
  youtube: ['Short', 'Video']
};

// URL validation helpers
export const PLATFORM_DOMAINS: Record<string, string[]> = {
  tiktok: ['tiktok.com', 'vm.tiktok.com'],
  instagram: ['instagram.com', 'instagr.am'],
  snapchat: ['snapchat.com', 'story.snapchat.com'],
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com', 'fb.watch']
};

export const validatePostUrl = (platform: string, url: string): boolean => {
  const domains = PLATFORM_DOMAINS[platform];
  if (!domains) return false;
  try {
    const parsedUrl = new URL(url);
    return domains.some(d => parsedUrl.hostname.includes(d));
  } catch {
    return false;
  }
};