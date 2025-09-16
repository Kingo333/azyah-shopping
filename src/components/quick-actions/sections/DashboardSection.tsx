import React from 'react';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import AffiliateHub from '@/components/AffiliateHub';
import Leaderboard from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Package, Eye, Heart, ShoppingBag, Wallet, Globe, MapPin } from 'lucide-react';

interface DashboardSectionProps {
  userProfile: any;
  dashboardStats: any;
  formatPrice: (amount: number, currency?: string) => string;
  leaderboardType: string;
  setLeaderboardType: (type: string) => void;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  userProfile,
  dashboardStats,
  formatPrice,
  leaderboardType,
  setLeaderboardType
}) => {
  return (
    <div className="space-y-6">
      {/* Trending Styles Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trending Styles</h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <TrendingStylesCarousel />
      </section>

      {/* Affiliate Hub */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Affiliate Hub</CardTitle>
                <Badge variant="secondary" className="text-xs">Earn</Badge>
              </div>
              <ChevronDown className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Share your favorite products and earn commissions
              </p>
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            <AffiliateHub />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* My Closets Placeholder */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Closets</h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium">Closet {i}</h3>
                <p className="text-sm text-muted-foreground">{Math.floor(Math.random() * 50) + 10} items</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Fashion Leaderboards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fashion Leaderboards</h2>
          <div className="flex gap-2">
            <Button
              variant={leaderboardType === 'global' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLeaderboardType('global')}
            >
              <Globe className="h-4 w-4 mr-1" />
              Global
            </Button>
            <Button
              variant={leaderboardType === 'country' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLeaderboardType('country')}
            >
              <MapPin className="h-4 w-4 mr-1" />
              {userProfile?.country || 'Country'}
            </Button>
          </div>
        </div>
        <Leaderboard type={leaderboardType as 'global' | 'country'} />
      </section>
    </div>
  );
};

export default DashboardSection;