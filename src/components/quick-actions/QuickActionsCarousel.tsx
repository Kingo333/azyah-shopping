import React from 'react';
import { Link } from 'react-router-dom';
import { useQuickActionsSelection } from '@/hooks/useQuickActionsSelection';
import { QUICK_ACTIONS } from './config';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';

interface QuickActionsCarouselProps {
  onAiStudioClick: () => void;
  onToyReplicaClick: () => void;
}

export function QuickActionsCarousel({ onAiStudioClick, onToyReplicaClick }: QuickActionsCarouselProps) {
  const { selected, setSelected } = useQuickActionsSelection();
  const { isEnabled } = useFeatureFlags();

  const handleClick = (e: React.MouseEvent, key: string, action?: () => void) => {
    // Allow normal navigation for meta/ctrl/middle clicks
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      
      // Execute special action if provided (AI Studio, Toy AI)
      if (action) {
        action();
      } else {
        setSelected(key as any);
      }
    }
  };

  const renderActionButton = (action: typeof QUICK_ACTIONS[0]) => {
    const { key, label, to, icon: Icon, badge, smallBadge, requiresFeature, showWhenBeautyDisabled, tooltipContent, tooltipFeature } = action;
    
    // Handle feature flag logic
    if (requiresFeature && !isEnabled(requiresFeature as any)) {
      return null;
    }
    
    if (showWhenBeautyDisabled && isEnabled('ai_beauty_consultant')) {
      return null;
    }

    const isActive = selected === key;
    
    const buttonClasses = isActive 
      ? "flex items-center gap-2 px-4 py-2 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
      : "flex items-center gap-2 px-4 py-2 h-10 rounded-xl bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit";

    // Special handling for UGC Collab which has its own component
    if (key === 'ugc') {
      return (
        <TutorialTooltip key={key} content={tooltipContent} feature={tooltipFeature}>
          <Link
            to={to}
            onClick={(e) => handleClick(e, key)}
            className={buttonClasses}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </TutorialTooltip>
      );
    }

    // Special handling for AI Studio and Toy AI which trigger modals
    const specialAction = key === 'ai' ? onAiStudioClick : key === 'toy' ? onToyReplicaClick : undefined;

    return (
      <TutorialTooltip key={key} content={tooltipContent} feature={tooltipFeature}>
        <Link
          to={to}
          onClick={(e) => handleClick(e, key, specialAction)}
          className={`relative ${buttonClasses}`}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon className="h-4 w-4" />
          {label}
          {badge && (
            <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
          {smallBadge && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full leading-none">
              {smallBadge}
            </span>
          )}
        </Link>
      </TutorialTooltip>
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide">
        {QUICK_ACTIONS.map(renderActionButton)}
      </div>
    </section>
  );
}