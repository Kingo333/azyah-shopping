import React from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';
import { quickActionsConfig } from './config';
import { useQuickActionsSelection, type QuickActionKey } from '@/hooks/useQuickActionsSelection';
import { cn } from '@/lib/utils';

interface QuickActionsCarouselProps {
  onAiStudioOpen: () => void;
  onToyReplicaClick: () => void;
}

export const QuickActionsCarousel: React.FC<QuickActionsCarouselProps> = ({
  onAiStudioOpen,
  onToyReplicaClick
}) => {
  const { isEnabled } = useFeatureFlags();
  const { selectedSection, updateSection } = useQuickActionsSelection();

  const handleActionClick = (
    e: React.MouseEvent, 
    actionKey: QuickActionKey,
    specialHandler?: () => void
  ) => {
    // Allow normal navigation for meta/ctrl+click or middle click
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      return;
    }

    e.preventDefault();
    
    // Handle special actions
    if (specialHandler) {
      specialHandler();
      return;
    }
    
    // Update section for content switching
    updateSection(actionKey);
    
    // Smooth scroll to panel
    setTimeout(() => {
      const panel = document.getElementById('quick-actions-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <section className="px-4 pt-3">
      <div 
        className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide"
        role="tablist"
        aria-label="Quick Actions Navigation"
      >
        {quickActionsConfig.map((action) => {
          // Handle feature flag logic
          const shouldShow = !action.requiresFeatureFlag || isEnabled(action.requiresFeatureFlag);
          const currentAction = shouldShow ? action : action.alternativeAction;
          
          if (!currentAction) return null;

          const Icon = currentAction.icon;
          const isSelected = selectedSection === currentAction.key;
          
          // Special handling for UGC Collab button
          if (currentAction.key === 'ugc') {
            return (
              <TutorialTooltip 
                key={currentAction.key}
                content={currentAction.tooltip} 
                feature={currentAction.feature}
              >
                <UGCCollabButton className="flex items-center gap-2 px-4 py-2 h-10 rounded-xl bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit" />
              </TutorialTooltip>
            );
          }

          return (
            <TutorialTooltip 
              key={currentAction.key}
              content={currentAction.tooltip} 
              feature={currentAction.feature}
            >
              <Link
                to={currentAction.route}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`panel-${currentAction.key}`}
                onClick={(e) => handleActionClick(
                  e, 
                  currentAction.key,
                  currentAction.key === 'ai' ? onAiStudioOpen :
                  currentAction.key === 'toy' ? onToyReplicaClick : undefined
                )}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 h-10 rounded-xl transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit",
                  currentAction.key === 'shop' 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : isSelected
                    ? "bg-accent text-accent-foreground border border-border"
                    : "bg-background border border-border hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {currentAction.label}
                
                {/* Badge */}
                {currentAction.badge && (
                  <span className={cn(
                    "absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full leading-none",
                    currentAction.badge.variant === 'new' && "bg-muted text-muted-foreground",
                    currentAction.badge.variant === 'ai' && "bg-primary text-primary-foreground",
                    currentAction.badge.variant === 'secondary' && "bg-secondary text-secondary-foreground"
                  )}>
                    {currentAction.badge.text}
                  </span>
                )}
              </Link>
            </TutorialTooltip>
          );
        })}
      </div>
    </section>
  );
};