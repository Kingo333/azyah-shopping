import { Heart, Sparkles, WandSparkles, Users, ShoppingBag, Search, Blocks, LayoutDashboard } from 'lucide-react';
import type { QuickActionKey } from '@/hooks/useQuickActionsSelection';

export interface QuickActionConfig {
  key: QuickActionKey;
  label: string;
  icon: typeof Heart;
  route: string;
  badge?: {
    text: string;
    variant: 'new' | 'ai' | 'secondary';
  };
  tooltip: string;
  feature?: string;
  requiresFeatureFlag?: 'ai_beauty_consultant' | 'ugc_collab' | 'aiTryOn' | 'arTryOn' | 'axessoImport' | 'axessoImportBulk';
  alternativeAction?: QuickActionConfig; // For beauty/feed toggle
}

export const quickActionsConfig: QuickActionConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    route: '/dashboard',
    tooltip: 'View your personalized dashboard with quick stats and recommendations.',
    feature: 'dashboard'
  },
  {
    key: 'shop',
    label: 'Shop',
    icon: Heart,
    route: '/swipe',
    tooltip: 'Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile.',
    feature: 'swipe'
  },
  {
    key: 'ai',
    label: 'AI Studio',
    icon: Sparkles,
    route: '/ai-studio',
    badge: {
      text: 'New',
      variant: 'new'
    },
    tooltip: 'Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.',
    feature: 'ai-studio'
  },
  {
    key: 'beauty',
    label: 'Beauty',
    icon: WandSparkles,
    route: '/beauty-consultant',
    badge: {
      text: 'New',
      variant: 'new'
    },
    tooltip: 'Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations.',
    feature: 'beauty-consultant',
    requiresFeatureFlag: 'ai_beauty_consultant',
    alternativeAction: {
      key: 'feed',
      label: 'Feed',
      icon: Users,
      route: '/fashion-feed',
      tooltip: 'Connect with the fashion community. Share your style and discover what others are wearing.',
      feature: 'fashion-feed'
    }
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    icon: ShoppingBag,
    route: '/wishlist',
    tooltip: 'Save items you love to your wishlist. Keep track of favorites and shop them later when you\'re ready.',
    feature: 'wishlist'
  },
  {
    key: 'explore',
    label: 'Explore',
    icon: Search,
    route: '/explore',
    tooltip: 'Search and discover products from top brands. Use filters to find exactly what you\'re looking for.',
    feature: 'explore'
  },
  {
    key: 'ugc',
    label: 'UGC Collab',
    icon: Users,
    route: '/ugc-collab',
    badge: {
      text: 'New',
      variant: 'secondary'
    },
    tooltip: 'Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content.',
    feature: 'ugc-collab',
    requiresFeatureFlag: 'ugc_collab'
  },
  {
    key: 'toy',
    label: 'Toy AI',
    icon: Blocks,
    route: '/toy-replica',
    badge: {
      text: 'AI',
      variant: 'ai'
    },
    tooltip: 'Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display.',
    feature: 'toy-replica'
  }
];