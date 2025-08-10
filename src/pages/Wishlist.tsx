import React from 'react';
import { WishlistManager } from '@/components/WishlistManager';
import ShopperNavigation from '@/components/ShopperNavigation';

const Wishlist: React.FC = () => {
  return (
    <div className="min-h-screen dashboard-bg">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold font-playfair">My Wishlist</h1>
        </div>
        <WishlistManager />
      </div>
    </div>
  );
};

export default Wishlist;