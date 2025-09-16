import { Heart, Sparkles, WandSparkles, Users, ShoppingBag, Search, Blocks, LayoutDashboard } from "lucide-react";
import type { QAKey } from "@/hooks/useQuickActionsSelection";

export interface QuickAction {
  key: QAKey;
  label: string;
  to: string;
  icon: any;
  badge?: string;
  smallBadge?: string;
  requiresFeature?: string;
  showWhenBeautyDisabled?: boolean;
  tooltipContent?: string;
  tooltipFeature?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "shop",
    label: "Shop",
    to: "/swipe",
    icon: Heart,
    tooltipContent: "Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile.",
    tooltipFeature: "swipe"
  },
  {
    key: "ai",
    label: "AI Studio",
    to: "/ai-studio",
    icon: Sparkles,
    badge: "New",
    tooltipContent: "Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.",
    tooltipFeature: "ai-studio"
  },
  {
    key: "beauty",
    label: "Beauty",
    to: "/beauty-consultant",
    icon: WandSparkles,
    badge: "New",
    requiresFeature: "ai_beauty_consultant",
    tooltipContent: "Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations.",
    tooltipFeature: "beauty-consultant"
  },
  {
    key: "feed",
    label: "Feed",
    to: "/fashion-feed",
    icon: Users,
    showWhenBeautyDisabled: true,
    tooltipContent: "Connect with the fashion community. Share your style and discover what others are wearing.",
    tooltipFeature: "fashion-feed"
  },
  {
    key: "wishlist",
    label: "Wishlist",
    to: "/wishlist",
    icon: ShoppingBag,
    tooltipContent: "Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready.",
    tooltipFeature: "wishlist"
  },
  {
    key: "explore",
    label: "Explore",
    to: "/explore",
    icon: Search,
    tooltipContent: "Search and discover products from top brands. Use filters to find exactly what you're looking for.",
    tooltipFeature: "explore"
  },
  {
    key: "ugc",
    label: "UGC Collab",
    to: "/ugc-collab",
    icon: Users,
    tooltipContent: "Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content.",
    tooltipFeature: "ugc-collab"
  },
  {
    key: "toy",
    label: "Toy AI",
    to: "/toy-replica",
    icon: Blocks,
    smallBadge: "AI",
    tooltipContent: "Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display.",
    tooltipFeature: "toy-replica"
  },
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    tooltipContent: "Access your dashboard with analytics, preferences, and account management tools.",
    tooltipFeature: "dashboard"
  }
];