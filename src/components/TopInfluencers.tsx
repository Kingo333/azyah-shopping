import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Archive, MessageSquare, ArrowRight, Crown, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopInfluencer {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  country: string;
  bio: string;
  engagement_score: number;
  stats: {
    posts_count: number;
    likes_given: number;
    likes_received: number;
    followers_count: number;
  };
}

interface TopInfluencersProps {
  limit?: number;
  showMore?: boolean;
}

const TopInfluencers: React.FC<TopInfluencersProps> = ({ limit = 6, showMore = true }) => {
  const navigate = useNavigate();

  const { data: topInfluencers, isLoading } = useQuery({
    queryKey: ['top-influencers', limit],
    queryFn: async () => {
      // Get users with their activity data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          avatar_url,
          country,
          bio,
          created_at
        `)
        .limit(50); // Get more users to calculate engagement

      if (usersError) throw usersError;

      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          // Get posts count
          const { count: postsCount } = await supabase
            .from('posts')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);

          // Get likes given
          const { count: likesGiven } = await supabase
            .from('likes')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);

          // Get likes received on posts
          const { count: likesReceived } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact' })
            .in('post_id', 
              (await supabase
                .from('posts')
                .select('id')
                .eq('user_id', user.id)
              ).data?.map(p => p.id) || []
            );

          // Get followers count
          const { count: followersCount } = await supabase
            .from('follows')
            .select('id', { count: 'exact' })
            .eq('following_id', user.id);

          // Calculate engagement score
          const stats = {
            posts_count: postsCount || 0,
            likes_given: likesGiven || 0,
            likes_received: likesReceived || 0,
            followers_count: followersCount || 0,
          };

          const engagement_score = (
            stats.posts_count * 10 +
            stats.likes_given * 1 +
            stats.likes_received * 5 +
            stats.followers_count * 3
          );

          return {
            ...user,
            engagement_score,
            stats
          } as TopInfluencer;
        })
      );

      return enrichedUsers
        .filter(user => user.engagement_score > 0)
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, limit);
    }
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Medal className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRankBadgeVariant = (index: number) => {
    if (index < 3) return "default";
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topInfluencers?.map((influencer, index) => (
          <Card 
            key={influencer.id}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/profile/${influencer.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={getRankBadgeVariant(index)}>
                  {getRankIcon(index)}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {influencer.country}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={influencer.avatar_url} />
                  <AvatarFallback>{influencer.name?.[0] || influencer.email[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {influencer.name || influencer.email.split('@')[0]}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {influencer.bio || 'Fashion enthusiast'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">
                    {influencer.stats.posts_count} posts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">
                    {influencer.stats.followers_count} followers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  <span className="text-xs text-primary font-medium">
                    View Profile
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showMore && topInfluencers && topInfluencers.length > 0 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/top-influencers')}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            View All Top Influencers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TopInfluencers;