import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CreateStyleLinkPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateStyleLinkPostModal: React.FC<CreateStyleLinkPostModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
          Post creation with product tagging coming soon!
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStyleLinkPostModal;
