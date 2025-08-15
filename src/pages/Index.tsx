
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Shirt, TrendingUp, Sparkles, Users } from 'lucide-react';
import { AiTryOnUploader } from '@/components/AiTryOnUploader';
import AffiliateHub from '@/components/AffiliateHub';
import { PersonalizationEngine } from '@/components/PersonalizationEngine';
import { ToyReplicaQuickAction } from '@/components/ToyReplicaQuickAction';
import { useAuth } from '@/contexts/AuthContext';
import { useCartManager } from '@/hooks/useCartManager';
import { useWishlist } from '@/hooks/useWishlist';
import { useClosets } from '@/hooks/useClosets';
import { Product } from '@/types';

export default function Index() {
  const { user } = useAuth();
  const { itemCount: cartItemCount } = useCartManager();
  const { data: wishlistData } = useWishlist();
  const { data: closetsData } = useClosets();
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const wishlistCount = wishlistData?.reduce((acc, wishlist) => acc + (wishlist.items?.length || 0), 0) || 0;
  const closetCount = closetsData?.reduce((acc, closet) => acc + (closet.items?.length || 0), 0) || 0;

  const quickStats = [
    {
      title: 'Wishlist Items',
      value: wishlistCount,
      icon: Heart,
      color: 'text-red-500',
    },
    {
      title: 'Cart Items',
      value: cartItemCount,
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Closet Items',
      value: closetCount,
      icon: Shirt,
      color: 'text-green-500',
    },
  ];

  const handleRecommendationsUpdate = (products: Product[] | ((prev: Product[]) => Product[])) => {
    if (typeof products === 'function') {
      setRecommendations(products);
    } else {
      setRecommendations(products);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.email?.split('@')[0] || 'Fashion Explorer'}! 
              <Sparkles className="inline-block ml-2 h-6 w-6 text-primary" />
            </h1>
            <p className="text-muted-foreground">
              Discover your perfect style with AI-powered fashion curation
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending Now
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToyReplicaQuickAction />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Try-On
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AiTryOnUploader />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personalization Engine */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personal Style Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PersonalizationEngine onRecommendationsUpdate={handleRecommendationsUpdate} />
          </CardContent>
        </Card>

        {/* Affiliate Hub */}
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Hub</CardTitle>
          </CardHeader>
          <CardContent>
            <AffiliateHub />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
