import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';
import { createQuickActionsConfig } from './config';

interface QuickActionsGridProps {
  setAiStudioModalOpen: (open: boolean) => void;
  handleToyReplicaClick: () => void;
}

export default function QuickActionsGrid({ 
  setAiStudioModalOpen, 
  handleToyReplicaClick 
}: QuickActionsGridProps) {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  
  const quickActions = createQuickActionsConfig(
    navigate,
    setAiStudioModalOpen,
    handleToyReplicaClick,
    isEnabled
  );

  const renderAction = (action: any) => {
    const { key, label, icon: Icon, handler, badge, badgeVariant, tooltip, tutorialFeature, className } = action;
    
    return (
      <TutorialTooltip key={key} content={tooltip} feature={tutorialFeature}>
        <button
          onClick={handler}
          className={`relative flex items-center gap-3 p-4 rounded-xl transition-colors font-medium text-sm min-h-[60px] ${className}`}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          {badge && (
            <span className={`absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full leading-none ${
              badgeVariant === 'ai' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {badge}
            </span>
          )}
        </button>
      </TutorialTooltip>
    );
  };

  // Filter actions based on feature flags
  const visibleActions = quickActions.filter(action => {
    if (action.featureFlag) {
      return isEnabled(action.featureFlag) ? action : action.alternativeAction;
    }
    return action;
  }).map(action => {
    if (action.featureFlag && !isEnabled(action.featureFlag) && action.alternativeAction) {
      return action.alternativeAction;
    }
    return action;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {visibleActions.map(renderAction)}
      
      {/* UGC Collab Button - Special case */}
      <TutorialTooltip 
        content="Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content." 
        feature="ugc-collab"
      >
        <UGCCollabButton className="relative flex items-center gap-3 p-4 rounded-xl bg-background border border-border hover:bg-accent transition-colors font-medium text-sm min-h-[60px]" />
      </TutorialTooltip>
    </div>
  );
}