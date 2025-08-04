import React from 'react';
import ShopperNavigation from '@/components/ShopperNavigation';

const Explore: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Explore</h1>
        </div>
        
        <div className="text-center py-12">
          <p className="text-muted-foreground">Explore page coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default Explore;