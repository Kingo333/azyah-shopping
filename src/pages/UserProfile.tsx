import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import ShopperNavigation from '@/components/ShopperNavigation';
import { BackButton } from '@/components/ui/back-button';
import { useAuth } from '@/contexts/AuthContext';
import { useHasPublicItems } from '@/hooks/useUserPublicWardrobeItems';
import { useBlockedUsers, useBlockUser, useUnblockUser } from '@/hooks/useBlockedUsers';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  User, 
  MapPin, 
  Instagram, 
  Twitter, 
  Globe, 
  MessageSquare,
  Users,
  Archive,
  ArrowRight,
  Palette,
  MoreHorizontal,
  ShieldBan,
  ShieldCheck
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar_url: string;
  country: string;
  bio: string;
  website: string;
  created_at: string;
}

interface UserPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  images: Array<{
    id: string;
    image_url: string;
    sort_order: number;
  }>;
  likes_count: number;
}

interface UserCloset {
  id: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
  items_count: number;
  items: Array<{
    id: string;
    product: {
      id: string;
      title: string;
      media_urls: any;
      price_cents: number;
      currency: string;
    };
  }>;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  
  // Check if this user has public items (for "Style Me" button)
  const { data: hasPublicItems } = useHasPublicItems(id || null);
  const isOwnProfile = user?.id === id;

  // Redirect to own profile page
  useEffect(() => {
    if (isOwnProfile) {
      navigate('/profile', { replace: true });
    }
  }, [isOwnProfile, navigate]);

  // Block user hooks
  const { blockedIds } = useBlockedUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const isBlocked = id ? blockedIds.includes(id) : false;

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!id
  });

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          post_images (
            id,
            image_url,
            sort_order
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get likes count for each post
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact' })
            .eq('post_id', post.id);

          return {
            ...post,
            images: post.post_images || [],
            likes_count: likesCount || 0
          };
        })
      );

      return enrichedPosts as UserPost[];
    },
    enabled: !!id
  });


  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl p-4">
          <ShopperNavigation />
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl p-4">
          <ShopperNavigation />
          <div className="text-center py-12">
            <p>User not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      <SEOHead 
        title={`${userProfile.name || 'Anonymous User'} - User Profile`}
        description={`View ${userProfile.name || 'Anonymous User'}'s fashion profile, posts, and public closets`}
      />
      
      <div className="container mx-auto max-w-4xl p-4">
        <ShopperNavigation />
        
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Profile Header */}
        <GlassPanel variant="premium" className="p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Avatar className="w-32 h-32 mx-auto md:mx-0 border-4 border-white/20">
              <AvatarImage src={userProfile.avatar_url} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/10 to-accent/10">
                {userProfile.name?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-cormorant font-bold mb-3">
                {userProfile.name || 'Anonymous User'}
              </h1>
              
              {userProfile.bio && (
                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">{userProfile.bio}</p>
              )}

              <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-6">
                {userProfile.country && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{userProfile.country}</span>
                  </div>
                )}
              </div>

              {/* Social Links & Actions */}
              <div className="flex gap-4 justify-center md:justify-start flex-wrap">
                {/* Style Me Button - Only show on other user's profiles who have public items */}
                {!isOwnProfile && hasPublicItems && !isBlocked && (
                  <Button 
                    onClick={() => navigate(`/dress-me/canvas?mode=suggest&targetId=${id}`)}
                    className="hover:scale-105 transition-transform"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Style Me
                  </Button>
                )}
                
                {userProfile.website && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(userProfile.website, '_blank')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </Button>
                )}

                {/* Block/Unblock Menu - only on other profiles */}
                {!isOwnProfile && user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isBlocked ? (
                        <DropdownMenuItem
                          onClick={() => id && unblockUser.mutate(id)}
                          disabled={unblockUser.isPending}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Unblock User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => id && blockUser.mutate(id)}
                          disabled={blockUser.isPending}
                          className="text-destructive"
                        >
                          <ShieldBan className="h-4 w-4 mr-2" />
                          Block User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Blocked State */}
        {isBlocked && (
          <div className="text-center py-12 rounded-lg border bg-card">
            <ShieldBan className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-medium mb-2">You have blocked this user</p>
            <p className="text-sm text-muted-foreground mb-4">Their content is hidden from your view.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => id && unblockUser.mutate(id)}
              disabled={unblockUser.isPending}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Unblock
            </Button>
          </div>
        )}

        {/* Content Tabs - Only show when not blocked */}
        {!isBlocked && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full glass-panel mb-8">
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6 mt-6">
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Loading posts...</p>
              </div>
            ) : userPosts?.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userPosts?.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    {post.images.length > 0 && (
                      <div className="aspect-square relative">
                        <img
                          src={post.images[0].image_url}
                          alt="Post image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      {post.content && (
                        <p className="text-sm mb-3">{post.content}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>{post.likes_count} likes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
};

export default UserProfile;