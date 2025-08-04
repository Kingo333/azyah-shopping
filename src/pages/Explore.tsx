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
            {/* Featured Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/trending-styles')}
              >
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                  <h3 className="font-semibold mb-2">Trending Styles</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover what's popular in fashion right now
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/top-influencers')}
              >
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-3 text-green-500" />
                  <h3 className="font-semibold mb-2">Top Influencers</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow the most stylish users in the community
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/featured-brands')}
              >
                <CardContent className="p-6 text-center">
                  <Star className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                  <h3 className="font-semibold mb-2">Featured Brands</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore collections from trending brands
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trending Styles Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Trending Styles
              </h2>
              <TrendingStyles limit={6} />
            </section>

            {/* Top Influencers Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Top Influencers
              </h2>
              <TopInfluencers limit={6} />
            </section>

            {/* Featured Brands Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Featured Brands
              </h2>
              <FeaturedBrands limit={6} />
            </section>

            {/* Leaderboards */}
            <section>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Fashion Leaderboards
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={activeLeaderboard === 'global' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLeaderboard('global')}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Global
                      </Button>
                      <Button
                        variant={activeLeaderboard === 'country' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveLeaderboard('country')}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Country
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Leaderboard 
                    type={activeLeaderboard} 
                    country={user?.user_metadata?.country}
                  />
                </CardContent>
              </Card>
            </section>
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