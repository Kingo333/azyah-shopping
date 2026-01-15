import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddCreatorProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const AddCreatorProductModal: React.FC<AddCreatorProductModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
          Product curation coming soon!
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreatorProductModal;
