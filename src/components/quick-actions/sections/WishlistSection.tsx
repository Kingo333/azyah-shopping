import React from 'react';
import { WishlistManager } from '@/components/WishlistManager';

const WishlistSection: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Wishlist</h2>
        <p className="text-muted-foreground">
          Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready.
        </p>
      </div>
      <WishlistManager />
    </div>
  );
};

export default WishlistSection;