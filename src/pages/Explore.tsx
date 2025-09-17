import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShopperNavigation from '@/components/ShopperNavigation';
import MinimizedLeaderboard from '@/components/MinimizedLeaderboard';
import TrendingStyles from '@/components/TrendingStyles';
import TopInfluencers from '@/components/TopInfluencers';
import FeaturedBrands from '@/components/FeaturedBrands';
import ExploreSearch from '@/components/ExploreSearch';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Trophy, Search, Globe, MapPin, Star, Users, Sparkles, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/ui/back-button';
const Explore: React.FC = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  const [activeSection, setActiveSection] = useState<'overview' | 'search'>('overview');
  const [activeFilter, setActiveFilter] = useState<'trending' | 'influencers' | 'brands'>('brands');
  return <div className="min-h-screen dashboard-bg">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BackButton fallbackPath="/dashboard" />
          <h1 className="text-3xl font-cormorant font-bold">Explore</h1>
        </div>

        {/* Main Navigation */}
        <Tabs value={activeSection} onValueChange={value => setActiveSection(value as any)} className="mb-8">
          <TabsList className="glass-panel">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Filter Buttons */}
            <GlassPanel variant="premium" className="p-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <Button variant={activeFilter === 'trending' ? 'premium' : 'outline'} onClick={() => setActiveFilter('trending')} className="flex items-center gap-2 hover:scale-105 transition-transform">
                  <TrendingUp className="h-4 w-4" />
                  Trending Styles
                </Button>
                <Button variant={activeFilter === 'influencers' ? 'premium' : 'outline'} onClick={() => setActiveFilter('influencers')} className="flex items-center gap-2 hover:scale-105 transition-transform">
                  <Users className="h-4 w-4" />
                  Top Influencers
                </Button>
                <Button variant={activeFilter === 'brands' ? 'premium' : 'outline'} onClick={() => setActiveFilter('brands')} className="flex items-center gap-2 hover:scale-105 transition-transform">
                  <Star className="h-4 w-4" />
                  Featured Brands
                </Button>
              </div>
            </GlassPanel>

            {/* Content based on active filter */}
            {activeFilter === 'trending' && <GlassPanel variant="premium" className="p-8">
                <h2 className="text-2xl font-cormorant font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                  Trending Styles
                </h2>
                <TrendingStyles limit={12} showMore={true} />
              </GlassPanel>}

            {activeFilter === 'influencers' && <GlassPanel variant="premium" className="p-8">
                <h2 className="text-2xl font-cormorant font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-green-500/10 to-green-600/10">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                  Top Influencers
                </h2>
                <TopInfluencers limit={12} showMore={false} />
              </GlassPanel>}

            {activeFilter === 'brands' && <GlassPanel variant="premium" className="p-8">
                <h2 className="text-2xl font-cormorant font-bold mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-600/10">
                    <Star className="h-6 w-6 text-purple-500" />
                  </div>
                  Featured Brands
                </h2>
                <FeaturedBrands limit={12} showMore={false} />
              </GlassPanel>}
          </TabsContent>

          <TabsContent value="search">
            <GlassPanel variant="premium" className="p-8">
              <ExploreSearch />
            </GlassPanel>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Explore;