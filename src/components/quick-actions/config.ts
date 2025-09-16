import { Heart, Sparkles, WandSparkles, Users, ShoppingBag, Search, Blocks } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { FeatureFlag } from "@/lib/features";

export interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  route?: string;
  handler?: () => void;
  badge?: string;
  badgeVariant?: "new" | "ai";
  tooltip: string;
  tutorialFeature: string;
  className?: string;
  featureFlag?: FeatureFlag;
  alternativeAction?: QuickAction;
}

// This will be populated with actual handlers and navigation in the component
export const createQuickActionsConfig = (
  navigate: (path: string) => void,
  setAiStudioModalOpen: (open: boolean) => void,
  handleToyReplicaClick: () => void,
  isEnabled: (flag: FeatureFlag) => boolean
): QuickAction[] => [
  {
    key: "shop",
    label: "Shop",
    icon: Heart,
    route: "/swipe",
    handler: () => navigate('/swipe'),
    tooltip: "Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile.",
    tutorialFeature: "swipe",
    className: "bg-primary text-primary-foreground hover:bg-primary/90"
  },
  {
    key: "aiStudio",
    label: "AI Studio",
    icon: Sparkles,
    handler: () => setAiStudioModalOpen(true),
    badge: "New",
    badgeVariant: "new",
    tooltip: "Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.",
    tutorialFeature: "ai-studio",
    className: "bg-background border border-border hover:bg-accent"
  },
  {
    key: "beauty",
    label: "Beauty",
    icon: WandSparkles,
    route: "/beauty-consultant",
    handler: () => navigate('/beauty-consultant'),
    badge: "New",
    badgeVariant: "new",
    tooltip: "Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations.",
    tutorialFeature: "beauty-consultant",
    className: "bg-background border border-border hover:bg-accent",
    featureFlag: "ai_beauty_consultant",
    alternativeAction: {
      key: "feed",
      label: "Feed",
      icon: Users,
      route: "/fashion-feed",
      handler: () => navigate('/fashion-feed'),
      tooltip: "Connect with the fashion community. Share your style and discover what others are wearing.",
      tutorialFeature: "fashion-feed",
      className: "bg-background border border-border hover:bg-accent"
    }
  },
  {
    key: "wishlist",
    label: "Wishlist",
    icon: ShoppingBag,
    route: "/wishlist",
    handler: () => navigate('/wishlist'),
    tooltip: "Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready.",
    tutorialFeature: "wishlist",
    className: "bg-background border border-border hover:bg-accent"
  },
  {
    key: "explore",
    label: "Explore",
    icon: Search,
    route: "/explore",
    handler: () => navigate('/explore'),
    tooltip: "Search and discover products from top brands. Use filters to find exactly what you're looking for.",
    tutorialFeature: "explore",
    className: "bg-background border border-border hover:bg-accent"
  },
  {
    key: "toyAi",
    label: "Toy AI",
    icon: Blocks,
    handler: handleToyReplicaClick,
    badge: "AI",
    badgeVariant: "ai",
    tooltip: "Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display.",
    tutorialFeature: "toy-replica",
    className: "bg-background border border-border hover:bg-accent"
  }
];