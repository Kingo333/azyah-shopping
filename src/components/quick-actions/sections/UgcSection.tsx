import React from 'react';
import { CollabList } from '@/components/ugc/CollabList';
import { UGCCollabModal } from '@/components/ugc/UGCCollabModal';

interface UgcSectionProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const UgcSection: React.FC<UgcSectionProps> = ({ modalOpen, setModalOpen }) => {
  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">UGC Collaborations</h2>
        <p className="text-muted-foreground">
          Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content.
        </p>
      </div>
      <CollabList />
      <UGCCollabModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default UgcSection;