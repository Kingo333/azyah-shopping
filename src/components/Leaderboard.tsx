import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRIES } from '@/lib/countries';
import { Trophy, Medal, Star, Users, TrendingUp, Crown } from 'lucide-react';

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
    closet_items: number;
    closets_created: number;
  };
}

interface LeaderboardProps {
  type?: 'global' | 'country';
  country?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ type = 'global', country }) => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [selectedCountry, setSelectedCountry] = useState<string>(country || '');

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

      // Get user stats with proper closet item counting using public profiles
      let userQuery = supabase.from('public_profiles').select('*');
      
      if (type === 'country' && selectedCountry) {
        userQuery = userQuery.eq('country', selectedCountry);
      }

      const { data: users, error: usersError } = await userQuery;

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
        const { data: postLikes } = await supabase
          .from('post_likes')
          .select('id')
          .eq('user_id', user.id);

        // Get posts created by this user
        const { data: posts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id);

        // Get wishlist items saved by this user
        const { data: wishlistItems } = await supabase
          .from('wishlist_items')
          .select('id')
          .eq('wishlist_id', (await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', user.id)
          ).data?.[0]?.id);

        // Get closets created by this user
        const { data: closets } = await supabase
          .from('closets')
          .select('id')
          .eq('user_id', user.id);

        // Get ALL closet items for this user (count products in their closets)
        const { data: closetItems } = await supabase
          .from('closet_items')
          .select('id')
          .in('closet_id', (closets || []).map(c => c.id));

        // Get look votes received by this user
        const { data: lookVotes } = await supabase
          .from('look_votes')
          .select('value')
          .in('look_id', (await supabase
            .from('looks')
            .select('id')
            .eq('user_id', user.id)
          ).data?.map(l => l.id) || []);

        const likesCount = postLikes?.length || 0;
        const postsCount = posts?.length || 0;
        const savedItemsCount = wishlistItems?.length || 0;
        const closetsCount = closets?.length || 0;
        const closetItemsCount = closetItems?.length || 0;
        const lookVotesCount = lookVotes?.reduce((sum, vote) => sum + vote.value, 0) || 0;

        // Updated scoring: posts (10pts), closet items (2pts each), likes (3pts), wishlist (1pt), closets (5pts), look votes (5pts each)
        const score = (postsCount * 10) + (closetItemsCount * 2) + (likesCount * 3) + (savedItemsCount * 1) + (closetsCount * 5) + (lookVotesCount * 5);

        scoredUsers.push({
          id: user.id,
          name: user.name || 'Anonymous',
          avatar_url: user.avatar_url || '',
          country: user.country || '',
          score,
          rank: 0, // Will be set below
          stats: {
            likes_given: likesCount,
            posts_created: postsCount,
            closet_items: closetItemsCount,
            closets_created: closetsCount
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
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600';
    if (rank <= 10) return 'bg-gradient-to-r from-purple-400 to-purple-600';
    return 'bg-gradient-to-r from-blue-400 to-blue-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {type === 'country' && (
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.name}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* User's Current Rank */}
      {userRank && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* 2nd Place */}
              <div className="order-1">
                <div className="relative">
                  <Avatar className="w-16 h-16 mx-auto mb-2 ring-4 ring-gray-300">
                    <AvatarImage src={leaders[1]?.avatar_url} />
                    <AvatarFallback>{leaders[1]?.name[0]}</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-400">
                    2nd
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{leaders[1]?.name}</p>
              </div>

              {/* 1st Place */}
              <div className="order-2">
                <div className="relative">
                  <Avatar className="w-20 h-20 mx-auto mb-2 ring-4 ring-yellow-400">
                    <AvatarImage src={leaders[0]?.avatar_url} />
                    <AvatarFallback>{leaders[0]?.name[0]}</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-500">
                    1st
                  </Badge>
                  <Crown className="absolute -top-6 left-1/2 transform -translate-x-1/2 h-6 w-6 text-yellow-500" />
                </div>
                <p className="font-bold">{leaders[0]?.name}</p>
              </div>

              {/* 3rd Place */}
              <div className="order-3">
                <div className="relative">
                  <Avatar className="w-16 h-16 mx-auto mb-2 ring-4 ring-amber-500">
                    <AvatarImage src={leaders[2]?.avatar_url} />
                    <AvatarFallback>{leaders[2]?.name[0]}</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-amber-500">
                    3rd
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{leaders[2]?.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {leaders.map((leader) => (
              <div
                key={leader.id}
                className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                  leader.id === user?.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(leader.rank)}
                </div>

                <Avatar>
                  <AvatarImage src={leader.avatar_url} />
                  <AvatarFallback>{leader.name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{leader.name}</p>
                    {leader.id === user?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  {leader.country && (
                    <p className="text-sm text-muted-foreground">{leader.country}</p>
                  )}
                </div>

                <div className="w-8"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {leaders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Rankings Yet</h3>
            <p className="text-muted-foreground">
              Be the first to engage with the community and climb the leaderboard!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leaderboard;