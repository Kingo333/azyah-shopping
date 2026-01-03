import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ShoppingBag } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import FavoritesLikesTab from '@/components/FavoritesLikesTab';
import FavoritesWishlistTab from '@/components/FavoritesWishlistTab';

const Favorites: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'likes';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-playfair">Favorites</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="likes" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Likes
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="likes">
            <FavoritesLikesTab />
          </TabsContent>

          <TabsContent value="wishlist">
            <FavoritesWishlistTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Favorites;
