import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CollabList } from './CollabList';

interface UGCCollabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UGCCollabModal: React.FC<UGCCollabModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-cormorant">UGC Collaborations</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <CollabList />
        </div>
      </DialogContent>
    </Dialog>
  );
};