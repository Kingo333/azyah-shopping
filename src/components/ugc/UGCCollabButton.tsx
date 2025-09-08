import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { UGCCollabModal } from './UGCCollabModal';

interface UGCCollabButtonProps {
  className?: string;
}

export const UGCCollabButton: React.FC<UGCCollabButtonProps> = ({ className }) => {
  const { isEnabled } = useFeatureFlags();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isEnabled('ugc_collab')) {
    return null;
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)} 
        className={className || "flex items-center gap-2 px-4 py-2 h-10 rounded-xl bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit relative"}
      >
        <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4">
          New
        </Badge>
        <Users className="h-4 w-4" />
        <span>UGC Collab</span>
      </button>

      <UGCCollabModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
};