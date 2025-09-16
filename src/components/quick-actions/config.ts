import { Heart, Sparkles, Wand2, ShoppingBag, Search, Users, Blocks, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeatureFlag } from "@/lib/features";

export interface QuickAction {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  smallBadge?: string;
  requiresFeature?: FeatureFlag;
  excludesFeature?: FeatureFlag;
  onClick?: () => void;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "shop",
    label: "Shop",
    to: "/swipe",
    icon: Heart,
  },
  {
    key: "ai",
    label: "AI Studio",
    to: "/ai-studio",
    icon: Sparkles,
    badge: "New",
  },
  {
    key: "beauty",
    label: "Beauty",
    to: "/beauty-consultant",
    icon: Wand2,
    badge: "New",
    requiresFeature: "ai_beauty_consultant",
  },
  {
    key: "feed",
    label: "Feed",
    to: "/fashion-feed",
    icon: Users,
    excludesFeature: "ai_beauty_consultant",
  },
  {
    key: "wishlist",
    label: "Wishlist",
    to: "/wishlist",
    icon: ShoppingBag,
  },
  {
    key: "explore",
    label: "Explore",
    to: "/explore",
    icon: Search,
  },
  {
    key: "ugc",
    label: "UGC Collab",
    to: "/ugc-collab",
    icon: Users,
  },
  {
    key: "toy",
    label: "Toy AI",
    to: "/toy-replica",
    icon: Blocks,
    smallBadge: "AI",
  },
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
] as const;

export type QaKey = typeof QUICK_ACTIONS[number]["key"];