import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
      <Button 
        onClick={() => setIsModalOpen(true)} 
        variant="outline" 
        className={`h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300 relative ${className}`}
      >
        <div className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
          New
        </div>
        <Users className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-xs sm:text-sm">UGC Collab</span>
      </Button>

      <UGCCollabModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
};