import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import ShopperNavigation from '@/components/ShopperNavigation';
import { BackButton } from '@/components/ui/back-button';
import { useAuth } from '@/contexts/AuthContext';
import { useFollows } from '@/hooks/useFollows';
import { useBlockedUsers, useBlockUser, useUnblockUser } from '@/hooks/useBlockedUsers';
import { SmartImage } from '@/components/SmartImage';
import { PostProductCircles } from '@/components/PostProductCircles';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MapPin, 
  MessageSquare,
  Globe, 
  MoreHorizontal,
  ShieldBan,
  ShieldCheck,
  ImageIcon,
  Shirt,
} from 'lucide-react';

interface UserProfileData {
  id: string;
  name: string | null;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  website: string | null;
  username: string | null;
}

const UserProfile: React.FC = () => {
  const { userId: id } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const { isFollowing, toggleFollow, isToggling } = useFollows();

  const isOwnProfile = user?.id === id;

  // Block user hooks
  const { blockedIds } = useBlockedUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const isBlocked = id ? blockedIds.includes(id) : false;

  // Fetch profile - try public_profiles first, fallback to users_public
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-view', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID required');
      
      const { data } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (data) return data as UserProfileData;

      // Fallback to users_public view
      const { data: fallback, error } = await supabase
        .from('users_public')
        .select('id, name, username, avatar_url')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { ...fallback, country: null, bio: null, website: null } as UserProfileData;
    },
    enabled: !!id
  });

  // Fetch posts
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-profile-posts', id, isOwnProfile],
    queryFn: async () => {
      if (!id) return [];
      
      let query = supabase
        .from('posts')
        .select(`id, content, created_at, visibility, post_images(id, image_url, sort_order), post_products(external_image_url, external_title, product_id, external_url, product:products(image_url, title))`)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (!isOwnProfile) {
        query = query.eq('visibility', 'public_explore');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Fetch outfits
  const { data: userOutfits, isLoading: outfitsLoading } = useQuery({
    queryKey: ['user-profile-outfits', id, isOwnProfile],
    queryFn: async () => {
      if (!id) return [];

      let query = supabase
        .from('fits')
        .select('id, title, name, image_preview, render_path, created_at, is_public')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (!isOwnProfile) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!id
  });

  // Fetch public items
  const { data: userItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['user-profile-items', id, isOwnProfile],
    queryFn: async () => {
      if (!id) return [];

      let query = supabase
        .from('wardrobe_items')
        .select('id, name, category, image_url, image_bg_removed_url, brand')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (!isOwnProfile) {
        query = query.eq('public_reuse_permitted', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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
            <p className="text-muted-foreground">Loading profile...</p>
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
            <p className="text-muted-foreground">User not found</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = userProfile.name || userProfile.username || 'Anonymous User';

  return (
    <div className="min-h-screen dashboard-bg">
      <SEOHead 
        title={`${displayName} - Profile`}
        description={`View ${displayName}'s fashion profile, posts, outfits, and items`}
      />
      
      <div className="container mx-auto max-w-4xl p-4">
        <ShopperNavigation />
        
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Profile Header */}
        <GlassPanel variant="premium" className="p-6 mb-6">
          <div className="flex items-start gap-5">
            <Avatar className="w-20 h-20 border-2 border-border/50">
              <AvatarImage src={userProfile.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {displayName[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-serif font-bold text-foreground truncate">{displayName}</h1>
              
              {userProfile.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{userProfile.bio}</p>
              )}

              {userProfile.country && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{userProfile.country}</span>
                </div>
              )}

              <div className="flex gap-2 mt-3 flex-wrap">
                {/* Follow Button */}
                {!isOwnProfile && user && !isBlocked && (
                  <Button
                    variant={isFollowing(id!) ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-full text-xs h-8 px-4"
                    onClick={() => toggleFollow(id!)}
                    disabled={isToggling}
                  >
                    {isFollowing(id!) ? 'Following' : 'Follow'}
                  </Button>
                )}

                {userProfile.website && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-full text-xs h-8 px-3 gap-1"
                    onClick={() => window.open(userProfile.website!, '_blank')}
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </Button>
                )}

                {/* Block/Unblock Menu */}
                {!isOwnProfile && user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isBlocked ? (
                        <DropdownMenuItem onClick={() => id && unblockUser.mutate(id)} disabled={unblockUser.isPending}>
                          <ShieldCheck className="h-4 w-4 mr-2" /> Unblock User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => id && blockUser.mutate(id)} disabled={blockUser.isPending} className="text-destructive">
                          <ShieldBan className="h-4 w-4 mr-2" /> Block User
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
            <Button variant="outline" size="sm" onClick={() => id && unblockUser.mutate(id)} disabled={unblockUser.isPending}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Unblock
            </Button>
          </div>
        )}

        {/* Content Tabs */}
        {!isBlocked && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
              <TabsTrigger value="outfits" className="flex-1">Outfits</TabsTrigger>
              <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="mt-0">
              {postsLoading ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : !userPosts?.length ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {userPosts.map((post: any) => {
                    const img = post.post_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))?.[0]?.image_url;
                    return (
                      <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group relative">
                        {img ? (
                          <SmartImage src={img} alt={post.content || 'Post'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        {post.content && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white line-clamp-2">{post.content}</p>
                          </div>
                        )}
                        <PostProductCircles
                          products={(post.post_products || []).map((pp: any) => ({
                            image_url: pp.external_image_url || pp.product?.image_url,
                            title: pp.external_title || pp.product?.title,
                            product_id: pp.product_id,
                            external_url: pp.external_url,
                          }))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Outfits Tab */}
            <TabsContent value="outfits" className="mt-0">
              {outfitsLoading ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : !userOutfits?.length ? (
                <div className="text-center py-12">
                  <Shirt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No outfits yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {userOutfits.map((outfit: any) => {
                    const img = outfit.render_path || outfit.image_preview;
                    return (
                      <div key={outfit.id} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group relative" onClick={() => navigate('/dress-me/community')}>
                        {img ? (
                          <SmartImage src={img} alt={outfit.title || outfit.name || 'Outfit'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Shirt className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white line-clamp-1">{outfit.title || outfit.name || ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-0">
              {itemsLoading ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : !userItems?.length ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No public items yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {userItems.map((item: any) => {
                    const img = item.image_bg_removed_url || item.image_url;
                    return (
                      <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group relative" onClick={() => navigate('/dress-me/community')}>
                        <SmartImage src={img} alt={item.name || item.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white line-clamp-1">{item.name || item.category}</p>
                          {item.brand && <p className="text-[8px] text-white/70">{item.brand}</p>}
                        </div>
                      </div>
                    );
                  })}
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
