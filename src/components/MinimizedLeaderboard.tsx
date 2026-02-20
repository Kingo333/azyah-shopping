import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES } from '@/lib/countries';
import { Trophy, Medal, Star, Users, TrendingUp, Crown, ChevronDown, ChevronUp } from 'lucide-react';
interface LeaderboardUser {
  id: string;
  name: string;
  avatar_url: string;
  country: string;
  score: number;
  rank: number;
  stats: {
    likes_given: number;
    posts_created: number;
  };
}
interface MinimizedLeaderboardProps {
  type?: 'global' | 'country';
  country?: string;
  showTitle?: boolean;
}
const MinimizedLeaderboard: React.FC<MinimizedLeaderboardProps> = ({
  type = 'global',
  country,
  showTitle = true
}) => {
  const {
    user
  } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [selectedCountry, setSelectedCountry] = useState<string>(country || '');
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    loadLeaderboard();
  }, [activeTab, selectedCountry, type]);
  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);

      // Calculate date range based on activeTab
      const now = new Date();
      let dateFilter: Date | null = null;
      if (activeTab === 'weekly') {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (activeTab === 'monthly') {
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get user stats — query users table directly to filter by visibility preference
      let userQuery = supabase
        .from('users')
        .select('id, name, username, avatar_url, country, preferences')
        .or('preferences->visible_on_globe.is.null,preferences->visible_on_globe.eq.true');
      if (type === 'country' && selectedCountry) {
        userQuery = userQuery.eq('country', selectedCountry);
      }
      const {
        data: users,
        error: usersError
      } = await userQuery;
      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      // Calculate scores for each user
      const scoredUsers: LeaderboardUser[] = [];
      const processedUserIds = new Set<string>();
      for (const user of users || []) {
        // Skip if we've already processed this user (prevent duplicates)
        if (processedUserIds.has(user.id)) {
          continue;
        }
        processedUserIds.add(user.id);

        // Get post likes given by this user
        const {
          data: postLikes
        } = await supabase.from('post_likes').select('id').eq('user_id', user.id);

        // Get posts created by this user
        const {
          data: posts
        } = await supabase.from('posts').select('id').eq('user_id', user.id);

        // Get wishlist items saved by this user
        const {
          data: wishlistItems
        } = await supabase.from('wishlist_items').select('id').eq('wishlist_id', (await supabase.from('wishlists').select('id').eq('user_id', user.id)).data?.[0]?.id);

        const likesCount = postLikes?.length || 0;
        const postsCount = posts?.length || 0;
        const savedItemsCount = wishlistItems?.length || 0;

        // Updated scoring: posts (10pts), likes (3pts), wishlist (1pt)
        const score = postsCount * 10 + likesCount * 3 + savedItemsCount * 1;
        scoredUsers.push({
          id: user.id,
          name: user.name || 'Anonymous',
          avatar_url: user.avatar_url || '',
          country: user.country || '',
          score,
          rank: 0,
          // Will be set below
          stats: {
            likes_given: likesCount,
            posts_created: postsCount
          }
        });
      }

      // Sort by score and assign ranks
      scoredUsers.sort((a, b) => b.score - a.score);
      scoredUsers.forEach((user, index) => {
        user.rank = index + 1;
      });

      // Get top 50 for display
      const topUsers = scoredUsers.slice(0, 50);
      setLeaders(topUsers);

      // Find current user's rank
      if (user) {
        const currentUserRank = scoredUsers.findIndex(u => u.id === user.id);
        setUserRank(currentUserRank >= 0 ? currentUserRank + 1 : null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Medal className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="font-bold text-muted-foreground text-sm">#{rank}</span>;
    }
  };
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-[hsl(var(--azyah-maroon))]';
    if (rank === 2) return 'bg-gray-400';
    if (rank === 3) return 'bg-amber-600';
    if (rank <= 10) return 'bg-[hsl(var(--azyah-maroon))]/80';
    return 'bg-gray-500';
  };
  if (!user) return null;
  const topThree = leaders.slice(0, 3);
  return <Card className="w-full">
      <Collapsible open={!isCollapsed} onOpenChange={open => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Fashion Leaderboard
              </div>
              <div className="flex items-center gap-2">
                {userRank && <Badge variant="secondary" className="hidden sm:flex">
                    Your Rank: #{userRank}
                  </Badge>}
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {type === 'global' ? 'Compete with style enthusiasts worldwide' : 'Top performers in your country'}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Tabs value={activeTab} onValueChange={value => setActiveTab(value as any)} className="w-full sm:w-auto">
                      <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                        <TabsTrigger value="weekly" className="text-xs sm:text-sm">Week</TabsTrigger>
                        <TabsTrigger value="monthly" className="text-xs sm:text-sm">Month</TabsTrigger>
                        <TabsTrigger value="alltime" className="text-xs sm:text-sm">All</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {type === 'country' && <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(country => <SelectItem key={country.code} value={country.name}>
                              {country.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>}
                  </div>
                </div>
              </div>

            {isLoading ? <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-muted rounded-xl h-14" />)}
              </div> : <>
                {/* User's Current Rank */}
                {userRank && <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full text-white ${getRankBadgeColor(userRank)}`}>
                        {getRankIcon(userRank)}
                      </div>
                      <div>
                        <p className="font-semibold">Your Current Rank</p>
                        <p className="text-sm text-muted-foreground">
                          #{userRank} {type === 'global' ? 'globally' : `in ${selectedCountry}`}
                        </p>
                      </div>
                    </div>
                  </div>}

                {/* Top 3 + More Leaders Compact View */}
                {topThree.length > 0 && <div className="space-y-3">
                    <h4 className="font-semibold text-muted-foreground">Top Performers</h4>
                    {leaders.slice(0, 5).map((leader, index) => <div key={leader.id} className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${leader.id === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                        <div className="flex items-center justify-center w-10">
                          {getRankIcon(leader.rank)}
                        </div>

                        <Avatar className="w-10 h-10">
                          <AvatarImage src={leader.avatar_url} />
                          <AvatarFallback>{leader.name[0]}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{leader.name}</p>
                            {leader.id === user?.id && <Badge variant="secondary" className="text-xs">You</Badge>}
                          </div>
                          {leader.country && <p className="text-sm text-muted-foreground">{leader.country}</p>}
                        </div>

                        <div className="text-right">
                          <p className="font-medium">{leader.score} pts</p>
                          
                        </div>
                      </div>)}
                    
                    {leaders.length > 5 && <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground">
                          +{leaders.length - 5} more competitors
                        </p>
                      </div>}
                  </div>}

                {leaders.length === 0 && <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <h4 className="font-semibold mb-2">No rankings yet</h4>
                    <p className="text-sm">Be the first to engage and climb the leaderboard!</p>
                  </div>}
              </>}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>;
};
export default MinimizedLeaderboard;