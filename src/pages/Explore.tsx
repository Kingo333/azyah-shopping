import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShopperNavigation from '@/components/ShopperNavigation';
import Leaderboard from '@/components/Leaderboard';
import TrendingStyles from '@/components/TrendingStyles';
import TopInfluencers from '@/components/TopInfluencers';
import FeaturedBrands from '@/components/FeaturedBrands';
import ExploreSearch from '@/components/ExploreSearch';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  Trophy, 
  Search, 
  Globe, 
  MapPin, 
  Star,
  Users,
  Sparkles,
  Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Explore: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  const [activeSection, setActiveSection] = useState<'overview' | 'search'>('overview');
  const [activeFilter, setActiveFilter] = useState<'trending' | 'influencers' | 'brands'>('brands');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Explore</h1>
          <Sparkles className="h-6 w-6 text-primary" />
        </div>

        {/* Main Navigation */}
        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant={activeFilter === 'trending' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('trending')}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Trending Styles
              </Button>
              <Button
                variant={activeFilter === 'influencers' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('influencers')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Top Influencers
              </Button>
              <Button
                variant={activeFilter === 'brands' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('brands')}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Featured Brands
              </Button>
            </div>

            {/* Content based on active filter */}
            {activeFilter === 'trending' && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Trending Styles
                </h2>
                <TrendingStyles limit={12} showMore={false} />
              </section>
            )}

            {activeFilter === 'influencers' && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Top Influencers
                </h2>
                <TopInfluencers limit={12} showMore={false} />
              </section>
            )}

            {activeFilter === 'brands' && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-500" />
                  Featured Brands
                </h2>
                <FeaturedBrands limit={12} showMore={false} />
              </section>
            )}
          </TabsContent>

          <TabsContent value="search">
            <ExploreSearch />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;