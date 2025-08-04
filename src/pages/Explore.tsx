import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import ShopperNavigation from '@/components/ShopperNavigation';
import Leaderboard from '@/components/Leaderboard';
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

const Explore: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        <ShopperNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Explore</h1>
          <Sparkles className="h-6 w-6 text-primary" />
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trends, users, styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Featured Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">Trending Styles</h3>
              <p className="text-sm text-muted-foreground">
                Discover what's popular in fashion right now
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold mb-2">Top Influencers</h3>
              <p className="text-sm text-muted-foreground">
                Follow the most stylish users in the community
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <h3 className="font-semibold mb-2">Featured Brands</h3>
              <p className="text-sm text-muted-foreground">
                Explore collections from trending brands
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboards */}
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
      </div>
    </div>
  );
};

export default Explore;