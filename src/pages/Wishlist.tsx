import React from 'react';
import { WishlistManager } from '@/components/WishlistManager';
import { BackButton } from '@/components/ui/back-button';

const Wishlist: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold">My Wishlist</h1>
        </div>
        <WishlistManager />
      </div>
    </div>
  );
};

export default Wishlist;