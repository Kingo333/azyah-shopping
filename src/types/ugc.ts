export type CollabCompType = 'PRODUCT_EXCHANGE' | 'PRODUCT_AND_PAID';
export type CollabStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

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
  { value: 'tiktok', label: 'TikTok', icon: '🎵' }
];

export const DELIVERABLE_TYPES = {
  facebook: ['Post', 'Story', 'Reel'],
  instagram: ['Post', 'Story', 'Reel', 'IGTV'],
  snapchat: ['Snap', 'Story', 'Spotlight'],
  tiktok: ['Video']
};