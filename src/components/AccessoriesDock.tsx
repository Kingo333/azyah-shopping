import React from 'react';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { DockCard } from './DockCard';

interface AccessoriesDockProps {
  selectedAccessory: WardrobeItem | null;
  selectedBag: WardrobeItem | null;
  onAccessoryTap: () => void;
  onBagTap: () => void;
  onRemoveAccessory: () => void;
  onRemoveBag: () => void;
}

export const AccessoriesDock: React.FC<AccessoriesDockProps> = ({
  selectedAccessory,
  selectedBag,
  onAccessoryTap,
  onBagTap,
  onRemoveAccessory,
  onRemoveBag,
}) => {
  const hasItems = selectedAccessory || selectedBag;

  if (!hasItems) return null;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-3">
      {selectedBag && (
        <DockCard
          item={selectedBag}
          onTap={onBagTap}
          onRemove={onRemoveBag}
        />
      )}
      {selectedAccessory && (
        <DockCard
          item={selectedAccessory}
          onTap={onAccessoryTap}
          onRemove={onRemoveAccessory}
        />
      )}
    </div>
  );
};
