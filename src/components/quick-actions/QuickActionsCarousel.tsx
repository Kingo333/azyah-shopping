import { Link, useNavigate } from "react-router-dom";
import { QUICK_ACTIONS } from "./config";
import { useQuickActionsSelection } from "@/hooks/useQuickActionsSelection";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { TutorialTooltip } from "@/components/ui/tutorial-tooltip";
import { UGCCollabButton } from "@/components/ugc/UGCCollabButton";

interface QuickActionsCarouselProps {
  onAiStudioOpen?: () => void;
  onToyReplicaOpen?: () => void;
}

export default function QuickActionsCarousel({ 
  onAiStudioOpen, 
  onToyReplicaOpen 
}: QuickActionsCarouselProps) {
  const { selected, setSelected } = useQuickActionsSelection();
  const { isEnabled } = useFeatureFlags();
  const navigate = useNavigate();

  const getTooltipContent = (key: string) => {
    const tooltips = {
      shop: "Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile.",
      ai: "Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.",
      beauty: "Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations.",
      feed: "Connect with the fashion community. Share your style and discover what others are wearing.",
      wishlist: "Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready.",
      explore: "Search and discover products from top brands. Use filters to find exactly what you're looking for.",
      ugc: "Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content.",
      toy: "Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display.",
      dashboard: "Access your personal dashboard with analytics, settings, and account management tools.",
    };
    return tooltips[key as keyof typeof tooltips] || "";
  };

  const handleClick = (action: typeof QUICK_ACTIONS[number], e: React.MouseEvent) => {
    // Allow normal navigation for meta/ctrl clicks
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();

      // Handle special modal cases
      if (action.key === "ai" && onAiStudioOpen) {
        onAiStudioOpen();
        setSelected(action.key);
        return;
      }

      if (action.key === "toy" && onToyReplicaOpen) {
        onToyReplicaOpen();
        setSelected(action.key);
        return;
      }

      // Handle UGC collab special case
      if (action.key === "ugc") {
        setSelected(action.key);
        return;
      }

      // For normal navigation actions, update selection
      setSelected(action.key);
    }
  };

  const filteredActions = QUICK_ACTIONS.filter(action => {
    if (action.requiresFeature && !isEnabled(action.requiresFeature)) {
      return false;
    }
    if (action.excludesFeature && isEnabled(action.excludesFeature)) {
      return false;
    }
    return true;
  });

  return (
    <section className="px-4 pt-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide">
        {filteredActions.map((action) => {
          const isActive = selected === action.key;
          const Icon = action.icon;

          // Special case for UGC Collab button
          if (action.key === "ugc") {
            return (
              <TutorialTooltip key={action.key} content={getTooltipContent(action.key)} feature="ugc-collab">
                <div onClick={() => setSelected(action.key)}>
                  <UGCCollabButton 
                    className={`flex items-center gap-2 px-4 py-2 h-10 rounded-xl transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit ${
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-background border border-border hover:bg-accent"
                    }`}
                  />
                </div>
              </TutorialTooltip>
            );
          }

          return (
            <TutorialTooltip key={action.key} content={getTooltipContent(action.key)} feature={action.key}>
              <Link
                to={action.to}
                onClick={(e) => handleClick(action, e)}
                role="tab"
                aria-selected={isActive}
                aria-controls="qa-panel"
                className={`relative flex items-center gap-2 px-4 py-2 h-10 rounded-xl transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background border border-border hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {action.label}
                {action.badge && (
                  <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full leading-none">
                    {action.badge}
                  </span>
                )}
                {action.smallBadge && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full leading-none">
                    {action.smallBadge}
                  </span>
                )}
              </Link>
            </TutorialTooltip>
          );
        })}
      </div>
    </section>
  );
}