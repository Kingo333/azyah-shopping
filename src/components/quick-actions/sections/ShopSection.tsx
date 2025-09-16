import React from 'react';
import SwipeDeck from '@/components/SwipeDeck';
import { useAuth } from '@/contexts/AuthContext';

const ShopSection: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="min-h-[600px] py-4">
        <SwipeDeck 
          filter="all"
          priceRange={{ min: 0, max: 1000000 }}
        />
      </div>
    </div>
  );
};

export default ShopSection;